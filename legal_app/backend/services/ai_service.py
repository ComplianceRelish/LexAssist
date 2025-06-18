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
from utils.model_context_protocol import ModelRequest, ModelResponse, LegalModelInterface

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
        
        # Make sure base URL doesn't end with a slash and defaults to correct API endpoint
        base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
        self.deepseek_base_url = base_url.rstrip('/')
        
        self.openai_model = "gpt-4"
        # Default to deepseek-chat if not specified
        self.deepseek_model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        
        # Increased timeout to 120 seconds for long-running completions
        self.http_client = httpx.AsyncClient(timeout=120.0)
        
        # Add validation and logging
        if not self.deepseek_api_key:
            logger.warning("DEEPSEEK_API_KEY not found in environment variables")
        else:
            logger.info(f"DeepSeek API key loaded: {self.deepseek_api_key[:10]}...")
        
        logger.info(f"DeepSeek base URL: {self.deepseek_base_url}")
        logger.info(f"DeepSeek model: {self.deepseek_model}")
        
        # inlegalBERT integration
        self.inlegalbert_available = False
        try:
            # Import the processor directly instead of from legal_endpoints
            from services.inlegalbert_processor import InLegalBERTProcessor
            # Create our own instance if needed
            self.inlegalbert_processor = InLegalBERTProcessor()
            try:
                self.inlegalbert_processor.initialize()
                self.inlegalbert_available = True
                logger.info("✅ inlegalBERT processor initialized and integrated with AI service")
            except Exception as init_error:
                logger.warning(f"⚠️ inlegalBERT processor initialization failed: {init_error}")
                self.inlegalbert_processor = None
        except ImportError as e:
            logger.warning(f"⚠️ Could not import inlegalBERT processor: {e}")
            self.inlegalbert_processor = None
    
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
        """Build user prompt based on query type and enhanced context from inlegalBERT"""
        prompt = f"Query: {request.query}\n\n"
        
        # Process enhanced context if available
        enhanced_context_str = ""
        if request.context:
            try:
                context = json.loads(request.context)
                
                # Add identified statutes if available
                if "statutes" in context and context["statutes"]:
                    enhanced_context_str += "Identified Statutes:\n"
                    for statute in context["statutes"]:
                        enhanced_context_str += f"- {statute['act']} {statute['section']}: {statute['title']}\n"
                    enhanced_context_str += "\n"
                
                # Add identified legal issues if available
                if "legal_issues" in context and context["legal_issues"]:
                    enhanced_context_str += "Legal Issues Identified:\n"
                    for issue in context["legal_issues"]:
                        enhanced_context_str += f"- {issue}\n"
                    enhanced_context_str += "\n"
                
                # Add any other legal entities
                if "legal_entities" in context and context["legal_entities"]:
                    enhanced_context_str += "Other Legal References:\n"
                    for entity in context["legal_entities"]:
                        enhanced_context_str += f"- {entity}\n"
                    enhanced_context_str += "\n"
                
                # Add any additional context
                for key, value in context.items():
                    if key not in ["statutes", "legal_issues", "legal_entities", "preprocessing"]:
                        enhanced_context_str += f"{key}: {value}\n"
                
            except json.JSONDecodeError:
                # If context is not JSON, use as-is
                enhanced_context_str = f"Context: {request.context}\n\n"
        
        if enhanced_context_str:
            prompt += f"Context (Pre-processed by inlegalBERT):\n{enhanced_context_str}\n"
            
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
        """Process legal query using selected AI provider with inlegalBERT preprocessing"""
        # Check if we can use inlegalBERT directly for specialized tasks
        if self.inlegalbert_available and request.query_type in [
            LegalQueryType.STATUTE_IDENTIFICATION, 
            LegalQueryType.TEXT_PROCESSING
        ]:
            logger.info(f"Using inlegalBERT directly for {request.query_type.value}")
            return await self.hybrid_process_query(request)
        
        # For other query types, use inlegalBERT preprocessing + LLM
        if self.inlegalbert_available:
            # Preprocess with inlegalBERT to enhance context
            enhanced_request = await self._enhance_query_with_inlegalbert(request)
            logger.info("Query enhanced with inlegalBERT preprocessing")
            request = enhanced_request
        else:
            logger.info("inlegalBERT not available for preprocessing enhancement")
        
        # Process with LLM
        provider = self._select_provider(request.query_type, request.jurisdiction)
        if provider == AIProvider.DEEPSEEK:
            return await self._query_deepseek(request)
        else:
            return await self._query_openai(request)
    
    async def _enhance_query_with_inlegalbert(self, request: AIRequest) -> AIRequest:
        """Enhance query with inlegalBERT preprocessing to extract legal entities and context"""
        try:
            if not self.inlegalbert_available or not self.inlegalbert_processor:
                logger.warning("InlegalBERT not available for preprocessing")
                return request
            
            # Create a copy of the request to avoid modifying the original
            import copy
            enhanced_request = copy.deepcopy(request)
            
            # Extract context from query using inlegalBERT
            model_request = ModelRequest(
                task_type="statute_identification",
                input_text=request.query,
                context="{}"
            )
            
            logger.info(f"Preprocessing with inlegalBERT: extracting legal entities")
            result = self.inlegalbert_processor.process(model_request)
            
            # Create an enhanced context object
            enhanced_context = {}
            
            # Add original context if exists
            if request.context:
                try:
                    original_context = json.loads(request.context)
                    enhanced_context.update(original_context)
                except json.JSONDecodeError:
                    logger.warning("Original context is not valid JSON, ignoring")
            
            # Add extracted statutes
            if hasattr(result, 'law_sections') and result.law_sections:
                enhanced_context["statutes"] = [
                    {"act": law.act, "section": law.section, "title": law.title}
                    for law in result.law_sections
                ]
            
            # Add extracted legal issues
            if hasattr(result, 'legal_issues') and result.legal_issues:
                enhanced_context["legal_issues"] = result.legal_issues
            
            # Add any other extracted legal entities
            if hasattr(result, 'legal_entities') and result.legal_entities:
                enhanced_context["legal_entities"] = result.legal_entities
            
            # Set the enhanced context in the request
            enhanced_request.context = json.dumps(enhanced_context)
            
            # Add metadata about preprocessing
            enhanced_context["preprocessing"] = {
                "model": "inlegalBERT-" + self.inlegalbert_processor.MODEL_VERSION,
                "timestamp": datetime.now().isoformat(),
                "confidence": getattr(result, 'confidence_score', 0.0)
            }
            
            logger.info(f"Query enhanced with legal context: {len(enhanced_context)} entities")
            return enhanced_request
        
        except Exception as e:
            logger.error(f"Error in inlegalBERT preprocessing: {str(e)}")
            return request  # Return original request on error
            
    async def hybrid_process_query(self, request: AIRequest) -> Dict:
        """Use inlegalBERT to handle specialized Indian legal tasks"""
        try:
            if not self.inlegalbert_available or not self.inlegalbert_processor:
                logger.warning("InlegalBERT not available, falling back to LLM")
                return await self._query_deepseek(request)
            
            # Map AIRequest to ModelRequest for inlegalBERT
            model_request = ModelRequest(
                task_type=request.query_type.value,
                input_text=request.query,
                context=request.context or "{}"
            )
            
            # Process with inlegalBERT
            logger.info(f"Processing with inlegalBERT: {request.query_type.value}")
            result = self.inlegalbert_processor.process(model_request)
            
            # Transform inlegalBERT response to match LLM response format
            response = {
                "content": result.raw_output,
                "model": "inlegalBERT-" + self.inlegalbert_processor.MODEL_VERSION,
                "processing_time": result.processing_time,
                "confidence": result.confidence_score
            }
            
            # Add specialized fields based on task type
            if request.query_type == LegalQueryType.STATUTE_IDENTIFICATION and result.law_sections:
                response["statutes"] = [
                    {"act": law.act, "section": law.section, "title": law.title}
                    for law in result.law_sections
                ]
            
            if request.query_type == LegalQueryType.CASE_ANALYSIS and result.analysis:
                response.update({
                    "case_summary": result.analysis.summary,
                    "legal_issues": result.analysis.issues,
                    "strengths": result.analysis.strengths,
                    "weaknesses": result.analysis.weaknesses,
                    "recommendations": result.analysis.recommendations
                })
            
            return response
            
        except Exception as e:
            logger.error(f"Error in hybrid processing with inlegalBERT: {str(e)}")
            # Fallback to DeepSeek
            return await self._query_deepseek(request)
    
    async def _query_deepseek(self, request: AIRequest) -> Dict:
        """Query DeepSeek API with improved error handling and inlegalBERT enhanced context"""
        try:
            if not self.deepseek_api_key:
                raise ValueError("DEEPSEEK_API_KEY not configured")
            
            system_prompt = self._build_legal_system_prompt(request.jurisdiction, request.user_role)
            user_prompt = self._build_user_prompt(request)
            
            # Check if we have inlegalBERT preprocessing information to include in the payload
            inlegalbert_metadata = None
            if request.context:
                try:
                    context_data = json.loads(request.context)
                    if "preprocessing" in context_data:
                        inlegalbert_metadata = context_data["preprocessing"]
                except json.JSONDecodeError:
                    pass
                
            # Construct model payload
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
            
            # Log the enhanced prompt if inlegalBERT was used
            if inlegalbert_metadata:
                logger.info(f"Sending DeepSeek request with inlegalBERT enhanced context") 
            
            endpoint = f"{self.deepseek_base_url}/v1/chat/completions"
            response = await self.http_client.post(endpoint, json=payload, headers=headers)
            
            if response.status_code != 200:
                error_text = response.text
                raise httpx.HTTPStatusError(f"API returned {response.status_code}: {error_text}", request=response.request, response=response)
            
            result = response.json()
            
            if "choices" not in result or not result["choices"]:
                raise ValueError(f"Invalid response format: {result}")
            
            content = result["choices"][0]["message"]["content"]
            
            # Parse the response and add inlegalBERT metadata if it was used
            parsed_response = self._parse_ai_response(content, request.query_type)
            
            # Add metadata about inlegalBERT preprocessing if it was used
            if inlegalbert_metadata:
                parsed_response["enhanced_with_inlegalbert"] = True
                parsed_response["preprocessing_metadata"] = inlegalbert_metadata
            
            return parsed_response
            
        except httpx.TimeoutException:
            raise Exception("DeepSeek API timeout - request took too long")
        except httpx.HTTPStatusError as e:
            raise Exception(f"DeepSeek API HTTP error: {e}")
        except Exception as e:
            raise Exception(f"DeepSeek API error: {str(e)}")
        except Exception as e:
            logger.error(f"DeepSeek query failed with detailed error: {str(e)}")
            logger.error(f"Request details - Model: {self.deepseek_model}, Endpoint: {self.deepseek_base_url}")
            raise Exception(f"DeepSeek API error: {str(e)}")
    
    async def _query_openai(self, request: AIRequest) -> Dict:
        """Query OpenAI API with inlegalBERT enhanced context"""
        try:
            system_prompt = self._build_legal_system_prompt(request.jurisdiction, request.user_role)
            user_prompt = self._build_user_prompt(request)
            
            # Check for inlegalBERT preprocessing metadata
            inlegalbert_metadata = None
            if request.context:
                try:
                    context_data = json.loads(request.context)
                    if "preprocessing" in context_data:
                        inlegalbert_metadata = context_data["preprocessing"]
                except json.JSONDecodeError:
                    pass
            
            payload = {
                "model": "gpt-4",
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
            
            # Log if using enhanced context
            if inlegalbert_metadata:
                logger.info("Sending OpenAI request with inlegalBERT enhanced context")
            
            response = await self.http_client.post(
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers=headers
            )
            
            response.raise_for_status()
            result = response.json()
            
            content = result["choices"][0]["message"]["content"]
            
            # Parse response and add metadata
            parsed_response = self._parse_ai_response(content, request.query_type)
            
            # Add metadata about inlegalBERT preprocessing if it was used
            if inlegalbert_metadata:
                parsed_response["enhanced_with_inlegalbert"] = True
                parsed_response["preprocessing_metadata"] = inlegalbert_metadata
            
            return parsed_response
            
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
        
        # FIXED: Correct streaming endpoint
        endpoint = f"{self.deepseek_base_url}/chat/completions"
        
        async with self.http_client.stream(
            "POST", 
            endpoint,
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