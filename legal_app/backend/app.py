"""
Entry point for the application when deployed to Render.
This module serves as an adapter to run the FastAPI application with Flask/WSGI.
"""
import os
from fastapi.middleware.wsgi import WSGIMiddleware
from flask import Flask, request, jsonify, redirect
from flask_cors import CORS

# Create Flask app
app = Flask(__name__)

# Configure CORS to allow requests from Vercel and localhost
# This must be set up before any routes
cors = CORS(app, 
     resources={r"/*": {
         "origins": ["https://lex-assist.vercel.app", "http://localhost:3000", "http://localhost:5173"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Access-Control-Allow-Origin"],
         "expose_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
     }}, 
     supports_credentials=True,
     send_wildcard=False)

# Import FastAPI app - ensure this import happens here to avoid circular imports
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Fix the main.py file to uncomment the auth_router
from main import app as fastapi_app

# Handle preflight OPTIONS requests explicitly
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    response = app.make_default_options_response()
    response.headers.add('Access-Control-Allow-Origin', 'https://lex-assist.vercel.app')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Special handler for the registration endpoint
@app.route('/api/auth/register', methods=['OPTIONS'])
def handle_register_options():
    response = app.make_default_options_response()
    response.headers.add('Access-Control-Allow-Origin', 'https://lex-assist.vercel.app')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Root endpoint redirects to FastAPI app
@app.route("/")
def index():
    return redirect("/docs")

# Mount FastAPI app to Flask app
app.wsgi_app = WSGIMiddleware(fastapi_app)

if __name__ == "__main__":
    app.run(debug=True)