"""
WSGI entry point — thin wrapper so gunicorn can discover the Flask app
regardless of how the start command is written.

  gunicorn wsgi:app          # works
  gunicorn backend.app:app   # also works (with PYTHONPATH=.)
"""
# ---------------------------------------------------------------------------
# Gevent monkey-patch — MUST happen before any other imports so that
# stdlib socket/threading/queue/ssl are replaced with cooperative
# green-thread equivalents.  This lets gunicorn's gevent worker handle
# long-lived SSE connections without triggering worker timeouts.
# ---------------------------------------------------------------------------
try:
    from gevent import monkey
    monkey.patch_all()          # patches socket, ssl, threading, queue, etc.
except ImportError:
    pass  # gevent not installed (local dev) — sync workers still work
import sys, os

# Ensure the project root is on sys.path so 'backend' is importable
sys.path.insert(0, os.path.dirname(__file__))

from backend.app import app  # noqa: E402, F401
