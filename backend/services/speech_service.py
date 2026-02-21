"""
LexAssist — Speech-to-Text Service
====================================
Enterprise-grade speech pipeline for legal dictation:

1. OpenAI Whisper API for primary transcription
2. Legal domain vocabulary boosting via prompt injection
3. Claude LLM post-correction for legal term accuracy
4. Confidence scoring and word-level metadata
5. Role-based context priming

Architecture:
  Audio (WAV/FLAC) → Whisper API (+ legal prompt) → Raw transcript
  → Claude correction layer → Corrected transcript + confidence data
"""

import io
import os
import re
import time
import tempfile
from typing import Any, Dict, List, Optional, Tuple
from difflib import SequenceMatcher

from backend.config import Config
from backend.utils.logger import setup_logger
from backend.data.legal_vocabulary import (
    build_whisper_prompt,
    build_correction_context,
    COMMON_MISRECOGNITIONS,
    ROLE_CONTEXTS,
)

logger = setup_logger("SpeechService")

# ── Try to load OpenAI SDK ────────────────────────────────────────

try:
    import openai
    _OPENAI_AVAILABLE = True
    logger.info("OpenAI SDK available for Whisper STT")
except ImportError:
    _OPENAI_AVAILABLE = False
    logger.warning("OpenAI SDK not installed — speech features disabled. Install with: pip install openai")

# ── Try to load Anthropic for correction ──────────────────────────

try:
    import anthropic
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    _ANTHROPIC_AVAILABLE = False


# ──────────────────────────────────────────────────────────────────
# Correction System Prompt
# ──────────────────────────────────────────────────────────────────

CORRECTION_SYSTEM_PROMPT = """You are a legal transcript corrector specialising in Indian law. Your task is to fix misrecognised words in a speech-to-text transcript.

**Rules:**
1. Fix misrecognised legal terms, Latin phrases, Indian law references, section numbers, article numbers, act names, court names, and case citations.
2. Fix number-word expansions back to standard legal format (e.g., "section three hundred two" → "Section 302").
3. Preserve the speaker's original meaning — do NOT add, remove, or rephrase content.
4. Fix punctuation and capitalisation for legal readability.
5. If a word is ambiguous, prefer the legal interpretation.
6. Convert spoken citation formats to standard written format (e.g., "AIR 2023 SC 450").

**Response format — return ONLY valid JSON:**
{
  "corrected_text": "The fully corrected transcript text",
  "corrections": [
    {
      "original": "the misrecognised word/phrase",
      "corrected": "the correct word/phrase",
      "confidence": 0.95,
      "reason": "brief explanation"
    }
  ],
  "low_confidence_words": [
    {
      "word": "ambiguous term",
      "position": 42,
      "suggestions": ["option1", "option2"],
      "confidence": 0.6
    }
  ]
}

If no corrections are needed, return the original text with empty arrays."""


