from flask import Flask, jsonify, request
from flask_cors import CORS
from backend.config import Config
from backend.models.legal_brief_analyzer import LegalBriefAnalyzer
from backend.services.inlegalbert_processor import InLegalBERTProcessor
from backend.services.indian_kanoon import IndianKanoonAPI
from backend.services.supabase_client import SupabaseClient
from backend.utils.logger import setup_logger

app = Flask(__name__)
CORS(app)
logger = setup_logger()

indian_kanoon = IndianKanoonAPI()
inlegalbert = InLegalBERTProcessor()
supabase = SupabaseClient()
analyzer = LegalBriefAnalyzer(indian_kanoon=indian_kanoon, inlegalbert=inlegalbert)

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

# --- Auth Endpoints for Production ---
from flask import make_response

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    phone = data.get('phone')
    try:
        if email:
            result = supabase.client.auth.sign_up({"email": email})
        elif phone:
            result = supabase.client.auth.sign_up({"phone": phone})
        else:
            return jsonify({'error': 'Email or phone required'}), 400
        return jsonify({'message': 'Registration successful. Please verify OTP sent to your contact.'}), 201
    except Exception as e:
        logger.error("Registration error: %s", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    data = request.json
    email = data.get('email')
    phone = data.get('phone')
    channel = 'email' if email else 'sms'
    try:
        if email:
            result = supabase.client.auth.sign_in_with_otp({"email": email})
        elif phone:
            result = supabase.client.auth.sign_in_with_otp({"phone": phone})
        else:
            return jsonify({'error': 'Email or phone required'}), 400
        return jsonify({'message': f'OTP sent via {channel}'}), 200
    except Exception as e:
        logger.error("Send OTP error: %s", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    email = data.get('email')
    phone = data.get('phone')
    token = data.get('token')
    type_ = data.get('type', 'email')  # 'email' or 'sms'
    try:
        if email:
            result = supabase.client.auth.verify_otp({"email": email, "token": token, "type": type_})
        elif phone:
            result = supabase.client.auth.verify_otp({"phone": phone, "token": token, "type": type_})
        else:
            return jsonify({'error': 'Email or phone required'}), 400
        session = getattr(result, 'session', None)
        if not session:
            return jsonify({'error': 'OTP verification failed'}), 401
        user_data = getattr(result, 'user', None)
        resp = make_response(jsonify({'message': 'OTP verified', 'user': user_data.model_dump() if user_data else None}))
        resp.set_cookie('sb-access-token', session.access_token, httponly=True, samesite='Lax')
        resp.set_cookie('sb-refresh-token', session.refresh_token, httponly=True, samesite='Lax')
        return resp
    except Exception as e:
        logger.error("Verify OTP error: %s", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    resp = make_response(jsonify({'message': 'Logged out'}))
    resp.set_cookie('sb-access-token', '', expires=0)
    resp.set_cookie('sb-refresh-token', '', expires=0)
    return resp

import jwt

@app.route('/api/user/profile', methods=['POST'])
def update_profile():
    access_token = request.cookies.get('sb-access-token')
    if not access_token:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        # Decode JWT to get user id
        payload = jwt.decode(access_token, options={"verify_signature": False})
        user_id = payload.get('sub')
        if not user_id:
            return jsonify({'error': 'Invalid token'}), 401
        data = request.json
        profile_data = {
            "user_id": user_id,
            "full_name": data.get("fullName"),
            "address": data.get("address"),
            "age": data.get("age"),
            "email": data.get("email"),
            "phone": data.get("phone"),
        }
        # Upsert into 'profiles' table
        result = supabase.client.table('profiles').upsert(profile_data).execute()
        return jsonify({'message': 'Profile updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/profile', methods=['GET'])
def get_profile():
    access_token = request.cookies.get('sb-access-token')
    if not access_token:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        payload = jwt.decode(access_token, options={"verify_signature": False})
        user_id = payload.get('sub')
        if not user_id:
            return jsonify({'error': 'Invalid token'}), 401
        response = supabase.client.table('profiles').select('*').eq('user_id', user_id).single().execute()
        return jsonify({'profile': response.data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Register subscription_tiers blueprint
from backend.subscription_tiers import subscription_tiers_bp
app.register_blueprint(subscription_tiers_bp)

@app.route('/api/admin/assign-tier', methods=['POST'])
def assign_tier():
    access_token = request.cookies.get('sb-access-token')
    try:
        payload = jwt.decode(access_token, options={"verify_signature": False})
        user_id = payload.get('sub')
        # Only super_admin or admin for org can assign tiers
        profile = supabase.client.table('profiles').select('role').eq('user_id', user_id).single().execute()
        if not profile.data or profile.data.get('role') not in ['super_admin', 'admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json
        org_id = data.get('org_id')
        tier = data.get('tier')
        # Update org's tier
        result = supabase.client.table('organizations').update({'tier': tier}).eq('id', org_id).execute()
        return jsonify({'message': 'Tier assigned', 'org': result.data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/revoke-admin', methods=['POST'])
def revoke_admin():
    access_token = request.cookies.get('sb-access-token')
    try:
        payload = jwt.decode(access_token, options={"verify_signature": False})
        user_id = payload.get('sub')
        # Only super_admin can revoke admin
        profile = supabase.client.table('profiles').select('role').eq('user_id', user_id).single().execute()
        if not profile.data or profile.data.get('role') != 'super_admin':
            return jsonify({'error': 'Unauthorized'}), 403
        data = request.json
        target_user_id = data.get('user_id')
        result = supabase.client.table('profiles').update({'role': 'user'}).eq('user_id', target_user_id).execute()
        return jsonify({'message': 'Admin role revoked'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/organizations', methods=['GET'])
def get_organizations():
    try:
        orgs = supabase.client.table('organizations').select('id, name, tier').execute()
        return jsonify(orgs.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        users = supabase.client.table('profiles').select('user_id, full_name, email, role').execute()
        return jsonify(users.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
