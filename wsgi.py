"""
WSGI entry point — thin wrapper so gunicorn can discover the Flask app
regardless of how the start command is written.

  gunicorn wsgi:app          # works
  gunicorn backend.app:app   # also works (with PYTHONPATH=.)
"""
import sys, os

# Ensure the project root is on sys.path so 'backend' is importable
sys.path.insert(0, os.path.dirname(__file__))

from backend.app import app  # noqa: E402, F401
