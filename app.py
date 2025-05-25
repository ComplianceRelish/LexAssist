import os
import json
import logging
from flask import Flask, request, jsonify, send_file
from api.legal_brief_analyzer import LegalBriefAnalyzer
from api.supabase_client import SupabaseClient
from api.document_generator import DocumentGenerator
from api.case_file_drafter import CaseFileDrafter
from flask_cors import CORS
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('lex_assist_backend')

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Get API keys from environment variables or use the provided ones
INDIAN_KANOON_API_KEY = os.environ.get('INDIAN_KANOON_API_KEY', 'd053cb3e0082a68b58def9f16e1b43c7a497faf4')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')

# Initialize the legal brief analyzer, Supabase client, document generator, and case file drafter
analyzer = LegalBriefAnalyzer(INDIAN_KANOON_API_KEY)
supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)
document_generator = DocumentGenerator()
case_file_drafter = CaseFileDrafter()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the API is running."""
    return jsonify({"status": "healthy", "message": "Lex Assist API is operational"})

# Authentication endpoints
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """
    Register a new user.
    
    Expected JSON payload:
    {
        "email": "user@example.com",
        "password": "password123",
        "phone": "+919876543210"  // Optional
    }
    """
    try:
        data = request.json
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({"error": "Missing required fields: email and/or password"}), 400
        
        email = data['email']
        password = data['password']
        phone = data.get('phone')
        
        # Log the request (excluding the password for security)
        logger.info(f"Received signup request for email: {email}")
        
        # Sign up the user
        result = supabase.sign_up(email, password, phone)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error signing up user: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/auth/signin/email', methods=['POST'])
def signin_email():
    """
    Sign in a user with email and password.
    
    Expected JSON payload:
    {
        "email": "user@example.com",
        "password": "password123"
    }
    """
    try:
        data = request.json
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({"error": "Missing required fields: email and/or password"}), 400
        
        email = data['email']
        password = data['password']
        
        # Log the request (excluding the password for security)
        logger.info(f"Received email signin request for email: {email}")
        
        # Sign in the user
        result = supabase.sign_in_with_email(email, password)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error signing in user: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/auth/signin/otp', methods=['POST'])
def signin_otp():
    """
    Sign in a user with OTP (One-Time Password).
    
    Expected JSON payload:
    {
        "email": "user@example.com"  // Either email or phone must be provided
        "phone": "+919876543210"     // Either email or phone must be provided
    }
    """
    try:
        data = request.json
        
        if not data or ('email' not in data and 'phone' not in data):
            return jsonify({"error": "Missing required fields: either email or phone must be provided"}), 400
        
        email = data.get('email')
        phone = data.get('phone')
        
        # Log the request
        if email:
            logger.info(f"Received OTP signin request for email: {email}")
        else:
            logger.info(f"Received OTP signin request for phone: {phone}")
        
        # Send OTP
        result = supabase.sign_in_with_otp(email, phone)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error sending OTP: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    """
    Verify an OTP (One-Time Password).
    
    Expected JSON payload:
    {
        "email": "user@example.com",  // Either email or phone must be provided
        "phone": "+919876543210",     // Either email or phone must be provided
        "token": "123456"             // The OTP token
    }
    """
    try:
        data = request.json
        
        if not data or ('email' not in data and 'phone' not in data) or 'token' not in data:
            return jsonify({"error": "Missing required fields: either email or phone, and token must be provided"}), 400
        
        email = data.get('email')
        phone = data.get('phone')
        token = data['token']
        
        # Log the request
        if email:
            logger.info(f"Received OTP verification request for email: {email}")
        else:
            logger.info(f"Received OTP verification request for phone: {phone}")
        
        # Verify OTP
        result = supabase.verify_otp(email, phone, token)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error verifying OTP: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/auth/signout', methods=['POST'])
def signout():
    """
    Sign out a user.
    
    Expected JSON payload:
    {
        "access_token": "user-access-token"
    }
    """
    try:
        data = request.json
        
        if not data or 'access_token' not in data:
            return jsonify({"error": "Missing required field: access_token"}), 400
        
        access_token = data['access_token']
        
        # Log the request
        logger.info("Received signout request")
        
        # Sign out the user
        result = supabase.sign_out(access_token)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error signing out user: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/auth/user', methods=['GET'])
def get_user():
    """
    Get user data.
    
    Expected query parameter:
    access_token: The user's access token
    """
    try:
        access_token = request.args.get('access_token')
        
        if not access_token:
            return jsonify({"error": "Missing required query parameter: access_token"}), 400
        
        # Log the request
        logger.info("Received get user request")
        
        # Get user data
        result = supabase.get_user(access_token)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error getting user data: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Brief and analysis endpoints
@app.route('/api/analyze-brief', methods=['POST'])
def analyze_brief():
    """
    Analyze a legal brief and return relevant law sections, case histories, and analysis.
    
    Expected JSON payload:
    {
        "brief": "The text of the legal brief...",
        "options": {
            "include_law_sections": true,
            "include_case_histories": true,
            "include_analysis": true
        },
        "user_id": "user-id",  // Optional, for saving results
        "save_results": false  // Optional, whether to save results to database
    }
    """
    try:
        data = request.json
        
        if not data or 'brief' not in data:
            return jsonify({"error": "Missing required field: brief"}), 400
        
        brief_text = data['brief']
        options = data.get('options', {
            "include_law_sections": True,
            "include_case_histories": True,
            "include_analysis": True
        })
        user_id = data.get('user_id')
        save_results = data.get('save_results', False)
        
        # Log the request (excluding the full brief for privacy)
        logger.info(f"Received analysis request with options: {options}")
        
        # Analyze the brief
        results = analyzer.analyze_brief(brief_text)
        
        # Filter results based on options
        response = {}
        if options.get('include_law_sections', True):
            response['lawSections'] = results['law_sections']
        
        if options.get('include_case_histories', True):
            response['caseHistories'] = results['case_histories']
        
        if options.get('include_analysis', True):
            response['analysis'] = results['analysis']
        
        # Include metadata
        response['metadata'] = {
            "entities": results['entities'],
            "actsAndSections": results['acts_sections'],
            "citations": results['citations']
        }
        
        # Save results if requested
        if save_results and user_id:
            # First save the brief
            brief_data = {
                "content": brief_text,
                "title": "Legal Brief " + datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            saved_brief = supabase.save_brief(user_id, brief_data)
            
            # Then save the analysis results
            saved_analysis = supabase.save_analysis_result(user_id, saved_brief['id'], response)
            
            # Include IDs in response
            response['brief_id'] = saved_brief['id']
            response['analysis_id'] = saved_analysis['id']
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Error analyzing brief: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/briefs', methods=['GET'])
def get_briefs():
    """
    Get all briefs for a user.
    
    Expected query parameter:
    user_id: The user's ID
    """
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "Missing required query parameter: user_id"}), 400
        
        # Log the request
        logger.info(f"Received get briefs request for user: {user_id}")
        
        # Get briefs
        result = supabase.get_briefs(user_id)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error getting briefs: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/briefs/<brief_id>', methods=['GET'])
def get_brief(brief_id):
    """
    Get a specific brief.
    
    Path parameter:
    brief_id: The brief's ID
    """
    try:
        # Log the request
        logger.info(f"Received get brief request for ID: {brief_id}")
        
        # Get brief
        result = supabase.get_brief(brief_id)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error getting brief: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/briefs/<brief_id>/analysis', methods=['GET'])
def get_analysis_results(brief_id):
    """
    Get analysis results for a brief.
    
    Path parameter:
    brief_id: The brief's ID
    """
    try:
        # Log the request
        logger.info(f"Received get analysis results request for brief: {brief_id}")
        
        # Get analysis results
        result = supabase.get_analysis_results(brief_id)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error getting analysis results: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/search-law', methods=['POST'])
def search_law():
    """
    Search for specific law sections.
    
    Expected JSON payload:
    {
        "query": "Indian Contract Act section 73",
        "filters": {
            "doc_types": "laws",
            "from_date": null,
            "to_date": null
        }
    }
    """
    try:
        data = request.json
        
        if not data or 'query' not in data:
            return jsonify({"error": "Missing required field: query"}), 400
        
        query = data['query']
        filters = data.get('filters', {})
        
        # Log the request
        logger.info(f"Received law search request: {query}")
        
        # Search for law sections
        results = analyzer.api_client.search(
            query=query,
            doc_types=filters.get('doc_types', 'laws'),
            from_date=filters.get('from_date'),
            to_date=filters.get('to_date'),
            title=filters.get('title'),
            max_cites=filters.get('max_cites', 5)
        )
        
        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Error searching law: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/search-cases', methods=['POST'])
def search_cases():
    """
    Search for case histories.
    
    Expected JSON payload:
    {
        "query": "right to privacy",
        "filters": {
            "doc_types": "judgments",
            "from_date": null,
            "to_date": null,
            "court": "supremecourt"
        }
    }
    """
    try:
        data = request.json
        
        if not data or 'query' not in data:
            return jsonify({"error": "Missing required field: query"}), 400
        
        query = data['query']
        filters = data.get('filters', {})
        
        # Log the request
        logger.info(f"Received case search request: {query}")
        
        # Determine document types based on court filter
        doc_types = filters.get('doc_types', 'judgments')
        if 'court' in filters and filters['court']:
            doc_types = filters['court']
        
        # Search for cases
        results = analyzer.api_client.search(
            query=query,
            doc_types=doc_types,
            from_date=filters.get('from_date'),
            to_date=filters.get('to_date'),
            author=filters.get('author'),
            bench=filters.get('bench'),
            max_cites=filters.get('max_cites', 5)
        )
        
        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Error searching cases: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/get-document/<doc_id>', methods=['GET'])
def get_document(doc_id):
    """
    Retrieve a specific document by its ID.
    """
    try:
        # Log the request
        logger.info(f"Received document request for ID: {doc_id}")
        
        # Get max_cites and max_cited_by from query parameters
        max_cites = request.args.get('max_cites', default=None, type=int)
        max_cited_by = request.args.get('max_cited_by', default=None, type=int)
        
        # Retrieve the document
        document = analyzer.api_client.get_document(
            doc_id=doc_id,
            max_cites=max_cites,
            max_cited_by=max_cited_by
        )
        
        return jsonify(document)
    
    except Exception as e:
        logger.error(f"Error retrieving document: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Download and sharing endpoints
@app.route('/api/download', methods=['POST'])
def download_analysis():
    """
    Generate and download a document from analysis results.
    
    Expected JSON payload:
    {
        "brief": "The text of the legal brief...",
        "analysis_results": {
            "lawSections": [...],
            "caseHistories": [...],
            "analysis": {...}
        },
        "format": "pdf"  // One of: pdf, docx, txt
    }
    """
    try:
        data = request.json
        
        if not data or 'brief' not in data or 'analysis_results' not in data or 'format' not in data:
            return jsonify({"error": "Missing required fields: brief, analysis_results, and/or format"}), 400
        
        brief_text = data['brief']
        analysis_results = data['analysis_results']
        format_type = data['format'].lower()
        
        # Log the request
        logger.info(f"Received download request for format: {format_type}")
        
        # Generate the document
        if format_type == 'pdf':
            file_path = document_generator.generate_pdf(brief_text, analysis_results)
            mime_type = 'application/pdf'
            filename = f"legal_analysis_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        elif format_type == 'docx':
            file_path = document_generator.generate_docx(brief_text, analysis_results)
            mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            filename = f"legal_analysis_{datetime.now().strftime('%Y%m%d%H%M%S')}.docx"
        elif format_type == 'txt':
            file_path = document_generator.generate_txt(brief_text, analysis_results)
            mime_type = 'text/plain'
            filename = f"legal_analysis_{datetime.now().strftime('%Y%m%d%H%M%S')}.txt"
        else:
            return jsonify({"error": f"Unsupported format: {format_type}"}), 400
        
        # Return the file
        return send_file(
            file_path,
            mimetype=mime_type,
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        logger.error(f"Error generating document: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/share/email', methods=['POST'])
def share_email_content():
    """
    Generate email content for sharing analysis results.
    
    Expected JSON payload:
    {
        "brief": "The text of the legal brief...",
        "analysis_results": {
            "lawSections": [...],
            "caseHistories": [...],
            "analysis": {...}
        }
    }
    """
    try:
        data = request.json
        
        if not data or 'brief' not in data or 'analysis_results' not in data:
            return jsonify({"error": "Missing required fields: brief and/or analysis_results"}), 400
        
        brief_text = data['brief']
        analysis_results = data['analysis_results']
        
        # Log the request
        logger.info("Received email sharing request")
        
        # Generate email content
        email_content = document_generator.generate_email_content(brief_text, analysis_results)
        
        # Generate a PDF attachment
        pdf_path = document_generator.generate_pdf(brief_text, analysis_results)
        
        return jsonify({
            "subject": email_content["subject"],
            "body": email_content["body"],
            "attachment_path": pdf_path
        })
    
    except Exception as e:
        logger.error(f"Error generating email content: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/share/whatsapp', methods=['POST'])
def share_whatsapp_content():
    """
    Generate WhatsApp content for sharing analysis results.
    
    Expected JSON payload:
    {
        "brief": "The text of the legal brief...",
        "analysis_results": {
            "lawSections": [...],
            "caseHistories": [...],
            "analysis": {...}
        }
    }
    """
    try:
        data = request.json
        
        if not data or 'brief' not in data or 'analysis_results' not in data:
            return jsonify({"error": "Missing required fields: brief and/or analysis_results"}), 400
        
        brief_text = data['brief']
        analysis_results = data['analysis_results']
        
        # Log the request
        logger.info("Received WhatsApp sharing request")
        
        # Generate WhatsApp content
        whatsapp_content = document_generator.generate_whatsapp_content(brief_text, analysis_results)
        
        return jsonify({
            "message": whatsapp_content
        })
    
    except Exception as e:
        logger.error(f"Error generating WhatsApp content: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/draft-case-file', methods=['POST'])
def draft_case_file():
    """
    Draft a case file based on the brief and analysis results.
    
    Expected JSON payload:
    {
        "brief": "The text of the legal brief...",
        "analysis_results": {
            "lawSections": [...],
            "caseHistories": [...],
            "analysis": {...}
        },
        "options": {
            "document_type": "petition",
            "court": "High Court",
            "include_arguments": true,
            "include_prayer": true
        }
    }
    """
    try:
        data = request.json
        
        if not data or 'brief' not in data or 'analysis_results' not in data:
            return jsonify({"error": "Missing required fields: brief and/or analysis_results"}), 400
        
        brief_text = data['brief']
        analysis_results = data['analysis_results']
        options = data.get('options', {
            "document_type": "petition",
            "court": "High Court",
            "include_arguments": True,
            "include_prayer": True
        })
        
        # Log the request (excluding the full brief for privacy)
        logger.info(f"Received case file drafting request with options: {options}")
        
        # Draft the case file
        case_file = case_file_drafter.draft_case_file(brief_text, analysis_results, options)
        
        return jsonify(case_file)
    
    except Exception as e:
        logger.error(f"Error drafting case file: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/download-case-file', methods=['POST'])
def download_case_file():
    """
    Generate and download a case file document.
    
    Expected JSON payload:
    {
        "case_file": {
            "title": "PETITION - ABC Ltd. vs. XYZ Ltd.",
            "content": "...",
            "document_type": "petition",
            "court": "High Court",
            "date": "24 May 2025",
            "parties": {
                "petitioner": "ABC Ltd.",
                "respondent": "XYZ Ltd."
            }
        },
        "format": "pdf"  // One of: pdf, docx, txt
    }
    """
    try:
        data = request.json
        
        if not data or 'case_file' not in data or 'format' not in data:
            return jsonify({"error": "Missing required fields: case_file and/or format"}), 400
        
        case_file = data['case_file']
        format_type = data['format'].lower()
        
        # Log the request
        logger.info(f"Received case file download request for format: {format_type}")
        
        # Generate a temporary file with the case file content
        temp_path = f"/tmp/case_file_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        if format_type == 'pdf':
            # For PDF, we'll use the document generator with a simplified structure
            analysis_results = {
                "analysis": {
                    "summary": case_file['title']
                }
            }
            file_path = document_generator.generate_pdf(case_file['content'], analysis_results)
            mime_type = 'application/pdf'
            filename = f"{case_file['document_type']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        
        elif format_type == 'docx':
            # For DOCX, we'll use the document generator with a simplified structure
            analysis_results = {
                "analysis": {
                    "summary": case_file['title']
                }
            }
            file_path = document_generator.generate_docx(case_file['content'], analysis_results)
            mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            filename = f"{case_file['document_type']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.docx"
        
        elif format_type == 'txt':
            # For TXT, we'll just write the content to a file
            file_path = f"{temp_path}.txt"
            with open(file_path, 'w') as f:
                f.write(case_file['content'])
            mime_type = 'text/plain'
            filename = f"{case_file['document_type']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.txt"
        
        else:
            return jsonify({"error": f"Unsupported format: {format_type}"}), 400
        
        # Return the file
        return send_file(
            file_path,
            mimetype=mime_type,
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        logger.error(f"Error generating case file document: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    # Run the Flask app
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
