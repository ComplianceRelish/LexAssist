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
    "motty.philip@gmail.com":   {"name": "Motty Philip",  "phone": "9446012324",  "role": "super_admin"},
    "tarunphilip2308@gmail.com": {"name": "Tarun Philip",  "phone": "6282845274",  "role": "admin"},
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
        return jsonify(result)
    except Exception as e:
        logger.error("Analysis error: %s", e)
        return jsonify({"error": "Analysis failed", "details": str(e)}), 500

# ---------------------------------------------------------------------------
# Auth – OTP based (Supabase)
# ---------------------------------------------------------------------------

@app.route("/api/auth/send-otp", methods=["POST"])
def send_otp():
    data = request.json
    email = data.get("email")
    phone = data.get("phone")
    channel = "email" if email else "sms"
    try:
        if email:
            supabase.client.auth.sign_in_with_otp({"email": email})
        elif phone:
            supabase.client.auth.sign_in_with_otp({"phone": phone})
        else:
            return jsonify({"error": "Email or phone required"}), 400
        return jsonify({"message": f"OTP sent via {channel}"}), 200
    except Exception as e:
        logger.error("Send OTP error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    data = request.json
    email = data.get("email")
    phone = data.get("phone")
    token = data.get("token")
    type_ = data.get("type", "email")
    try:
        if email:
            result = supabase.client.auth.verify_otp({"email": email, "token": token, "type": type_})
        elif phone:
            result = supabase.client.auth.verify_otp({"phone": phone, "token": token, "type": type_})
        else:
            return jsonify({"error": "Email or phone required"}), 400

        session = getattr(result, "session", None)
        if not session:
            return jsonify({"error": "OTP verification failed"}), 401

        user_data = getattr(result, "user", None)
        user_email = (user_data.email if user_data else email or "").lower()
        admin_info = _is_admin(user_email)

        body = {
            "message": "OTP verified",
            "user": user_data.model_dump() if user_data else None,
            "is_admin": admin_info is not None,
            "role": admin_info["role"] if admin_info else "user",
        }
        resp = make_response(jsonify(body))
        resp.set_cookie("sb-access-token", session.access_token, httponly=True, samesite="Lax")
        resp.set_cookie("sb-refresh-token", session.refresh_token, httponly=True, samesite="Lax")
        return resp
    except Exception as e:
        logger.error("Verify OTP error: %s", e)
        return jsonify({"error": str(e)}), 500


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
