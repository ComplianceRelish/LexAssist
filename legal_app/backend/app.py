"""
Entry point for the application when deployed to Render.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS

# Import your existing routes/blueprints here
# This would depend on how your main.py is structured

app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    """API root endpoint"""
    return jsonify({
        "status": "online",
        "api": "LexAssist API",
        "version": "1.0.0"
    })

# Import and register your other routes here
# For example:
# from api.legal_bert import legal_bert_routes
# app.register_blueprint(legal_bert_routes, url_prefix='/api/legal-bert')

if __name__ == "__main__":
    app.run(debug=True)