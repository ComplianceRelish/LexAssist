from flask import Blueprint, request, jsonify
from .app import supabase
import jwt

subscription_tiers_bp = Blueprint('subscription_tiers', __name__)

def is_super_admin(access_token):
    try:
        payload = jwt.decode(access_token, options={"verify_signature": False})
        user_id = payload.get('sub')
        if not user_id:
            return False
        # Check role in profiles
        profile = supabase.client.table('profiles').select('role').eq('user_id', user_id).single().execute()
        return profile['data'] and profile['data'].get('role') == 'super_admin'
    except Exception:
        return False

@subscription_tiers_bp.route('/api/admin/subscription-tiers', methods=['GET'])
def list_tiers():
    tiers = supabase.client.table('subscription_tiers').select('*').execute()
    return jsonify(tiers['data'])

@subscription_tiers_bp.route('/api/admin/subscription-tiers', methods=['POST'])
def create_tier():
    access_token = request.cookies.get('sb-access-token')
    if not is_super_admin(access_token):
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.json
    result = supabase.client.table('subscription_tiers').insert(data).execute()
    if result.get('error'):
        return jsonify({'error': result['error']['message']}), 400
    return jsonify({'message': 'Tier created', 'tier': result['data']}), 201

@subscription_tiers_bp.route('/api/admin/subscription-tiers/<tier_id>', methods=['PATCH'])
def update_tier(tier_id):
    access_token = request.cookies.get('sb-access-token')
    if not is_super_admin(access_token):
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.json
    result = supabase.client.table('subscription_tiers').update(data).eq('id', tier_id).execute()
    if result.get('error'):
        return jsonify({'error': result['error']['message']}), 400
    return jsonify({'message': 'Tier updated', 'tier': result['data']}), 200

@subscription_tiers_bp.route('/api/admin/subscription-tiers/<tier_id>', methods=['DELETE'])
def delete_tier(tier_id):
    access_token = request.cookies.get('sb-access-token')
    if not is_super_admin(access_token):
        return jsonify({'error': 'Unauthorized'}), 403
    result = supabase.client.table('subscription_tiers').delete().eq('id', tier_id).execute()
    if result.get('error'):
        return jsonify({'error': result['error']['message']}), 400
    return jsonify({'message': 'Tier deleted'}), 200
