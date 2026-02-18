"""
LexAssist — Subscription Tiers Blueprint
==========================================
Flask Blueprint providing CRUD endpoints for SaaS subscription tiers.
Backed by the ``subscription_tiers`` table in Supabase.

Endpoints:
  GET    /api/admin/subscription-tiers         — list all tiers
  POST   /api/admin/subscription-tiers         — create tier
  PATCH  /api/admin/subscription-tiers/<id>    — update tier
  DELETE /api/admin/subscription-tiers/<id>    — delete tier
"""

from flask import Blueprint, jsonify, request
from backend.services.supabase_client import SupabaseClient
from backend.utils.logger import setup_logger

logger = setup_logger("SubscriptionTiers")

subscription_tiers_bp = Blueprint('subscription_tiers', __name__)

# Shared Supabase client (re-uses existing config)
_supabase = None

def _get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = SupabaseClient()
    return _supabase


@subscription_tiers_bp.route('/api/admin/subscription-tiers', methods=['GET'])
def list_tiers():
    """Return all subscription tiers."""
    try:
        sb = _get_supabase()
        if not sb.client:
            return jsonify({"error": "Database unavailable"}), 503
        result = sb.client.table('subscription_tiers').select('*').execute()
        data = result.data if hasattr(result, 'data') else result.get('data', [])
        return jsonify(data), 200
    except Exception as e:
        logger.error("list_tiers error: %s", e)
        return jsonify({"error": str(e)}), 500


@subscription_tiers_bp.route('/api/admin/subscription-tiers', methods=['POST'])
def create_tier():
    """Create a new subscription tier."""
    try:
        body = request.json
        if not body or not body.get('name'):
            return jsonify({"error": "Tier name is required"}), 400

        tier_data = {
            "name": body["name"],
            "display_name": body.get("display_name", body["name"].title()),
            "price": body.get("price", 0),
            "currency": body.get("currency", "INR"),
            "user_limit": body.get("user_limit"),
            "duration_days": body.get("duration_days", 30),
            "description": body.get("description", ""),
        }

        sb = _get_supabase()
        if not sb.client:
            return jsonify({"error": "Database unavailable"}), 503
        result = sb.client.table('subscription_tiers').insert(tier_data).execute()
        data = result.data if hasattr(result, 'data') else result.get('data')
        return jsonify(data), 201
    except Exception as e:
        logger.error("create_tier error: %s", e)
        return jsonify({"error": str(e)}), 500


@subscription_tiers_bp.route('/api/admin/subscription-tiers/<tier_id>', methods=['PATCH'])
def update_tier(tier_id):
    """Update an existing subscription tier."""
    try:
        body = request.json
        if not body:
            return jsonify({"error": "No update data provided"}), 400

        allowed_fields = {"name", "display_name", "price", "currency",
                          "user_limit", "duration_days", "description"}
        update_data = {k: v for k, v in body.items() if k in allowed_fields}

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        sb = _get_supabase()
        if not sb.client:
            return jsonify({"error": "Database unavailable"}), 503
        result = sb.client.table('subscription_tiers').update(update_data).eq('id', tier_id).execute()
        data = result.data if hasattr(result, 'data') else result.get('data')
        return jsonify(data), 200
    except Exception as e:
        logger.error("update_tier error: %s", e)
        return jsonify({"error": str(e)}), 500


@subscription_tiers_bp.route('/api/admin/subscription-tiers/<tier_id>', methods=['DELETE'])
def delete_tier(tier_id):
    """Delete a subscription tier."""
    try:
        sb = _get_supabase()
        if not sb.client:
            return jsonify({"error": "Database unavailable"}), 503
        result = sb.client.table('subscription_tiers').delete().eq('id', tier_id).execute()
        return jsonify({"message": "Tier deleted"}), 200
    except Exception as e:
        logger.error("delete_tier error: %s", e)
        return jsonify({"error": str(e)}), 500
