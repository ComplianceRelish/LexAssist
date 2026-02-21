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
from backend.services.jurisdiction_resolver import JurisdictionResolver
from backend.services.speech_service import SpeechService
from backend.services.document_service import DocumentService
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
jurisdiction_resolver = JurisdictionResolver()
claude = ClaudeClient()
speech = SpeechService()
document_service = DocumentService()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_current_user():
    """Return (user_id, email) from Bearer token or session cookie, or (None, None)."""
    # 1. Try Authorization header first (works cross-origin without cookies)
    auth_header = request.headers.get("Authorization", "")
    access_token = None
    if auth_header.startswith("Bearer "):
        access_token = auth_header[7:]
    # 2. Fall back to cookie
    if not access_token:
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
            "jurisdiction_resolver": "active",
            "speech_stt": "ready" if speech.is_available else "unavailable",
            "speech_correction": "ready" if speech.has_correction else "unavailable",
            "document_scanner": "ready" if document_service.is_available else "unavailable",
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

        # Enrich with verified jurisdiction data
        jurisdiction_resolver.enrich_context(result, text)

        # Log activity for the authenticated user
        user_id, _ = _get_current_user()
        if user_id and supabase.client:
            try:
                # Auto-create a case diary
                case_id = data.get("case_id")
                if not case_id:
                    case_row = supabase.client.table("cases").insert({
                        "user_id": user_id,
                        "title": text[:100].replace("\n", " ").strip(),
                        "status": "active",
                    }).execute()
                    case_id = case_row.data[0]["id"] if case_row.data else None

                # Save full brief
                brief_row = supabase.client.table("briefs").insert({
                    "user_id": user_id,
                    "case_id": case_id,
                    "title": text[:100].replace("\n", " ").strip(),
                    "content": text,
                }).execute()
                brief_id = brief_row.data[0]["id"] if brief_row.data else None

                # Save analysis result
                if brief_id:
                    supabase.client.table("analysis_results").insert({
                        "user_id": user_id,
                        "brief_id": brief_id,
                        "analysis": result,
                    }).execute()

                snippet = text[:200].replace("\n", " ")
                supabase.client.table("activity_log").insert({
                    "user_id": user_id,
                    "case_id": case_id,
                    "action": "brief_analyzed",
                    "title": "Brief Analysis",
                    "detail": snippet,
                    "metadata": {"brief_id": brief_id, "case_id": case_id},
                }).execute()
            except Exception as log_err:
                logger.warning("Activity log write failed: %s", log_err)

        result["case_id"] = case_id if user_id else None
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
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
        }
        resp = make_response(jsonify(body))
        # Keep cookies as fallback for same-site scenarios
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
        update_fields = {}
        if data.get("fullName") is not None:
            update_fields["full_name"] = data["fullName"]
        if data.get("address") is not None:
            update_fields["address"] = data["address"]
        if data.get("age") is not None:
            update_fields["age"] = data["age"]
        if data.get("email") is not None:
            update_fields["email"] = data["email"]
        if data.get("phone") is not None:
            update_fields["phone"] = data["phone"]

        if not update_fields:
            return jsonify({"error": "No fields to update"}), 400

        supabase.client.table("profiles").update(update_fields).eq("user_id", user_id).execute()

        # If phone changed, also update Supabase Auth password (phone = password)
        if data.get("phone"):
            try:
                supabase.client.auth.admin.update_user_by_id(user_id, {
                    "password": data["phone"],
                    "phone": data["phone"],
                })
            except Exception as auth_err:
                logger.warning("Auth phone/password sync failed: %s", auth_err)

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
            "briefsAnalyzed": actions.count("brief_analyzed") + actions.count("ai_brief_analyzed"),
            "caseFilesGenerated": actions.count("case_file_generated") + actions.count("document_drafted"),
            "documentsDownloaded": actions.count("document_downloaded"),
            "searchesPerformed": actions.count("search_performed") + actions.count("ai_chat"),
        }), 200
    except Exception as e:
        logger.error("Stats error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/user/case/<activity_id>", methods=["GET"])
