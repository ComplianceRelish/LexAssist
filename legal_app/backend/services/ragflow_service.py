"""
RAGFlow Integration for Advanced Legal Document Processing
"""
import os
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from pydantic import BaseModel

class DocumentChunk(BaseModel):
    content: str
    metadata: Dict[str, Any]
    confidence: float
    page_number: Optional[int] = None

class RAGFlowResponse(BaseModel):
    answer: str
    chunks: List[DocumentChunk]
    confidence: float
    processing_time: float

class LegalRAGFlowService:
    def __init__(self):
        self.ragflow_api_url = os.getenv("RAGFLOW_API_URL", "http://localhost:9380")
        self.ragflow_api_key = os.getenv("RAGFLOW_API_KEY")
        self.deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        
        self.http_client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {self.ragflow_api_key}",
                "Content-Type": "application/json"
            },
            timeout=120.0
        )

    async def create_legal_knowledge_base(self, name: str, description: str = None):
        """Create a knowledge base specifically for legal documents"""
        payload = {
            "name": name,
            "description": description or f"Legal knowledge base for {name}",
            "language": "English",
            "embedding_model": "bge-large-en-v1.5",  # Good for legal text
            "parser_config": {
                "chunk_token_count": 512,  # Optimal for legal paragraphs
                "layout_recognize": True,  # Important for legal document structure
                "table_recognize": True,   # Legal documents often have tables
                "raptor": False  # Can enable for hierarchical chunking
            }
        }
        
        response = await self.http_client.post(
            f"{self.ragflow_api_url}/api/v1/datasets",
            json=payload
        )
        return response.json()

    async def upload_legal_document(self, kb_id: str, file_path: str, document_type: str = "legal"):
        """Upload legal document with specialized parsing"""
        
        # Set document type specific parsing
        parser_configs = {
            "contract": {
                "chunk_token_count": 256,
                "layout_recognize": True,
                "table_recognize": True
            },
            "case_law": {
                "chunk_token_count": 512,
                "layout_recognize": True,
                "raptor": True  # Good for hierarchical legal reasoning
            },
            "statute": {
                "chunk_token_count": 128,
                "layout_recognize": True,
                "table_recognize": True
            },
            "legal": {  # Default
                "chunk_token_count": 384,
                "layout_recognize": True,
                "table_recognize": True
            }
        }
        
        config = parser_configs.get(document_type, parser_configs["legal"])
        
        with open(file_path, 'rb') as file:
            files = {'file': file}
            data = {
                'parser_config': config,
                'kb_id': kb_id
            }
            
            response = await self.http_client.post(
                f"{self.ragflow_api_url}/api/v1/documents",
                files=files,
                data=data
            )
        
        return response.json()

    async def query_legal_documents(
        self, 
        kb_id: str, 
        query: str, 
        jurisdiction: str,
        document_types: List[str] = None
    ) -> RAGFlowResponse:
        """Query legal documents with jurisdiction-aware context"""
        
        # Enhanced query with legal context
        enhanced_query = f"""
        Jurisdiction: {jurisdiction}
        Legal Context: {query}
        
        Please provide a comprehensive legal analysis considering:
        1. Relevant legal principles and precedents
        2. Jurisdiction-specific requirements
        3. Practical implications and recommendations
        4. Citations to source documents
        """
        
        payload = {
            "question": enhanced_query,
            "datasets": [kb_id],
            "llm": {
                "model_name": "deepseek-chat",
                "temperature": 0.1,
                "max_tokens": 2048
            },
            "retrieval_setting": {
                "similarity_threshold": 0.2,
                "vector_similarity_weight": 0.3,
                "top_k": 6,  # Get more chunks for comprehensive legal analysis
                "rerank": True
            }
        }
        
        if document_types:
            payload["document_types"] = document_types
        
        response = await self.http_client.post(
            f"{self.ragflow_api_url}/api/v1/completion",
            json=payload
        )
        
        result = response.json()
        
        # Process RAGFlow response
        chunks = []
        for chunk_data in result.get("chunks", []):
            chunks.append(DocumentChunk(
                content=chunk_data.get("content", ""),
                metadata=chunk_data.get("metadata", {}),
                confidence=chunk_data.get("similarity", 0.0),
                page_number=chunk_data.get("page_number")
            ))
        
        return RAGFlowResponse(
            answer=result.get("answer", ""),
            chunks=chunks,
            confidence=result.get("confidence", 0.0),
            processing_time=result.get("processing_time", 0.0)
        )

    async def close(self):
        await self.http_client.aclose()

# Singleton
legal_ragflow_service = LegalRAGFlowService()