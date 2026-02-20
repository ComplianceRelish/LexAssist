from flask import Flask, jsonify, request, make_response, Response, stream_with_context
from flask_cors import CORS
import jwt
import json

from backend.config import Config
from backend.models.legal_brief_analyzer import LegalBriefAnalyzer
from backend.services.inlegalbert_processor import InLegalBERTProcessor
from backend.services.indian_kanoon import IndianKanoonAPI
from backend.services.supabase_client import SupabaseClient
from backend.services.claude_client import ClaudeClient
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
claude = ClaudeClient()

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
            "claude_ai": "ready" if claude.is_available else "unavailable",
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
# Auth – Name + Phone Login
# ---------------------------------------------------------------------------

@app.route("/api/auth/login", methods=["POST"])
def login():
    """Authenticate with full name + mobile number.
    Looks up the user in profiles, then signs in via Supabase Auth
    using their email + phone-as-password.
    """
    data = request.json or {}
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    if not name or not phone:
        return jsonify({"error": "Name and mobile number are required"}), 400

    try:
        # Look up user in profiles by name (case-insensitive) + phone
        profiles = (
            supabase.client.table("profiles")
            .select("user_id, email, full_name, role")
            .ilike("full_name", name)
            .eq("phone", phone)
            .execute()
        )
        if not profiles.data or len(profiles.data) == 0:
            return jsonify({"error": "No account found. Check your name and mobile number."}), 401

        profile = profiles.data[0]
        user_email = profile.get("email", "").lower()
        if not user_email:
            return jsonify({"error": "Account has no email configured. Contact administrator."}), 401

        # Sign in via Supabase Auth using email + phone (phone is the password)
        result = supabase.client.auth.sign_in_with_password(
            {"email": user_email, "password": phone}
        )
        session = getattr(result, "session", None)
        if not session:
            return jsonify({"error": "Authentication failed"}), 401

        user_data = getattr(result, "user", None)
        admin_info = _is_admin(user_email)
        role = profile.get("role", "user")

        body = {
            "message": "Login successful",
            "user": user_data.model_dump() if user_data else None,
            "is_admin": role in ("super_admin", "admin"),
            "role": role,
            "full_name": profile.get("full_name", ""),
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
            return jsonify({"error": "Invalid credentials. Contact your administrator."}), 401
        return jsonify({"error": "Login failed. Please try again."}), 500


@app.route("/api/auth/setup-admins", methods=["POST"])
def setup_admins():
    """One-time endpoint: create admin users in Supabase Auth + profiles.
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
            # Create user with phone as password (for Name+Phone login)
            user = supabase.client.auth.admin.create_user({
                "email": email_key,
                "password": info["phone"],
                "phone": info["phone"],
                "email_confirm": True,
                "user_metadata": {"full_name": info["name"]},
            })
            user_id = user.user.id if user.user else None
            results.append({"email": email_key, "status": "created", "id": user_id})

            # Also create their profile row with role
            if user_id:
                try:
                    supabase.client.table("profiles").upsert({
                        "user_id": user_id,
                        "full_name": info["name"],
                        "email": email_key,
                        "phone": info.get("phone"),
                        "role": info["role"],
                    }).execute()
                except Exception as pe:
                    logger.warning("Profile insert for %s failed: %s", email_key, pe)

        except Exception as e:
            err_msg = str(e)
            if "already" in err_msg.lower():
                # User exists — update password to phone and ensure profile
                try:
                    auth_users = supabase.client.auth.admin.list_users()
                    for u in auth_users:
                        if hasattr(u, 'email') and u.email and u.email.lower() == email_key:
                            # Update password + phone for Name+Phone login
                            supabase.client.auth.admin.update_user_by_id(
                                u.id, {"password": info["phone"], "phone": info["phone"]}
                            )
                            supabase.client.table("profiles").upsert({
                                "user_id": u.id,
                                "full_name": info["name"],
                                "email": email_key,
                                "phone": info.get("phone"),
                                "role": info["role"],
                            }).execute()
                            results.append({"email": email_key, "status": "updated_password", "id": u.id})
                            break
                    else:
                        results.append({"email": email_key, "status": "already_exists_no_match"})
                except Exception as ue:
                    results.append({"email": email_key, "status": "already_exists", "update_error": str(ue)})
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
# AI – Claude-powered endpoints
# ---------------------------------------------------------------------------

@app.route("/api/ai/analyze", methods=["POST"])
def ai_analyze():
    """Deep AI analysis of a legal brief using Claude.
    Combines regex extraction with Claude's deep analysis."""
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.json
    if not data:
        return jsonify({"error": "Request body required"}), 400
    text = data.get("text", "")
    if not text.strip():
        return jsonify({"error": "Brief text cannot be empty"}), 400

    if not claude.is_available:
        return jsonify({"error": "AI service unavailable — Claude API key not configured"}), 503

    try:
        # Step 1: Quick regex extraction for context enrichment
        regex_context = analyzer.analyze(text)

        # Step 2: Deep AI analysis with context
        ai_result = claude.analyze_brief(text, context=regex_context)

        # Merge: AI analysis + regex-extracted entities
        merged = {
            "status": "success",
            "ai_analysis": ai_result,
            "entities": regex_context.get("entities", {}),
            "case_type_regex": regex_context.get("case_type", {}),
            "jurisdiction_regex": regex_context.get("jurisdiction", {}),
            "statutes_regex": regex_context.get("statutes", []),
            "precedents_kanoon": regex_context.get("precedents", []),
            "timeline": regex_context.get("timeline", []),
            "nlp_enrichment": regex_context.get("nlp_enrichment", {}),
        }

        # Log activity
        if supabase.client:
            try:
                snippet = text[:200].replace("\n", " ")
                supabase.client.table("activity_log").insert({
                    "user_id": user_id,
                    "action": "ai_brief_analyzed",
                    "title": "AI Brief Analysis",
                    "detail": snippet,
                }).execute()
            except Exception as log_err:
                logger.warning("Activity log write failed: %s", log_err)

        return jsonify(merged)

    except Exception as e:
        logger.error("AI analysis error: %s", e)
        return jsonify({"error": "AI analysis failed", "details": str(e)}), 500


@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    """Streaming AI chat endpoint. Uses Server-Sent Events (SSE).
    Body: { "messages": [...], "brief_context": "optional case text" }
    """
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.json
    if not data:
        return jsonify({"error": "Request body required"}), 400

    messages = data.get("messages", [])
    if not messages:
        return jsonify({"error": "Messages array required"}), 400

    brief_context = data.get("brief_context", None)

    if not claude.is_available:
        return jsonify({"error": "AI service unavailable"}), 503

    def generate():
        try:
            for chunk in claude.chat_stream(messages, brief_context=brief_context):
                # SSE format
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error("Chat streaming error: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'text': str(e)})}\n\n"

    # Log activity
    if supabase.client:
        try:
            last_msg = messages[-1].get("content", "")[:200] if messages else ""
            supabase.client.table("activity_log").insert({
                "user_id": user_id,
                "action": "ai_chat",
                "title": "AI Chat",
                "detail": last_msg,
            }).execute()
        except Exception:
            pass

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


@app.route("/api/ai/draft", methods=["POST"])
def ai_draft():
    """Stream a legal document draft.
    Body: { "doc_type": "Legal Notice", "details": {...}, "brief_context": "..." }
    """
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.json or {}
    doc_type = data.get("doc_type", "")
    details = data.get("details", {})
    brief_context = data.get("brief_context", None)

    if not doc_type:
        return jsonify({"error": "Document type required"}), 400
    if not claude.is_available:
        return jsonify({"error": "AI service unavailable"}), 503

    def generate():
        try:
            for chunk in claude.draft_document(doc_type, details, brief_context):
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error("Document draft error: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'text': str(e)})}\n\n"

    # Log activity
    if supabase.client:
        try:
            supabase.client.table("activity_log").insert({
                "user_id": user_id,
                "action": "document_drafted",
                "title": f"Draft: {doc_type}",
                "detail": json.dumps(details)[:200],
            }).execute()
        except Exception:
            pass

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


# ---------------------------------------------------------------------------
# Admin – User Management CRUD
# ---------------------------------------------------------------------------

def _require_super_admin():
    """Return (user_id, email) if caller is super_admin, else abort with 403 response."""
    user_id, email = _get_current_user()
    if not user_id:
        return None, None, jsonify({"error": "Not authenticated"}), 401
    admin_info = _is_admin(email)
    # Also check profiles table for role
    role = None
    try:
        profile = supabase.client.table("profiles").select("role").eq("user_id", user_id).single().execute()
        if profile.data:
            role = profile.data.get("role")
    except Exception:
        pass
    if (admin_info and admin_info.get("role") == "super_admin") or role == "super_admin":
        return user_id, email, None, None
    return None, None, jsonify({"error": "Super admin access required"}), 403


@app.route("/api/admin/users", methods=["GET"])
def admin_list_users():
    """List all users (profiles + auth metadata). Super-admin only."""
    user_id, email, err_resp, err_code = _require_super_admin()
    if err_resp:
        return err_resp, err_code
    try:
        # Fetch all profiles via service_role (bypasses RLS)
        profiles = supabase.client.table("profiles").select("*").order("created_at", desc=False).execute()
        return jsonify({"users": profiles.data or []}), 200
    except Exception as e:
        logger.error("Admin list users error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/users", methods=["POST"])
def admin_create_user():
    """Create a new user (auth + profile). Super-admin only."""
    user_id, email, err_resp, err_code = _require_super_admin()
    if err_resp:
        return err_resp, err_code
    data = request.json or {}
    new_email = data.get("email", "").strip().lower()
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()
    role = data.get("role", "user")
    if not new_email or not full_name:
        return jsonify({"error": "Email and full name are required"}), 400
    if role not in ("user", "admin", "super_admin"):
        return jsonify({"error": "Invalid role"}), 400
    if not phone:
        return jsonify({"error": "Phone number is required (used for login)"}), 400
    try:
        # Create in Supabase Auth with phone as password (for Name+Phone login)
        auth_user = supabase.client.auth.admin.create_user({
            "email": new_email,
            "password": phone,
            "phone": phone,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name},
        })
        new_user_id = auth_user.user.id if auth_user.user else None
        if not new_user_id:
            return jsonify({"error": "User creation failed in auth"}), 500

        # Create profile row
        supabase.client.table("profiles").upsert({
            "user_id": new_user_id,
            "full_name": full_name,
            "email": new_email,
            "phone": phone or None,
            "role": role,
        }).execute()

        return jsonify({
            "message": f"User {new_email} created successfully",
            "user_id": new_user_id,
            "email": new_email,
            "role": role,
        }), 201
    except Exception as e:
        logger.error("Admin create user error: %s", e)
        err_msg = str(e)
        if "already" in err_msg.lower():
            return jsonify({"error": "A user with this email already exists"}), 409
        return jsonify({"error": err_msg}), 500


@app.route("/api/admin/users/<user_id_param>", methods=["PUT"])
def admin_update_user(user_id_param):
    """Update a user's profile (name, phone, role). Super-admin only."""
    caller_id, caller_email, err_resp, err_code = _require_super_admin()
    if err_resp:
        return err_resp, err_code
    data = request.json or {}
    try:
        update_data = {}
        if "full_name" in data:
            update_data["full_name"] = data["full_name"].strip()
        if "phone" in data:
            update_data["phone"] = data["phone"].strip() or None
        if "role" in data:
            if data["role"] not in ("user", "admin", "super_admin"):
                return jsonify({"error": "Invalid role"}), 400
            update_data["role"] = data["role"]
        if "address" in data:
            update_data["address"] = data["address"].strip() or None
        if "email" in data:
            update_data["email"] = data["email"].strip().lower()
        if not update_data:
            return jsonify({"error": "No fields to update"}), 400

        supabase.client.table("profiles").update(update_data).eq("user_id", user_id_param).execute()

        # If email changed, update in Supabase Auth too
        if "email" in data:
            try:
                supabase.client.auth.admin.update_user_by_id(user_id_param, {
                    "email": data["email"].strip().lower(),
                })
            except Exception as auth_err:
                logger.warning("Auth email update failed: %s", auth_err)

        # If phone changed, update Supabase Auth password + phone field
        if "phone" in data and data["phone"].strip():
            try:
                supabase.client.auth.admin.update_user_by_id(user_id_param, {
                    "password": data["phone"].strip(),
                    "phone": data["phone"].strip(),
                })
            except Exception as auth_err:
                logger.warning("Auth password update failed: %s", auth_err)

        return jsonify({"message": "User updated successfully"}), 200
    except Exception as e:
        logger.error("Admin update user error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/users/<user_id_param>", methods=["DELETE"])
def admin_delete_user(user_id_param):
    """Delete a user (auth + profile). Super-admin only."""
    caller_id, caller_email, err_resp, err_code = _require_super_admin()
    if err_resp:
        return err_resp, err_code

    # Prevent self-deletion
    if user_id_param == caller_id:
        return jsonify({"error": "Cannot delete your own account"}), 400

    try:
        # Delete from Supabase Auth (cascades to profiles via FK)
        supabase.client.auth.admin.delete_user(user_id_param)
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        logger.error("Admin delete user error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/seed", methods=["POST"])
def admin_seed_profiles():
    """Seed the two admin users into profiles table.
    Uses service_role key so it bypasses RLS.
    Body: {"secret": "<SETUP_SECRET>"}
    """
    setup_secret = os.getenv("SETUP_SECRET", "")
    if not setup_secret:
        return jsonify({"error": "Setup disabled (SETUP_SECRET not configured)"}), 403

    body = request.json or {}
    if body.get("secret") != setup_secret:
        return jsonify({"error": "Invalid setup secret"}), 403

    results = []
    try:
        # List all auth users to find our admins
        auth_users = supabase.client.auth.admin.list_users()
        auth_map = {}
        for u in auth_users:
            if hasattr(u, 'email') and u.email:
                auth_map[u.email.lower()] = u.id

        for email_key, info in ADMIN_USERS.items():
            uid = auth_map.get(email_key)
            if not uid:
                results.append({"email": email_key, "status": "not_in_auth", "detail": "Run setup-admins first"})
                continue
            try:
                supabase.client.table("profiles").upsert({
                    "user_id": uid,
                    "full_name": info["name"],
                    "email": email_key,
                    "phone": info.get("phone"),
                    "role": info["role"],
                }).execute()
                results.append({"email": email_key, "status": "seeded", "user_id": uid})
            except Exception as pe:
                results.append({"email": email_key, "status": "error", "detail": str(pe)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"results": results}), 200


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

    # Also check profiles table for role
    role = "user"
    try:
        profile = supabase.client.table("profiles").select("role, full_name").eq("user_id", user_id).single().execute()
        if profile.data:
            role = profile.data.get("role", "user")
    except Exception:
        pass

    # Use profile role if set, otherwise fall back to ADMIN_USERS dict
    final_role = role if role != "user" else (admin_info["role"] if admin_info else "user")

    return jsonify({
        "user_id": user_id,
        "email": email,
        "is_admin": final_role in ("super_admin", "admin"),
        "role": final_role,
        "name": admin_info["name"] if admin_info else None,
    }), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
