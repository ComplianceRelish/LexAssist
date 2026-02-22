"""
Gunicorn configuration file — auto-detected by gunicorn when placed
in the project root (where the start command runs).

This file ensures correct timeout, worker class, and connection
limits regardless of what the Render dashboard Start Command says.
Command-line flags like --timeout 30 will OVERRIDE these, but if the
dashboard command omits them, these defaults take effect.

See: https://docs.gunicorn.org/en/stable/settings.html
"""

import multiprocessing
import os

# ---------------------------------------------------------------------------
# Worker class — gevent for cooperative async I/O.
# Critical for SSE streaming and long-running Claude API calls.
# Falls back to sync if gevent isn't installed (local dev).
# ---------------------------------------------------------------------------
try:
    import gevent  # noqa: F401
    worker_class = "gevent"
except ImportError:
    worker_class = "sync"

# ---------------------------------------------------------------------------
# Worker count & connections
# ---------------------------------------------------------------------------
workers = int(os.getenv("WEB_CONCURRENCY", 2))
worker_connections = 200  # gevent greenlets per worker

# ---------------------------------------------------------------------------
# Timeouts — MUST be long enough for Claude API calls (30-120s typical)
# ---------------------------------------------------------------------------
timeout = 300          # Kill worker after 300s of silence (5 min)
graceful_timeout = 300 # Give worker 300s to finish after SIGTERM
keepalive = 5          # Keep-alive between requests

# ---------------------------------------------------------------------------
# Request limits — prevent memory leaks over many requests
# ---------------------------------------------------------------------------
max_requests = 200
max_requests_jitter = 20

# ---------------------------------------------------------------------------
# Binding — Render sets $PORT
# ---------------------------------------------------------------------------
bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# ---------------------------------------------------------------------------
# Preload app for faster worker spawning (shared memory)
# ---------------------------------------------------------------------------
preload_app = False  # disabled: gevent monkey-patch must happen per-worker
