from flask import Flask, request, jsonify
from flask_cors import CORS
# Import your models and services
from backend.models.legal_brief_analyzer import LegalBriefAnalyzer

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize components
legal_brief_analyzer = LegalBriefAnalyzer()

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "healthy", "message": "LexAssist API is running"})

@app.route('/api/analyze-brief', methods=['POST'])
def analyze_brief():
    """Endpoint to analyze a legal brief"""
    data = request.json
    if not data or 'brief_text' not in data:
        return jsonify({"error": "Missing required parameter: brief_text"}), 400
    
    brief_text = data['brief_text']
    analysis_results = legal_brief_analyzer.analyze_brief(brief_text)
    
    return jsonify({
        "status": "success",
        "analysis": analysis_results
    })

# Add more routes as needed

if __name__ == '__main__':
    app.run(debug=True)
