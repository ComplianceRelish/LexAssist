"""
Entry point for the application when deployed to Render.
This module serves as an adapter to run the FastAPI application with Flask/WSGI.
"""
import os
import sys
from flask import Flask, request, redirect, Response
from fastapi.middleware.wsgi import WSGIMiddleware
from flask_cors import CORS

# Add the current directory to the path to ensure imports work correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Create Flask app
app = Flask(__name__)

# Get CORS settings from environment variables or use defaults
allowed_origins = os.environ.get('CORS_ALLOWED_ORIGINS', 'https://lex-assist.vercel.app,http://localhost:3000,http://localhost:3001,http://localhost:5173').split(',')
allowed_methods = os.environ.get('CORS_ALLOW_METHODS', 'GET,POST,PUT,DELETE,OPTIONS,PATCH').split(',')
allowed_headers = os.environ.get('CORS_ALLOW_HEADERS', 'Content-Type,Authorization,X-Requested-With,Accept,Origin').split(',')
max_age = int(os.environ.get('CORS_MAX_AGE', '600'))
allow_credentials = os.environ.get('CORS_ALLOW_CREDENTIALS', 'true').lower() == 'true'

# Configure CORS to allow requests from specific origins
CORS(app, resources={
    r"/*": {
        "origins": allowed_origins,
        "methods": allowed_methods,
        "allow_headers": allowed_headers,
        "expose_headers": ["Content-Length"],
        "supports_credentials": allow_credentials,
        "max_age": max_age  # Cache preflight requests
    }
})

# Handle OPTIONS requests globally
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    """Handle OPTIONS preflight requests"""
    response = app.make_default_options_response()
    # Allow the specific origin that made the request, or fall back to the primary origin
    origin = request.headers.get('Origin')
    if origin and origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
    else:
        # Default to primary origin if the origin header doesn't match allowed origins
        response.headers.add('Access-Control-Allow-Origin', allowed_origins[0])
    response.headers.add('Access-Control-Allow-Headers', ','.join(allowed_headers))
    response.headers.add('Access-Control-Allow-Methods', ','.join(allowed_methods))
    response.headers.add('Access-Control-Allow-Credentials', 'true' if allow_credentials else 'false')
    response.headers.add('Access-Control-Max-Age', str(max_age))
    response.headers.add('Access-Control-Expose-Headers', 'Content-Length')
    return response

@app.route('/', methods=['OPTIONS'])
def handle_root_options():
    """Handle OPTIONS preflight requests for root path"""
    response = app.make_default_options_response()
    # Allow the specific origin that made the request, or fall back to the primary origin
    origin = request.headers.get('Origin')
    if origin and origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
    else:
        # Default to primary origin if the origin header doesn't match allowed origins
        response.headers.add('Access-Control-Allow-Origin', allowed_origins[0])
    response.headers.add('Access-Control-Allow-Headers', ','.join(allowed_headers))
    response.headers.add('Access-Control-Allow-Methods', ','.join(allowed_methods))
    response.headers.add('Access-Control-Allow-Credentials', 'true' if allow_credentials else 'false')
    response.headers.add('Access-Control-Max-Age', str(max_age))
    response.headers.add('Access-Control-Expose-Headers', 'Content-Length')
    return response

# Import FastAPI app after Flask setup to avoid circular imports
from main import app as fastapi_app

# Root endpoint redirects to FastAPI docs
@app.route("/", methods=['GET'])
def index():
    return redirect("/docs")

# Mount FastAPI app to Flask app
app.wsgi_app = WSGIMiddleware(fastapi_app)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)