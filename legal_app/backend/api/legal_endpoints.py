# Add to legal_app/backend/api/legal_endpoints.py

from fastapi import BackgroundTasks
from fastapi.responses import StreamingResponse
import json

@router.post("/legal-query/stream")
async def stream_legal_query(
    query_data: LegalQuery,
    response: Response,
    current_user=Depends(verify_user_access),
    supabase=Depends(get_supabase_client)
):
    """Stream legal query response for better UX"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    async def generate_stream():
        try:
            # Get user details
            user_response = supabase.table("users").select(
                "id, country, role, full_name"
            ).eq("id", current_user.id).single().execute()
            
            user_data = user_response.data
            
            # Create AI request
            ai_request = AIRequest(
                query=query_data.query,
                query_type=LegalQueryType(query_data.query_type),
                jurisdiction=user_data["country"],
                user_role=user_data["role"],
                context=query_data.context,
                documents=query_data.documents
            )
            
            # Stream response
            async for chunk in streaming_ai_service.process_legal_query_stream(ai_request):
                yield f"data: {json.dumps(chunk)}\n\n"
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
            
        except Exception as e:
            error_chunk = {
                "type": "error",
                "content": f"Error processing query: {str(e)}"
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "https://lex-assist.vercel.app",
            "Access-Control-Allow-Credentials": "true"
        }
    )

@router.post("/legal-documents/upload")
async def upload_legal_document(
    file: UploadFile = File(...),
    document_type: str = Form("legal"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user=Depends(verify_user_access),
    supabase=Depends(get_supabase_client)
):
    """Upload and process legal document with RAGFlow"""
    
    # Save uploaded file
    file_path = f"/tmp/{file.filename}"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # Create user-specific knowledge base if doesn't exist
    kb_name = f"user_{current_user.id}_legal_kb"
    
    # Process in background
    background_tasks.add_task(
        process_document_background,
        file_path, kb_name, document_type, current_user.id
    )
    
    return {
        "message": "Document uploaded successfully and is being processed",
        "file_name": file.filename,
        "document_type": document_type
    }

async def process_document_background(file_path: str, kb_name: str, doc_type: str, user_id: str):
    """Background task to process document with RAGFlow"""
    try:
        # Create knowledge base
        kb_result = await legal_ragflow_service.create_legal_knowledge_base(kb_name)
        kb_id = kb_result.get("id")
        
        # Upload document
        await legal_ragflow_service.upload_legal_document(kb_id, file_path, doc_type)
        
        # Clean up temp file
        os.remove(file_path)
        
    except Exception as e:
        print(f"Background processing failed: {e}")