class SpeechService:
    """
    Enterprise speech-to-text service for legal dictation.
    
    Uses OpenAI Whisper for transcription with legal vocabulary boosting,
    then runs Claude post-correction for maximum accuracy.
    """

    WHISPER_MODEL = "whisper-1"
    CORRECTION_MODEL = "claude-sonnet-4-20250514"
    MAX_AUDIO_SIZE_MB = 25  # Whisper limit
    SUPPORTED_FORMATS = {"wav", "flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "webm"}

    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        self._whisper_available = False
        self._correction_available = False

        # Initialise OpenAI (Whisper)
        openai_key = Config.OPENAI_API_KEY if hasattr(Config, 'OPENAI_API_KEY') else os.environ.get('OPENAI_API_KEY')
        if _OPENAI_AVAILABLE and openai_key:
            try:
                self.openai_client = openai.OpenAI(api_key=openai_key)
                self._whisper_available = True
                logger.info("Whisper STT service initialised")
            except Exception as e:
                logger.error("OpenAI client init failed: %s", e)
        else:
            if not _OPENAI_AVAILABLE:
                logger.warning("OpenAI SDK not installed")
            elif not openai_key:
                logger.warning("OPENAI_API_KEY not set — Whisper STT disabled")

        # Initialise Anthropic (correction layer)
        claude_key = Config.CLAUDE_API_KEY
        if _ANTHROPIC_AVAILABLE and claude_key:
            try:
                self.anthropic_client = anthropic.Anthropic(api_key=claude_key)
                self._correction_available = True
                logger.info("Claude correction layer initialised")
            except Exception as e:
                logger.error("Anthropic client init failed for correction: %s", e)

        # Build the Whisper prompt once
        self._whisper_prompt = build_whisper_prompt()
        self._correction_vocab = build_correction_context()

    @property
    def is_available(self) -> bool:
        return self._whisper_available

    @property
    def has_correction(self) -> bool:
        return self._correction_available

    # ── Primary Transcription (Whisper) ──────────────────────────

    def transcribe(
        self,
        audio_data: bytes,
        filename: str = "audio.wav",
        language: str = "en",
        user_role: Optional[str] = None,
        mode: str = "dictation",
    ) -> Dict[str, Any]:
        """
        Full speech pipeline: Whisper transcription → Claude correction.
        
        Args:
            audio_data: Raw audio bytes
            filename: Original filename (for format detection)
            language: ISO language code (default: en)
            user_role: Speaker role for context priming
            mode: 'dictation' (longer, more accurate) or 'conversational' (faster)
        
        Returns:
            {
                "raw_transcript": str,
                "corrected_transcript": str,
                "corrections": [...],
                "low_confidence_words": [...],
                "metadata": {
                    "duration_ms": int,
                    "model": str,
                    "language": str,
                    "correction_applied": bool,
                    "word_count": int,
                }
            }
        """
        if not self._whisper_available:
            return {
                "error": "Speech service unavailable. OPENAI_API_KEY not configured.",
                "status": "unavailable",
            }

        start_time = time.time()

        # Validate file format
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "wav"
        if ext not in self.SUPPORTED_FORMATS:
            return {
                "error": f"Unsupported audio format: .{ext}. Use: {', '.join(sorted(self.SUPPORTED_FORMATS))}",
                "status": "invalid_format",
            }

        # Validate file size
        size_mb = len(audio_data) / (1024 * 1024)
        if size_mb > self.MAX_AUDIO_SIZE_MB:
            return {
                "error": f"Audio file too large ({size_mb:.1f} MB). Maximum: {self.MAX_AUDIO_SIZE_MB} MB.",
                "status": "file_too_large",
            }

        # Build role-aware Whisper prompt
        whisper_prompt = self._whisper_prompt
        if user_role and user_role in ROLE_CONTEXTS:
            whisper_prompt = ROLE_CONTEXTS[user_role] + " " + whisper_prompt

        try:
            # ── Step 1: Whisper Transcription ──
            audio_file = io.BytesIO(audio_data)
            audio_file.name = filename

            whisper_params = {
                "model": self.WHISPER_MODEL,
                "file": audio_file,
                "language": language,
                "prompt": whisper_prompt,
                "response_format": "verbose_json",
                "temperature": 0.0,  # Most deterministic
            }

            # Use word-level timestamps for confidence scoring
            whisper_params["timestamp_granularities"] = ["word", "segment"]

            logger.info("Sending audio to Whisper (%s, %.1f MB, lang=%s)", filename, size_mb, language)
            response = self.openai_client.audio.transcriptions.create(**whisper_params)

            raw_transcript = response.text.strip() if hasattr(response, 'text') else str(response).strip()

            # Extract word-level data if available
            words_data = []
            segments_data = []
            if hasattr(response, 'words') and response.words:
                words_data = [
                    {
                        "word": w.word if hasattr(w, 'word') else str(w),
                        "start": getattr(w, 'start', 0),
                        "end": getattr(w, 'end', 0),
                    }
                    for w in response.words
                ]
            if hasattr(response, 'segments') and response.segments:
                segments_data = [
                    {
                        "text": s.text if hasattr(s, 'text') else str(s),
                        "start": getattr(s, 'start', 0),
                        "end": getattr(s, 'end', 0),
                        "avg_logprob": getattr(s, 'avg_logprob', 0),
                        "no_speech_prob": getattr(s, 'no_speech_prob', 0),
                        "compression_ratio": getattr(s, 'compression_ratio', 0),
                    }
                    for s in response.segments
                ]

            whisper_duration = (time.time() - start_time) * 1000

            if not raw_transcript:
                return {
                    "raw_transcript": "",
                    "corrected_transcript": "",
                    "corrections": [],
                    "low_confidence_words": [],
                    "metadata": {
                        "duration_ms": round(whisper_duration),
                        "model": self.WHISPER_MODEL,
                        "language": language,
                        "correction_applied": False,
                        "word_count": 0,
                        "status": "empty_transcript",
                    },
                }

            # ── Step 2: Quick rule-based fixes ──
            rule_fixed = self._apply_rule_corrections(raw_transcript)

            # ── Step 3: Claude LLM Post-Correction ──
            correction_result = None
            corrected_transcript = rule_fixed
            corrections = []
            low_confidence_words = []

            if self._correction_available and len(raw_transcript.split()) >= 3:
                correction_result = self._llm_correct(
                    rule_fixed,
                    user_role=user_role,
                )
                if correction_result:
                    corrected_transcript = correction_result.get("corrected_text", rule_fixed)
                    corrections = correction_result.get("corrections", [])
                    low_confidence_words = correction_result.get("low_confidence_words", [])

            # ── Step 4: Compute segment confidence scores ──
            segment_confidences = self._compute_confidence_scores(segments_data)

            total_duration = (time.time() - start_time) * 1000

            result = {
                "raw_transcript": raw_transcript,
                "corrected_transcript": corrected_transcript,
                "corrections": corrections,
                "low_confidence_words": low_confidence_words,
                "segments": segments_data[:50],  # Limit for response size
                "words": words_data[:200],
                "segment_confidences": segment_confidences,
                "metadata": {
                    "duration_ms": round(total_duration),
                    "whisper_ms": round(whisper_duration),
                    "model": self.WHISPER_MODEL,
                    "correction_model": self.CORRECTION_MODEL if correction_result else None,
                    "language": language,
                    "correction_applied": correction_result is not None,
                    "corrections_count": len(corrections),
                    "low_confidence_count": len(low_confidence_words),
                    "word_count": len(corrected_transcript.split()),
                    "user_role": user_role,
                    "mode": mode,
                    "status": "success",
                },
            }

            logger.info(
                "Transcription complete: %d words, %d corrections, %.0fms total",
                result["metadata"]["word_count"],
                len(corrections),
                total_duration,
            )
            return result

        except openai.APIError as e:
            logger.error("Whisper API error: %s", e)
            return {"error": f"Transcription failed: {str(e)}", "status": "api_error"}
        except Exception as e:
            logger.error("Unexpected transcription error: %s", e)
            return {"error": f"Transcription failed: {str(e)}", "status": "error"}

    # ── Rule-Based Quick Fixes ────────────────────────────────────

    def _apply_rule_corrections(self, text: str) -> str:
        """
        Fast rule-based corrections for common STT mistakes.
        Runs before the LLM layer for efficiency.
        """
        corrected = text

        # Fix known misrecognitions using fuzzy matching
        for correct_term, variants in COMMON_MISRECOGNITIONS.items():
            for variant in variants:
                # Case-insensitive replacement
                pattern = re.compile(re.escape(variant), re.IGNORECASE)
                corrected = pattern.sub(correct_term, corrected)

        # Fix section number formatting
        # "section 3 0 2" → "Section 302"
        corrected = re.sub(
            r'\bsection\s+(\d)\s+(\d)\s+(\d)\b',
            lambda m: f"Section {m.group(1)}{m.group(2)}{m.group(3)}",
            corrected,
            flags=re.IGNORECASE,
        )
        # "section 4 9 8 a" → "Section 498A"
        corrected = re.sub(
            r'\bsection\s+(\d)\s+(\d)\s+(\d)\s+([a-zA-Z])\b',
            lambda m: f"Section {m.group(1)}{m.group(2)}{m.group(3)}{m.group(4).upper()}",
            corrected,
            flags=re.IGNORECASE,
        )

        # Fix article number formatting
        corrected = re.sub(
            r'\barticle\s+(\d)\s+(\d)\b',
            lambda m: f"Article {m.group(1)}{m.group(2)}",
            corrected,
            flags=re.IGNORECASE,
        )
        corrected = re.sub(
            r'\barticle\s+(\d)\s+(\d)\s+(\d)\b',
            lambda m: f"Article {m.group(1)}{m.group(2)}{m.group(3)}",
            corrected,
            flags=re.IGNORECASE,
        )

        # Capitalise key legal terms
        legal_caps = {
            r'\b(fir)\b': 'FIR',
            r'\b(crpc)\b': 'CrPC',
            r'\b(ipc)\b': 'IPC',
            r'\b(cpc)\b': 'CPC',
            r'\b(bns)\b': 'BNS',
            r'\b(bnss)\b': 'BNSS',
            r'\b(bsa)\b': 'BSA',
            r'\b(scc)\b': 'SCC',
            r'\b(slp)\b': 'SLP',
            r'\b(nclt)\b': 'NCLT',
            r'\b(nclat)\b': 'NCLAT',
            r'\b(rera)\b': 'RERA',
            r'\b(ngt)\b': 'NGT',
        }
        for pattern, replacement in legal_caps.items():
            corrected = re.sub(pattern, replacement, corrected, flags=re.IGNORECASE)

        return corrected

    # ── LLM Post-Correction ──────────────────────────────────────

    def _llm_correct(
        self,
        transcript: str,
        user_role: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Run Claude to correct legal terminology in the transcript.
        Returns structured correction data or None on failure.
        """
        if not self._correction_available:
            return None

        user_prompt = f"Correct this legal transcript:\n\n\"{transcript}\""

        if user_role and user_role in ROLE_CONTEXTS:
            user_prompt += f"\n\nSpeaker context: {ROLE_CONTEXTS[user_role]}"

        user_prompt += f"\n\nReference vocabulary:\n{self._correction_vocab}"

        try:
            response = self.anthropic_client.messages.create(
                model=self.CORRECTION_MODEL,
                max_tokens=4096,
                system=CORRECTION_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
                temperature=0.1,  # Very deterministic for correction
            )

            text = response.content[0].text.strip()

            # Extract JSON
            import json
            # Try to find JSON in the response
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
                return result
            else:
                logger.warning("Claude correction returned non-JSON response")
                return {"corrected_text": transcript, "corrections": [], "low_confidence_words": []}

        except Exception as e:
            logger.error("LLM correction failed: %s", e)
            return None

    # ── Confidence Scoring ────────────────────────────────────────

    def _compute_confidence_scores(self, segments: List[Dict]) -> List[Dict]:
        """
        Compute confidence scores from Whisper segment data.
        avg_logprob < -1.0 indicates low confidence.
        no_speech_prob > 0.6 indicates likely silence/noise.
        """
        scored = []
        for seg in segments:
            avg_logprob = seg.get("avg_logprob", 0)
            no_speech = seg.get("no_speech_prob", 0)

            # Convert log probability to a 0-1 confidence score
            # avg_logprob is typically between -2.0 (low) and 0 (high)
            import math
            confidence = min(1.0, max(0.0, math.exp(avg_logprob)))

            # Penalise high no-speech probability
            if no_speech > 0.5:
                confidence *= (1.0 - no_speech)

            level = "high" if confidence > 0.8 else "medium" if confidence > 0.5 else "low"

            scored.append({
                "text": seg.get("text", ""),
                "start": seg.get("start", 0),
                "end": seg.get("end", 0),
                "confidence": round(confidence, 3),
                "level": level,
            })

        return scored

    # ── Health Check ──────────────────────────────────────────────

    def get_status(self) -> Dict[str, Any]:
        """Return service health status."""
        return {
            "whisper_stt": "ready" if self._whisper_available else "unavailable",
            "correction_layer": "ready" if self._correction_available else "unavailable",
            "whisper_model": self.WHISPER_MODEL,
            "correction_model": self.CORRECTION_MODEL if self._correction_available else None,
            "supported_formats": sorted(self.SUPPORTED_FORMATS),
            "max_file_size_mb": self.MAX_AUDIO_SIZE_MB,
        }
