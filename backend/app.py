from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
import jwt

from backend.config import Config
from backend.models.legal_brief_analyzer import LegalBriefAnalyzer
from backend.services.inlegalbert_processor import InLegalBERTProcessor
from backend.services.indian_kanoon import IndianKanoonAPI
from backend.services.supabase_client import SupabaseClient
from backend.utils.logger import setup_logger

# ---------------------------------------------------------------------------
# Admin configuration (no SaaS – hard-coded admin roster)
# ---------------------------------------------------------------------------
ADMIN_USERS = {
    "motty.philip@gmail.com":    {"name": "Motty Philip",  "phone": "9446012324",  "role": "super_admin", "default_password": "LexAdmin@2026!"},
    "tarunphilip2308@gmail.com": {"name": "Tarun Philip",  "phone": "6282845274",  "role": "admin",       "default_password": "LexAdmin@2026!"},
}

import os

# ---------------------------------------------------------------------------
# App bootstrap
# ---------------------------------------------------------------------------
app = Flask(__name__)

ALLOWED_ORIGINS = [
    "https://lex-assist.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
# Allow any Vercel preview deploys
extra = os.getenv("CORS_ORIGINS", "")
if extra:
    ALLOWED_ORIGINS.extend([o.strip() for o in extra.split(",") if o.strip()])

CORS(app, supports_credentials=True, origins=ALLOWED_ORIGINS)
logger = setup_logger()

indian_kanoon = IndianKanoonAPI()
inlegalbert = InLegalBERTProcessor()
supabase = SupabaseClient()
analyzer = LegalBriefAnalyzer(indian_kanoon=indian_kanoon, inlegalbert=inlegalbert)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_current_user():
    """Return (user_id, email) from the session cookie, or (None, None)."""
    access_token = request.cookies.get("sb-access-token")
    if not access_token:
        return None, None
    try:
        payload = jwt.decode(access_token, options={"verify_signature": False})
        return payload.get("sub"), payload.get("email")
    except Exception:
        return None, None


def _is_admin(email: str | None) -> dict | None:
    """Return the admin entry if *email* belongs to an admin, else None."""
    if not email:
        return None
    return ADMIN_USERS.get(email.lower())

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "services": {
            "supabase": "connected" if supabase.client else "disconnected",
            "indian_kanoon": "configured" if indian_kanoon.api_key else "missing_key",
            "inlegalbert": "loaded" if inlegalbert._initialized else "fallback_mode",
        }
    }), 200

# ---------------------------------------------------------------------------
# Core – Legal brief analysis
# ---------------------------------------------------------------------------

@app.route("/api/analyze-brief", methods=["POST"])
def analyze_brief():
    data = request.json
    if not data:
        return jsonify({"error": "Request body required"}), 400
    text = data.get("text", "")
    if not text.strip():
        return jsonify({"error": "Brief text cannot be empty"}), 400
    try:
        result = analyzer.analyze(text)

        # Log activity for the authenticated user
        user_id, _ = _get_current_user()
        if user_id and supabase.client:
            try:
                snippet = text[:200].replace("\n", " ")
                supabase.client.table("activity_log").insert({
                    "user_id": user_id,
                    "action": "brief_analyzed",
                    "title": "Brief Analysis",
                    "detail": snippet,
                }).execute()
            except Exception as log_err:
                logger.warning("Activity log write failed: %s", log_err)

        return jsonify(result)
    except Exception as e:
        logger.error("Analysis error: %s", e)
        return jsonify({"error": "Analysis failed", "details": str(e)}), 500

# ---------------------------------------------------------------------------
# Auth – Email + Password (Supabase)
# ---------------------------------------------------------------------------

@app.route("/api/auth/login", methods=["POST"])
def login():
    """Authenticate with email + password.  Sets session cookies."""
    data = request.json or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    try:
        result = supabase.client.auth.sign_in_with_password(
            {"email": email, "password": password}
        )
        session = getattr(result, "session", None)
        if not session:
            return jsonify({"error": "Invalid credentials"}), 401

        user_data = getattr(result, "user", None)
        user_email = (user_data.email if user_data else email).lower()
        admin_info = _is_admin(user_email)

        body = {
            "message": "Login successful",
            "user": user_data.model_dump() if user_data else None,
            "is_admin": admin_info is not None,
            "role": admin_info["role"] if admin_info else "user",
        }
        resp = make_response(jsonify(body))
        resp.set_cookie("sb-access-token", session.access_token,
                        httponly=True, samesite="None", secure=True)
        resp.set_cookie("sb-refresh-token", session.refresh_token,
                        httponly=True, samesite="None", secure=True)
        return resp
    except Exception as e:
        logger.error("Login error: %s", e)
        msg = str(e)
        if "Invalid login" in msg or "invalid" in msg.lower():
            return jsonify({"error": "Invalid email or password"}), 401
        return jsonify({"error": msg}), 500


