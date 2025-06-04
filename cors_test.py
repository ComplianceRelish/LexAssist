"""
Standalone CORS testing script for LexAssist backend using Flask.
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": ["https://lex-assist.vercel.app"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "supports_credentials": True,
    }
})

@app.route("/")
def root():
    """Root endpoint"""
    print("Root endpoint called")
    return jsonify({
        "status": "ok",
        "message": "CORS test server is running",
        "timestamp": str(datetime.now())
    })

@app.route("/api/auth/register", methods=["OPTIONS"])
def options_register():
    """Handle OPTIONS preflight request for register endpoint"""
    print("OPTIONS request received for /api/auth/register")
    response = jsonify({})
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Max-Age"] = "86400"
    return response

@app.route("/api/auth/register", methods=["POST"])
def mock_register():
    """Mock register endpoint for testing"""
    print("POST request received for /api/auth/register")
    print(f"Request data: {request.json}")
    response = jsonify({
        "success": True,
        "message": "Registration successful (mock)",
        "timestamp": str(datetime.now())
    })
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.route("/api/debug/cors")
def debug_cors():
    """Debug endpoint for testing CORS"""
    print("Debug CORS endpoint called")
    response = jsonify({
        "status": "ok",
        "cors": "enabled",
        "time": str(datetime.now())
    })
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

if __name__ == "__main__":
    app.run(debug=True)