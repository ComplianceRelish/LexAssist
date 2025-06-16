# legal_app/backend/services/ai_service.py

import asyncio
import json
import logging
import os
from typing import Dict, List, Optional, AsyncGenerator
from enum import Enum
from pydantic import BaseModel
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)

class LegalQueryType(Enum):
    CASE_ANALYSIS = "case_analysis"
    LAW_RESEARCH = "law_research"
    PRECEDENT_SEARCH = "precedent_search"
    TEXT_PROCESSING = "text_processing"
    DOCUMENT_REVIEW = "document_review"

class AIProvider(Enum):
    OPENAI = "openai"
    DEEPSEEK = "deepseek"

class AIRequest(BaseModel):
    query: str
    query_type: LegalQueryType
    jurisdiction: str = "IN"
    user_role: str = "lawyer"
    context: Optional[str] = None
    documents: Optional[List[Dict]] = None
    legal_embeddings: Optional[Dict] = None

class LegalAIService:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        self.deepseek_base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
        
        self.openai_model = "gpt-4"
        self.deepseek_model = "deepseek-chat"
        
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    def _select_provider(self, query_type: LegalQueryType, jurisdiction: str) -> AIProvider:
        """Select the best AI provider based on query type and jurisdiction"""
        # For Indian legal queries, prefer DeepSeek for cost efficiency
        if jurisdiction == "IN" and query_type in [LegalQueryType.LAW_RESEARCH, LegalQueryType.CASE_ANALYSIS]:
            return AIProvider.DEEPSEEK
        
        # For complex analysis, prefer OpenAI
        if query_type in [LegalQueryType.DOCUMENT_REVIEW, LegalQueryType.TEXT_PROCESSING]:
            return AIProvider.OPENAI
        
        # Default to DeepSeek for cost efficiency
        return AIProvider.DEEPSEEK
    
    def _build_legal_system_prompt(self, jurisdiction: str, user_role: str) -> str:
        """Build comprehensive legal system prompt"""
        return f"""
        You are an expert AI legal assistant specialized in {jurisdiction} law, assisting a {user_role}.
        
        Your expertise includes:
        - Indian legal system, acts, and regulations
        - Case law analysis and precedent research
        - Legal document drafting and review
        - Court procedures and legal strategy
        
        Guidelines:
        1. Provide accurate, well-researched legal information
        2. Cite relevant laws, sections, and case precedents
        3. Use proper legal terminology and formatting
        4. Consider jurisdiction-specific nuances
        5. Maintain professional legal standards
        6. Provide practical, actionable advice
        7. Structure responses clearly with headings and bullet points
        8. Include confidence levels for legal opinions
        
        Always ensure your responses are:
        - Legally sound and well-researched
        - Practical and implementable
        - Properly cited with legal authorities
        - Formatted for legal professional use
        """
    
    def _build_user_prompt(self, request: AIRequest) -> str:
        """Build detailed user prompt based on request"""
        prompt = f"Legal Query: {request.query}\n\n"
        
        if request.context:
            prompt += f"Context: {request.context}\n\n"
        
        if request.documents:
            prompt += f"Related Documents/Cases: {json.dumps(request.documents, indent=2)}\n\n"
        
        # Add specific instructions based on query type
        if request.query_type == LegalQueryType.CASE_ANALYSIS:
            prompt += """
            Please provide a comprehensive case analysis including:
            1. Case Summary
            2. Key Legal Issues
            3. Applicable Laws and Sections
            4. Strengths and Weaknesses
            5. Legal Strategy Recommendations
            6. Timeline Estimate
            7. Success Probability Assessment
            8. Procedural Steps
            9. Evidence Requirements
            10. Potential Defenses/Counter-arguments
            """
        
        elif request.query_type == LegalQueryType.LAW_RESEARCH:
            prompt += """
            Please provide detailed law research including:
            1. Relevant Acts and Statutes
            2. Specific Sections and Provisions
            3. Recent Amendments
            4. Interpretation Guidelines
            5. Practical Applications
            6. Related Regulations
            """
        
        elif request.query_type == LegalQueryType.PRECEDENT_SEARCH:
            prompt += """
            Please identify relevant precedent cases including:
            1. Similar Case Names and Citations
            2. Court Levels and Jurisdictions
            3. Key Facts and Legal Principles
            4. Judgments and Ratios
            5. Applicability to Current Case
            6. Distinguishing Factors
            """
        
        elif request.query_type == LegalQueryType.TEXT_PROCESSING:
            prompt += """
            Please process and structure the text to:
            1. Improve clarity and legal formatting
            2. Identify key legal issues
            3. Suggest appropriate categorization
            4. Extract important facts
            5. Recommend next steps
            """
        
        return prompt
    
    async def process_legal_query(self, request: AIRequest) -> Dict:
        """Process legal query using selected AI provider"""
        provider = self._select_provider(request.query_type, request.jurisdiction)
        
        if provider == AIProvider.DEEPSEEK:
            return await self._query_deepseek(request)
        else:
            return await self._query_openai(request)
    
    async def _query_deepseek(self, request: AIRequest) -> Dict:
        """Query DeepSeek API"""
        try:
            system_prompt = self._build_legal_system_prompt(request.jurisdiction, request.user_role)
            user_prompt = self._build_user_prompt(request)
            
            payload = {
                "model": self.deepseek_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 4000
            }
            
            headers = {
                "Authorization": f"Bearer {self.deepseek_api_key}",
                "Content-Type": "application/json"
            }
            
            response = await self.http_client.post(
                f"{self.deepseek_base_url}/chat/completions",
                json=payload,
                headers=headers
            )
            
            response.raise_for_status()
            result = response.json()
            
            content = result["choices"][0]["message"]["content"]
            
            # Parse and structure the response
            return self._parse_ai_response(content, request.query_type)
            
        except Exception as e:
            logger.error(f"DeepSeek query failed: {str(e)}")
            raise
    
    async def _query_openai(self, request: AIRequest) -> Dict:
        """Query OpenAI API"""
        try:
            system_prompt = self._build_legal_system_prompt(request.jurisdiction, request.user_role)
            user_prompt = self._build_user_prompt(request)
            
            payload = {
                "model": self.openai_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 4000
            }
            
            headers = {
                "Authorization": f"Bearer {self.openai_api_key}",
                "Content-Type": "application/json"
            }
            
            response = await self.http_client.post(
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers=headers
            )
            
            response.raise_for_status()
            result = response.json()
            
            content = result["choices"][0]["message"]["content"]
            
            # Parse and structure the response
            return self._parse_ai_response(content, request.query_type)
            
        except Exception as e:
            logger.error(f"OpenAI query failed: {str(e)}")
            raise
    
    def _parse_ai_response(self, content: str, query_type: LegalQueryType) -> Dict:
        """Parse AI response based on query type"""
        # Basic parsing - you can enhance this with more sophisticated NLP
        response = {
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "query_type": query_type.value
        }
        
        # Add structured parsing based on query type
        if query_type == LegalQueryType.CASE_ANALYSIS:
            response.update(self._parse_case_analysis(content))
        elif query_type == LegalQueryType.LAW_RESEARCH:
            response.update(self._parse_law_research(content))
        elif query_type == LegalQueryType.TEXT_PROCESSING:
            response.update(self._parse_text_processing(content))
        
        return response
    
    def _parse_case_analysis(self, content: str) -> Dict:
        """Parse case analysis response"""
        # Simple parsing - enhance with regex or NLP for better extraction
        return {
            "case_summary": self._extract_section(content, "Case Summary", "Key Legal Issues"),
            "legal_issues": self._extract_list_section(content, "Legal Issues"),
            "strengths": self._extract_list_section(content, "Strengths"),
            "weaknesses": self._extract_list_section(content, "Weaknesses"),
            "legal_strategy": self._extract_section(content, "Legal Strategy", "Timeline"),
            "timeline_estimate": self._extract_section(content, "Timeline", "Success Probability"),
            "success_probability": self._extract_probability(content),
            "procedural_steps": self._extract_list_section(content, "Procedural Steps"),
            "evidence_requirements": self._extract_list_section(content, "Evidence"),
        }
    
    def _parse_law_research(self, content: str) -> Dict:
        """Parse law research response"""
        return {
            "relevant_acts": self._extract_list_section(content, "Acts"),
            "sections": self._extract_list_section(content, "Sections"),
            "amendments": self._extract_section(content, "Amendments", "Guidelines"),
            "guidelines": self._extract_section(content, "Guidelines", "Applications")
        }
    
    def _parse_text_processing(self, content: str) -> Dict:
        """Parse text processing response"""
        return {
            "formatted_text": self._extract_section(content, "Formatted", "Issues"),
            "suggested_title": self._extract_section(content, "Title", "Case Type"),
            "suggested_case_type": self._extract_section(content, "Case Type", "Court"),
            "suggested_court": self._extract_section(content, "Court", "Issues"),
            "key_issues": self._extract_list_section(content, "Issues"),
            "relevant_facts": self._extract_list_section(content, "Facts")
        }
    
    def _extract_section(self, content: str, start_marker: str, end_marker: str = None) -> str:
        """Extract section between markers"""
        try:
            start_idx = content.lower().find(start_marker.lower())
            if start_idx == -1:
                return ""
            
            start_idx = content.find(":", start_idx) + 1
            
            if end_marker:
                end_idx = content.lower().find(end_marker.lower(), start_idx)
                if end_idx != -1:
                    return content[start_idx:end_idx].strip()
            
            # If no end marker or not found, take reasonable chunk
            return content[start_idx:start_idx+500].strip()
        except:
            return ""
    
    def _extract_list_section(self, content: str, marker: str) -> List[str]:
        """Extract list items from section"""
        section_text = self._extract_section(content, marker)
        if not section_text:
            return []
        
        # Simple list extraction - enhance as needed
        lines = section_text.split('\n')
        items = []
        for line in lines:
            line = line.strip()
            if line.startswith(('-', '•', '*', '1.', '2.', '3.')):
                items.append(line.lstrip('-•*123456789. '))
        
        return items[:10]  # Limit to 10 items
    
    def _extract_probability(self, content: str) -> float:
        """Extract probability percentage"""
        import re
        # Look for percentage patterns
        pattern = r'(\d+(?:\.\d+)?)%'
        matches = re.findall(pattern, content.lower())
        if matches:
            try:
                return float(matches[0]) / 100
            except:
                pass
        return 0.7  # Default probability

class StreamingAIService(LegalAIService):
    async def process_legal_query_stream(self, request: AIRequest) -> AsyncGenerator[Dict, None]:
        """Process legal query with streaming response"""
        
        if self._select_provider(request.query_type, request.jurisdiction) == AIProvider.DEEPSEEK:
            async for chunk in self._stream_deepseek(request):
                yield chunk
        else:
            async for chunk in self._stream_openai(request):
                yield chunk

    async def _stream_deepseek(self, request: AIRequest) -> AsyncGenerator[Dict, None]:
        """Stream response from DeepSeek"""
        system_prompt = self._build_legal_system_prompt(request.jurisdiction, request.user_role)
        user_prompt = self._build_user_prompt(request)
        
        payload = {
            "model": self.deepseek_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 4000,
            "stream": True  # Enable streaming
        }
        
        headers = {
            "Authorization": f"Bearer {self.deepseek_api_key}",
            "Content-Type": "application/json"
        }
        
        async with self.http_client.stream(
            "POST", 
            f"{self.deepseek_base_url}/chat/completions",
            json=payload,
            headers=headers
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]  # Remove "data: " prefix
                    if data.strip() == "[DONE]":
                        break
                    
                    try:
                        chunk_data = json.loads(data)
                        if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                            delta = chunk_data["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield {
                                    "type": "content",
                                    "content": delta["content"],
                                    "provider": "deepseek"
                                }
                    except json.JSONDecodeError:
                        continue

    async def _stream_openai(self, request: AIRequest) -> AsyncGenerator[Dict, None]:
        """Stream response from OpenAI"""
        system_prompt = self._build_legal_system_prompt(request.jurisdiction, request.user_role)
        user_prompt = self._build_user_prompt(request)
        
        payload = {
            "model": self.openai_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 4000,
            "stream": True
        }
        
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }
        
        async with self.http_client.stream(
            "POST", 
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers=headers
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        break
                    
                    try:
                        chunk_data = json.loads(data)
                        if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                            delta = chunk_data["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield {
                                    "type": "content",
                                    "content": delta["content"],
                                    "provider": "openai"
                                }
                    except json.JSONDecodeError:
                        continue

# Create streaming instance
streaming_ai_service = StreamingAIService()