@app.route("/api/auth/setup-admins", methods=["POST"])
def setup_admins():
    """One-time endpoint: create admin users in Supabase Auth.
    Body: {"secret": "<SETUP_SECRET>"}
    Only works when SETUP_SECRET env var is set and matches.
    """
    setup_secret = os.getenv("SETUP_SECRET", "")
    if not setup_secret:
        return jsonify({"error": "Setup disabled (SETUP_SECRET not configured)"}), 403

    body = request.json or {}
    if body.get("secret") != setup_secret:
        return jsonify({"error": "Invalid setup secret"}), 403

    results = []
    for email_key, info in ADMIN_USERS.items():
        try:
            # Create user with pre-confirmed email
            user = supabase.client.auth.admin.create_user({
                "email": email_key,
                "password": info.get("default_password", "LexAssist@2026"),
                "email_confirm": True,
                "user_metadata": {"full_name": info["name"]},
            })
            results.append({"email": email_key, "status": "created", "id": user.user.id if user.user else None})
        except Exception as e:
            err_msg = str(e)
            if "already" in err_msg.lower():
                results.append({"email": email_key, "status": "already_exists"})
            else:
                results.append({"email": email_key, "status": "error", "detail": err_msg})
    return jsonify({"results": results}), 200


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    resp = make_response(jsonify({"message": "Logged out"}))
    resp.set_cookie("sb-access-token", "", expires=0)
    resp.set_cookie("sb-refresh-token", "", expires=0)
    return resp

# ---------------------------------------------------------------------------
# User profile
# ---------------------------------------------------------------------------

@app.route("/api/user/profile", methods=["POST"])
def update_profile():
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        data = request.json
        profile_data = {
            "user_id": user_id,
            "full_name": data.get("fullName"),
            "address": data.get("address"),
            "age": data.get("age"),
            "email": data.get("email"),
            "phone": data.get("phone"),
        }
        supabase.client.table("profiles").upsert(profile_data).execute()
        return jsonify({"message": "Profile updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/user/profile", methods=["GET"])
def get_profile():
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        response = supabase.client.table("profiles").select("*").eq("user_id", user_id).single().execute()
        return jsonify({"profile": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# User stats & activity history  (real data from activity_log)
# ---------------------------------------------------------------------------

@app.route("/api/user/stats", methods=["GET"])
def user_stats():
    """Aggregate usage counts from the activity_log table."""
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        rows = (
            supabase.client.table("activity_log")
            .select("action")
            .eq("user_id", user_id)
            .execute()
        )
        actions = [r["action"] for r in (rows.data or [])]
        return jsonify({
            "briefsAnalyzed": actions.count("brief_analyzed"),
            "caseFilesGenerated": actions.count("case_file_generated"),
            "documentsDownloaded": actions.count("document_downloaded"),
            "searchesPerformed": actions.count("search_performed"),
        }), 200
    except Exception as e:
        logger.error("Stats error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/user/history", methods=["GET"])
def user_history():
    """Return the most recent activity entries (paginated)."""
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        limit = min(int(request.args.get("limit", 20)), 100)
        offset = int(request.args.get("offset", 0))
        action_filter = request.args.get("action")  # optional filter

        query = (
            supabase.client.table("activity_log")
            .select("id, action, title, detail, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        if action_filter:
            query = query.eq("action", action_filter)

        rows = query.execute()
        return jsonify({"history": rows.data or []}), 200
    except Exception as e:
        logger.error("History error: %s", e)
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# Admin – lightweight identity check (no SaaS tiers)
# ---------------------------------------------------------------------------

@app.route("/api/admin/me", methods=["GET"])
def admin_me():
    """Return the current user's admin status (if any)."""
    user_id, email = _get_current_user()
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    admin_info = _is_admin(email)
    return jsonify({
        "user_id": user_id,
        "email": email,
        "is_admin": admin_info is not None,
        "role": admin_info["role"] if admin_info else "user",
        "name": admin_info["name"] if admin_info else None,
    }), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
