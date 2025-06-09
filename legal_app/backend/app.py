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

# Configure CORS to allow requests from specific origins
CORS(app, resources={
    r"/*": {
        "origins": ["https://lex-assist.vercel.app", "http://localhost:3000", "http://localhost:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "supports_credentials": True,
    }
})

# Handle OPTIONS requests globally
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    """Handle OPTIONS preflight requests"""
    response = app.make_default_options_response()
    response.headers.add('Access-Control-Allow-Origin', 'https://lex-assist.vercel.app')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/', methods=['OPTIONS'])
def handle_root_options():
    """Handle OPTIONS preflight requests for root path"""
    response = app.make_default_options_response()
    response.headers.add('Access-Control-Allow-Origin', 'https://lex-assist.vercel.app')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
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