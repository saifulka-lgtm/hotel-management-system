from functools import wraps
from flask import jsonify
from flask_login import current_user
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models.admin import Admin


def get_current_admin():
    """Web session (Flask-Login) অথবা JWT — যেভাবেই লগইন করা থাকুক, admin object বের করে।"""
    if current_user.is_authenticated:
        return current_user
    try:
        verify_jwt_in_request()
        admin_id = get_jwt_identity()
        return Admin.query.get(int(admin_id))
    except Exception:
        return None


def module_required(module_name):
    """
    ব্যবহার: @module_required('restaurant_kitchen')
    admin-এর role-এ ওই module-এর permission না থাকলে 403 দেবে।
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            admin = get_current_admin()
            if not admin:
                return jsonify({'error': 'Authentication required'}), 401
            if not admin.has_permission(module_name):
                return jsonify({
                    'error': 'Access denied — your role does not have permission for this action',
                    'required_module': module_name
                }), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator