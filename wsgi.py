"""
WSGI entry point — thin wrapper so gunicorn can discover the Flask app
regardless of how the start command is written.

  gunicorn wsgi:app          # works
  gunicorn backend.app:app   # also works (with PYTHONPATH=.)
"""
# ---------------------------------------------------------------------------
# Gevent monkey-patch — safety net for non-gunicorn usage (e.g. flask run).
# When running via gunicorn, the patch already happened in gunicorn.conf.py
# (which loads first), so this call is a harmless no-op.
# ---------------------------------------------------------------------------
try:
    from gevent import monkey
    if not monkey.is_module_patched("ssl"):
        monkey.patch_all()
except ImportError:
    pass  # gevent not installed (local dev) — sync workers still work
import sys, os

# Ensure the project root is on sys.path so 'backend' is importable
sys.path.insert(0, os.path.dirname(__file__))

from backend.app import app  # noqa: E402, F401
