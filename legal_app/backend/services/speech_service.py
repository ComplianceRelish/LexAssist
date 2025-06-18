# legal_app/backend/services/speech_service.py

import whisper
import os
import logging
from typing import Optional, Dict, List
import asyncio
from concurrent.futures import ThreadPoolExecutor
import torch

logger = logging.getLogger(__name__)

class WhisperSpeechService:
    def __init__(self):
        self.model = None
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.model_cache = {}
        self._load_model()
    
    def _load_model(self, model_size=None):
        """Load Whisper model on startup"""
        try:
            # Get model size from environment or use default
            model_size = model_size or os.environ.get("WHISPER_MODEL_SIZE", "base")
            # Available models: tiny (~39 MB), base (~74 MB), small, medium, large
            logger.info(f"Loading Whisper model: {model_size}")
            
            if model_size not in self.model_cache:
                # Check if CUDA is available for GPU acceleration
                device = "cuda" if torch.cuda.is_available() else "cpu"
                logger.info(f"Using device: {device}")
                
                self.model_cache[model_size] = whisper.load_model(model_size, device=device)
                logger.info(f"Whisper model {model_size} loaded successfully on {device}")
            
            self.model = self.model_cache[model_size]
            
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {str(e)}")
            raise
    
    async def transcribe_audio_async(self, audio_file_path: str) -> Dict:
        """Async wrapper for audio transcription"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, 
            self._transcribe_audio_sync, 
            audio_file_path
        )
    
    def _transcribe_audio_sync(self, audio_file_path: str) -> Dict:
        """Synchronous transcription using Whisper"""
        try:
            if not os.path.exists(audio_file_path):
                raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
            
            logger.info(f"Transcribing audio file: {audio_file_path}")
            
            # Transcribe with Whisper
            result = self.model.transcribe(
                audio_file_path,
                
                # Whisper options for legal content
                language="en",  # Set to None for auto-detection
                task="transcribe",  # or "translate"
                
                # Better accuracy settings
                beam_size=5,
                best_of=5,
                temperature=0.0,  # Deterministic output
                
                # Legal-specific improvements
                initial_prompt="Legal case discussion involving courts, laws, and legal proceedings.",
                
                # Word timestamps for better analysis
                word_timestamps=True,
                
                # Suppress common filler words
                suppress_tokens=[-1],
                
                # Better handling of legal terminology
                condition_on_previous_text=True
            )
            
            # Extract useful information
            transcription_result = {
                "text": result["text"].strip(),
                "language": result.get("language", "en"),
                "segments": result.get("segments", []),
                "words": self._extract_words_with_timestamps(result),
                "confidence_score": self._calculate_confidence(result),
                "duration": self._calculate_duration(result),
                "legal_terms_detected": self._detect_legal_terms(result["text"])
            }
            
            logger.info(f"Transcription completed. Text length: {len(result['text'])} characters")
            
            return transcription_result
            
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            raise
    
    def _extract_words_with_timestamps(self, result: Dict) -> List[Dict]:
        """Extract words with timestamps for better analysis"""
        words = []
        for segment in result.get("segments", []):
            for word in segment.get("words", []):
                words.append({
                    "word": word.get("word", "").strip(),
                    "start": word.get("start", 0),
                    "end": word.get("end", 0),
                    "confidence": word.get("probability", 0)
                })
        return words
    
    def _calculate_confidence(self, result: Dict) -> float:
        """Calculate overall confidence score"""
        if not result.get("segments"):
            return 0.0
        
        total_confidence = 0
        segment_count = 0
        
        for segment in result["segments"]:
            if "avg_logprob" in segment:
                total_confidence += segment["avg_logprob"]
                segment_count += 1
        
        if segment_count > 0:
            # Convert log probability to confidence percentage
            avg_logprob = total_confidence / segment_count
            confidence = min(100, max(0, (avg_logprob + 1) * 100))
            return round(confidence, 2)
        
        return 0.0
    
    def _calculate_duration(self, result: Dict) -> float:
        """Calculate audio duration in seconds"""
        if result.get("segments"):
            last_segment = result["segments"][-1]
            return round(last_segment.get("end", 0), 2)
        return 0.0
    
    def _detect_legal_terms(self, text: str) -> List[str]:
        """Detect legal terminology in transcribed text"""
        legal_terms = [
            "plaintiff", "defendant", "court", "judge", "jury", "lawsuit", "litigation",
            "contract", "agreement", "clause", "breach", "damages", "liability",
            "statute", "regulation", "precedent", "jurisdiction", "appeal", "verdict",
            "testimony", "evidence", "witness", "deposition", "subpoena", "injunction",
            "settlement", "mediation", "arbitration", "discovery", "pleading", "motion",
            "brief", "writ", "petition", "complaint", "summons", "affidavit", "bail",
            "custody", "probation", "parole", "sentence", "conviction", "acquittal",
            "indictment", "arraignment", "plea", "felony", "misdemeanor", "tort",
            "negligence", "malpractice", "intellectual property", "patent", "trademark",
            "copyright", "bankruptcy", "foreclosure", "eviction", "lease", "mortgage"
        ]
        
        detected_terms = []
        text_lower = text.lower()
        
        for term in legal_terms:
            if term in text_lower:
                detected_terms.append(term)
        
        return detected_terms
    
    def get_optimal_model_size(self, audio_duration: float) -> str:
        """Choose optimal model based on audio duration and accuracy needs"""
        if audio_duration < 30:  # Short audio
            return "tiny"  # Fastest
        elif audio_duration < 300:  # 5 minutes
            return "base"  # Good balance
        elif audio_duration < 1800:  # 30 minutes
            return "small"  # Better accuracy
        else:
            return "medium"  # Long audio needs better accuracy

# Initialize the service
whisper_service = WhisperSpeechService()