def get_case_detail(activity_id):
    """Retrieve the full brief + analysis for a given activity_log entry."""
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        # 1. Get the activity_log entry (verify ownership)
        activity = (
            supabase.client.table("activity_log")
            .select("id, action, title, detail, metadata, created_at")
            .eq("id", activity_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not activity.data:
            return jsonify({"error": "Activity not found"}), 404

        entry = activity.data
        brief_id = (entry.get("metadata") or {}).get("brief_id")

        result = {
            "activity": entry,
            "brief": None,
            "analysis": None,
        }

        if brief_id:
            # 2. Get full brief text
            brief = (
                supabase.client.table("briefs")
                .select("id, title, content, created_at")
                .eq("id", brief_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            if brief.data:
                result["brief"] = brief.data

            # 3. Get analysis results
            analysis = (
                supabase.client.table("analysis_results")
                .select("id, law_sections, case_histories, analysis, created_at")
                .eq("brief_id", brief_id)
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if analysis.data:
                result["analysis"] = analysis.data[0]

        return jsonify(result), 200
    except Exception as e:
        logger.error("Case detail error: %s", e)
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
            .select("id, action, title, detail, metadata, created_at")
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
# Case Diary – CRUD for persistent cases
# ---------------------------------------------------------------------------

@app.route("/api/cases", methods=["GET"])
def list_cases():
    """List all cases for the authenticated user."""
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        status_filter = request.args.get("status")  # optional: active, closed, archived
        query = (
            supabase.client.table("cases")
            .select("id, title, status, notes, created_at, updated_at")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
        )
        if status_filter:
            query = query.eq("status", status_filter)

        rows = query.execute()
        return jsonify({"cases": rows.data or []}), 200
    except Exception as e:
        logger.error("List cases error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/cases", methods=["POST"])
def create_case():
    """Create a new case diary (standalone, without analysis)."""
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json or {}
    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "Case title is required"}), 400
    try:
        row = supabase.client.table("cases").insert({
            "user_id": user_id,
            "title": title,
            "notes": data.get("notes", ""),
            "status": "active",
        }).execute()
        return jsonify({"case": row.data[0] if row.data else None}), 201
    except Exception as e:
        logger.error("Create case error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/cases/<case_id>", methods=["GET"])
def get_case(case_id):
    """Retrieve full case diary: case info + all briefs + all analyses (timeline)."""
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        # 1. Case metadata
        case_row = (
            supabase.client.table("cases")
            .select("id, title, status, notes, created_at, updated_at")
            .eq("id", case_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not case_row.data:
            return jsonify({"error": "Case not found"}), 404

        # 2. All briefs for this case (chronological)
        briefs = (
            supabase.client.table("briefs")
            .select("id, title, content, created_at")
            .eq("case_id", case_id)
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )

        # 3. All analysis results linked to these briefs
        brief_ids = [b["id"] for b in (briefs.data or [])]
        analyses = []
        if brief_ids:
            analysis_rows = (
                supabase.client.table("analysis_results")
                .select("id, brief_id, analysis, law_sections, case_histories, created_at")
                .eq("user_id", user_id)
                .in_("brief_id", brief_ids)
                .order("created_at", desc=False)
                .execute()
            )
            analyses = analysis_rows.data or []

        # 4. Activity log entries for this case
        activities = (
            supabase.client.table("activity_log")
            .select("id, action, title, detail, created_at")
            .eq("case_id", case_id)
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )

        # Build timeline: merge briefs + analyses into entries
        timeline = []
        analysis_by_brief = {}
        for a in analyses:
            analysis_by_brief.setdefault(a["brief_id"], []).append(a)

        for b in (briefs.data or []):
            entry = {
                "type": "brief",
                "brief_id": b["id"],
                "title": b["title"],
                "content": b["content"],
                "created_at": b["created_at"],
                "analyses": analysis_by_brief.get(b["id"], []),
            }
            timeline.append(entry)

        return jsonify({
            "case": case_row.data,
            "timeline": timeline,
            "activities": activities.data or [],
        }), 200
    except Exception as e:
        logger.error("Get case error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/cases/<case_id>", methods=["PATCH"])
def update_case(case_id):
    """Update case title, notes, or status."""
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json or {}
    try:
        # Verify ownership
        existing = (
            supabase.client.table("cases")
            .select("id")
            .eq("id", case_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not existing.data:
            return jsonify({"error": "Case not found"}), 404

        updates = {}
        if "title" in data:
            updates["title"] = data["title"]
        if "notes" in data:
            updates["notes"] = data["notes"]
        if "status" in data and data["status"] in ("active", "closed", "archived"):
            updates["status"] = data["status"]

        if not updates:
            return jsonify({"error": "No fields to update"}), 400

        row = (
            supabase.client.table("cases")
            .update(updates)
            .eq("id", case_id)
            .execute()
        )
        return jsonify({"case": row.data[0] if row.data else None}), 200
    except Exception as e:
        logger.error("Update case error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/cases/<case_id>/entry", methods=["POST"])
def add_case_entry(case_id):
    """Add a new brief/note entry to an existing case, optionally with AI analysis."""
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json or {}
    text = data.get("text", "").strip()
    run_analysis = data.get("analyze", False)

    if not text:
        return jsonify({"error": "Entry text is required"}), 400

    try:
        # Verify case ownership
        existing = (
            supabase.client.table("cases")
            .select("id, title")
            .eq("id", case_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not existing.data:
            return jsonify({"error": "Case not found"}), 404

        # 1. Save brief entry to this case
        brief_row = supabase.client.table("briefs").insert({
            "user_id": user_id,
            "case_id": case_id,
            "title": text[:100].replace("\n", " ").strip(),
            "content": text,
        }).execute()
        brief_id = brief_row.data[0]["id"] if brief_row.data else None

        result = {"brief_id": brief_id, "analysis": None}

        # 2. Optionally run AI analysis on the new entry
        if run_analysis and claude.is_available and brief_id:
            regex_context = analyzer.analyze(text)
            jurisdiction_resolver.enrich_context(regex_context, text)
            ai_result = claude.analyze_brief(text, context=regex_context)
            merged = {
                "status": "success",
                "ai_analysis": ai_result,
                "entities": regex_context.get("entities", {}),
                "case_type_regex": regex_context.get("case_type", {}),
                "statutes_regex": regex_context.get("statutes", []),
                "precedents_kanoon": regex_context.get("precedents", []),
            }
            supabase.client.table("analysis_results").insert({
                "user_id": user_id,
                "brief_id": brief_id,
                "analysis": merged,
            }).execute()
            result["analysis"] = merged

        # 3. Log activity
        snippet = text[:200].replace("\n", " ")
        action = "ai_brief_analyzed" if run_analysis else "brief_analyzed"
        supabase.client.table("activity_log").insert({
            "user_id": user_id,
            "case_id": case_id,
            "action": action,
            "title": f"Entry: {existing.data['title'][:50]}",
            "detail": snippet,
            "metadata": {"brief_id": brief_id, "case_id": case_id},
        }).execute()

        # Touch the case updated_at
        supabase.client.table("cases").update({"notes": existing.data.get("notes", "") or ""}).eq("id", case_id).execute()

        return jsonify(result), 201
    except Exception as e:
        logger.error("Add case entry error: %s", e)
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

        # Step 1b: Jurisdiction resolution (authoritative geographic lookup)
        jurisdiction_resolver.enrich_context(regex_context, text)

        # Step 2: Deep AI analysis with context (now includes verified jurisdiction)
        ai_result = claude.analyze_brief(text, context=regex_context)

        # Merge: AI analysis + regex-extracted entities + jurisdiction
        merged = {
            "status": "success",
            "ai_analysis": ai_result,
            "entities": regex_context.get("entities", {}),
            "case_type_regex": regex_context.get("case_type", {}),
            "jurisdiction_regex": regex_context.get("jurisdiction", {}),
            "jurisdiction_verified": regex_context.get("jurisdiction_data", {}),
            "statutes_regex": regex_context.get("statutes", []),
            "precedents_kanoon": regex_context.get("precedents", []),
            "timeline": regex_context.get("timeline", []),
            "nlp_enrichment": regex_context.get("nlp_enrichment", {}),
        }

        # Save full brief + analysis as a Case Diary, then log activity
        brief_id = None
        case_id = data.get("case_id")  # optional: link to existing case
        if supabase.client:
            try:
                # Auto-create a case if none specified
                if not case_id:
                    case_title = text[:100].replace("\n", " ").strip()
                    # Use AI-generated summary as title if available
                    ai_summary = ai_result.get("case_summary", "")
                    if ai_summary and isinstance(ai_summary, str):
                        case_title = ai_summary[:120]
                    case_row = supabase.client.table("cases").insert({
                        "user_id": user_id,
                        "title": case_title,
                        "status": "active",
                    }).execute()
                    case_id = case_row.data[0]["id"] if case_row.data else None

                brief_row = supabase.client.table("briefs").insert({
                    "user_id": user_id,
                    "case_id": case_id,
                    "title": text[:100].replace("\n", " ").strip(),
                    "content": text,
                }).execute()
                brief_id = brief_row.data[0]["id"] if brief_row.data else None

                if brief_id:
                    supabase.client.table("analysis_results").insert({
                        "user_id": user_id,
                        "brief_id": brief_id,
                        "analysis": merged,
                    }).execute()

                snippet = text[:200].replace("\n", " ")
                supabase.client.table("activity_log").insert({
                    "user_id": user_id,
                    "case_id": case_id,
                    "action": "ai_brief_analyzed",
                    "title": "AI Brief Analysis",
                    "detail": snippet,
                    "metadata": {"brief_id": brief_id, "case_id": case_id},
                }).execute()
            except Exception as log_err:
                logger.warning("Activity log write failed: %s", log_err)

        # Include case_id in response so frontend can navigate to the case diary
        merged["case_id"] = case_id
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

    # Get full_name from profile if available
    profile_full_name = None
    try:
        if profile.data:
            profile_full_name = profile.data.get("full_name")
    except Exception:
        pass

    return jsonify({
        "user_id": user_id,
        "email": email,
        "is_admin": final_role in ("super_admin", "admin"),
        "role": final_role,
        "name": admin_info["name"] if admin_info else None,
        "full_name": profile_full_name,
    }), 200


# ---------------------------------------------------------------------------
# Speech-to-Text — Enterprise legal dictation
# ---------------------------------------------------------------------------

@app.route("/api/speech/transcribe", methods=["POST"])
def speech_transcribe():
    """Transcribe audio using Whisper + legal vocabulary boosting + Claude correction.
    
    Accepts multipart/form-data with:
      - audio: audio file (WAV, FLAC, MP3, WebM, etc.)
      - language: language code (default: en)
      - role: speaker role for context priming (advocate, paralegal, student, etc.)
      - mode: 'dictation' or 'conversational'
    """
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided. Send as multipart form with field name 'audio'."}), 400

    audio_file = request.files["audio"]
    if not audio_file.filename:
        return jsonify({"error": "Empty audio file"}), 400

    language = request.form.get("language", "en")
    user_role = request.form.get("role", None)
    mode = request.form.get("mode", "dictation")

    try:
        audio_data = audio_file.read()
        if len(audio_data) == 0:
            return jsonify({"error": "Audio file is empty"}), 400

        result = speech.transcribe(
            audio_data=audio_data,
            filename=audio_file.filename,
            language=language,
            user_role=user_role,
            mode=mode,
        )

        # Log activity
        if user_id and supabase.client and result.get("metadata", {}).get("status") == "success":
            try:
                snippet = (result.get("corrected_transcript") or result.get("raw_transcript", ""))[:200]
                supabase.client.table("activity_log").insert({
                    "user_id": user_id,
                    "action": "speech_transcribed",
                    "title": "Voice Dictation",
                    "detail": snippet,
                    "metadata": {
                        "word_count": result.get("metadata", {}).get("word_count", 0),
                        "corrections_count": result.get("metadata", {}).get("corrections_count", 0),
                        "mode": mode,
                        "role": user_role,
                    },
                }).execute()
            except Exception as log_err:
                logger.warning("Speech activity log failed: %s", log_err)

        if "error" in result:
            return jsonify(result), 400 if result.get("status") in ("invalid_format", "file_too_large") else 500

        return jsonify(result)

    except Exception as e:
        logger.error("Speech transcription error: %s", e)
        return jsonify({"error": "Transcription failed", "details": str(e)}), 500


@app.route("/api/speech/status", methods=["GET"])
def speech_status():
    """Return speech service health and capabilities."""
    return jsonify(speech.get_status()), 200


@app.route("/api/speech/correct", methods=["POST"])
def speech_correct():
    """Run LLM correction on an existing transcript (text-only, no audio).
    
    Body: { "text": "...", "role": "advocate" }
    """
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.json or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    user_role = data.get("role")

    # Apply rule-based fixes first
    rule_fixed = speech._apply_rule_corrections(text)

    # Then LLM correction
    if speech.has_correction:
        correction = speech._llm_correct(rule_fixed, user_role=user_role)
        if correction:
            return jsonify({
                "original": text,
                "corrected_text": correction.get("corrected_text", rule_fixed),
                "corrections": correction.get("corrections", []),
                "low_confidence_words": correction.get("low_confidence_words", []),
            })

    return jsonify({
        "original": text,
        "corrected_text": rule_fixed,
        "corrections": [],
        "low_confidence_words": [],
    })


# ---------------------------------------------------------------------------
# Document Scanner & OCR
# ---------------------------------------------------------------------------

@app.route("/api/documents/scan", methods=["POST"])
def document_scan():
    """Process a document: OCR + classification + text extraction.
    
    Accepts multipart/form-data with:
      - file: document file (PDF, JPG, PNG, TIFF, DOCX, etc.)
      - case_id: optional case to link to
    
    Returns extracted text, classification, and metadata.
    """
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    if "file" not in request.files:
        return jsonify({"error": "No file provided. Send as multipart form with field name 'file'."}), 400

    uploaded_file = request.files["file"]
    if not uploaded_file.filename:
        return jsonify({"error": "No filename"}), 400

    case_id = request.form.get("case_id", None)

    try:
        file_data = uploaded_file.read()
        if len(file_data) == 0:
            return jsonify({"error": "File is empty"}), 400

        result = document_service.process_document(
            file_data=file_data,
            filename=uploaded_file.filename,
            user_id=user_id,
            case_id=case_id,
        )

        # Log activity
        if user_id and supabase.client and result.get("metadata", {}).get("status") == "success":
            try:
                doc_type = result.get("classification", {}).get("document_type", "unknown")
                doc_title = result.get("classification", {}).get("document_title", uploaded_file.filename)
                snippet = (result.get("text") or "")[:200]

                supabase.client.table("activity_log").insert({
                    "user_id": user_id,
                    "case_id": case_id,
                    "action": "document_scanned",
                    "title": f"Document Scan: {doc_title}",
                    "detail": snippet,
                    "metadata": {
                        "filename": uploaded_file.filename,
                        "document_type": doc_type,
                        "word_count": result.get("metadata", {}).get("word_count", 0),
                        "pages": result.get("pages", 0),
                        "ocr_used": result.get("metadata", {}).get("ocr_used", False),
                    },
                }).execute()
            except Exception as log_err:
                logger.warning("Document scan activity log failed: %s", log_err)

        if "error" in result:
            status_code = 400 if result.get("status") in ("unsupported_format", "file_too_large", "empty_file") else 500
            return jsonify(result), status_code

        return jsonify(result)

    except Exception as e:
        logger.error("Document scan error: %s", e)
        return jsonify({"error": "Document processing failed", "details": str(e)}), 500


@app.route("/api/documents/status", methods=["GET"])
def document_status():
    """Return document service health and capabilities."""
    return jsonify(document_service.get_status()), 200


@app.route("/api/documents/classify", methods=["POST"])
def document_classify():
    """Classify an already-extracted text. Body: { "text": "..." }"""
    user_id, _ = _get_current_user()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.json or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text to classify"}), 400

    classification = document_service._classify_document(text)
    return jsonify(classification)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
