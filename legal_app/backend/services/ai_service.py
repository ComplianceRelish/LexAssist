# Add to legal_app/backend/services/ai_service.py

class StreamingAIService(LegalAIService):
    async def process_legal_query_stream(self, request: AIRequest):
        """Process legal query with streaming response"""
        
        if self._select_provider(request.query_type, request.jurisdiction) == AIProvider.DEEPSEEK:
            async for chunk in self._stream_deepseek(request):
                yield chunk
        else:
            async for chunk in self._stream_openai(request):
                yield chunk

    async def _stream_deepseek(self, request: AIRequest):
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
        
        async with self.http_client.stream(
            "POST", 
            f"{self.deepseek_base_url}/chat/completions",
            json=payload
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]  # Remove "data: " prefix
                    if data.strip() == "[DONE]":
                        break
                    
                    try:
                        import json
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

# Create streaming instance
streaming_ai_service = StreamingAIService()