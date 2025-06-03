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
CORS(app, 
     resources={r"/*": {
         "origins": ["https://lex-assist.vercel.app", "http://localhost:3000", "http://localhost:5173"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
         "expose_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True,
         "max_age": 86400  # Cache preflight response for 24 hours
     }}, 
     supports_credentials=True)

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
    return response

# Root endpoint redirects to FastAPI app
@app.route("/")
def index():
    return redirect("/docs")

# Mount FastAPI app to Flask app
app.wsgi_app = WSGIMiddleware(fastapi_app)

if __name__ == "__main__":
    app.run(debug=True)