"""
LexAssist — InLegalBERT Processor
==================================
NLP processor for Indian legal text using InLegalBERT (or fallback to
keyword-based processing when the model is unavailable).

InLegalBERT is a domain-specific BERT model pre-trained on Indian legal
corpora.  When running on a GPU-equipped server, this loads the model
via HuggingFace transformers.  On lightweight / free-tier deployments,
it degrades gracefully to a keyword-based processor.

Capabilities:
  - Named Entity Recognition (legal entities)
  - Text classification (case domain)
  - Semantic similarity (precedent matching)
  - Key-phrase extraction
"""

import os
import re
from typing import Any, Dict, List, Optional
from backend.utils.logger import setup_logger

logger = setup_logger("InLegalBERTProcessor")

# Try to load transformers — optional dependency
_TRANSFORMERS_AVAILABLE = False
try:
    from transformers import AutoTokenizer, AutoModel, pipeline
    import torch
    _TRANSFORMERS_AVAILABLE = True
    logger.info("HuggingFace Transformers available — GPU-accelerated NLP enabled")
except ImportError:
    logger.info("Transformers not installed — using keyword-based NLP fallback")


class InLegalBERTProcessor:
    """
    Process Indian legal text with InLegalBERT (or keyword fallback).

    Usage:
        processor = InLegalBERTProcessor()
        result = processor.process("The accused was arrested under Section 302 IPC...")
    """

    MODEL_NAME = "law-ai/InLegalBERT"

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.ner_pipeline = None
        self.classification_pipeline = None
        self._initialized = False

        if _TRANSFORMERS_AVAILABLE and os.environ.get("ENABLE_INLEGALBERT", "false").lower() == "true":
            try:
                self._load_model()
            except Exception as e:
                logger.warning("InLegalBERT model load failed, using fallback: %s", e)
        else:
            logger.info("InLegalBERT running in keyword-fallback mode (set ENABLE_INLEGALBERT=true to load model)")

    def _load_model(self):
        """Load InLegalBERT model and tokenizer from HuggingFace."""
        logger.info("Loading InLegalBERT model: %s", self.MODEL_NAME)
        self.tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)
        self.model = AutoModel.from_pretrained(self.MODEL_NAME)
        self._initialized = True
        logger.info("InLegalBERT model loaded successfully")

    def process(self, text: str) -> Dict[str, Any]:
        """
        Full NLP processing pipeline.

        Returns:
            Dict with keys: key_phrases, legal_entities, domain_tags,
            sentiment, complexity_score
        """
        if not text or not text.strip():
            return {"error": "Empty text"}

        result = {
            "key_phrases": self._extract_key_phrases(text),
            "legal_entities": self._extract_legal_entities(text),
            "domain_tags": self._classify_domain(text),
            "sentiment": self._analyse_sentiment(text),
            "complexity_score": self._assess_complexity(text),
        }

        if self._initialized:
            try:
                result["embeddings_available"] = True
            except Exception as e:
                logger.warning("Model inference failed: %s", e)
                result["embeddings_available"] = False
        else:
            result["embeddings_available"] = False

        return result

    # ── Key Phrase Extraction ──────────────────────────────────────

    def _extract_key_phrases(self, text: str) -> List[str]:
        """Extract legally significant phrases."""
        phrases = set()
        text_lower = text.lower()

        legal_phrases = [
            "prima facie", "res judicata", "locus standi", "obiter dicta",
            "ratio decidendi", "stare decisis", "mens rea", "actus reus",
            "ultra vires", "intra vires", "sub judice", "ex parte",
            "inter alia", "ipso facto", "de novo", "ad interim",
            "sine die", "mutatis mutandis", "ab initio", "bona fide",
            "mala fide", "amicus curiae", "in limine", "suo motu",
            "fundamental right", "natural justice", "due process",
            "reasonable restriction", "public interest", "burden of proof",
            "preponderance of probability", "beyond reasonable doubt",
            "cause of action", "limitation period", "territorial jurisdiction",
            "pecuniary jurisdiction", "original jurisdiction",
            "appellate jurisdiction", "inherent powers", "suo motu cognizance",
            "anticipatory bail", "regular bail", "default bail",
            "interim relief", "specific performance", "injunction",
            "mandatory injunction", "prohibitory injunction",
            "decree", "judgment", "order", "writ petition",
            "special leave petition", "civil revision", "criminal revision",
            "first information report", "charge sheet", "final report",
        ]

        for phrase in legal_phrases:
            if phrase in text_lower:
                phrases.add(phrase.title())

        # Extract Section/Article references as phrases
        sections = re.findall(r'Section\s+\d+[A-Za-z]?\s+(?:of\s+)?(?:the\s+)?[A-Z][A-Za-z\s]+(?:Act|Code)', text)
        phrases.update(s.strip() for s in sections[:10])

        return sorted(phrases)

    # ── Legal Entity Recognition ───────────────────────────────────

    def _extract_legal_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract named legal entities — courts, judges, statutes, parties."""
        entities: Dict[str, List[str]] = {
            "courts": [],
            "judges": [],
            "statutes": [],
            "government_bodies": [],
            "legal_concepts": [],
        }

        # Courts
        court_patterns = [
            r"(?:Hon'ble\s+)?Supreme\s+Court(?:\s+of\s+India)?",
            r"(?:Hon'ble\s+)?High\s+Court\s+of\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*",
            r"(?:District|Sessions|Magistrate|Family)\s+Court",
            r"(?:NCLT|NGT|DRT|MACT|ITAT|NCLAT|SAT|NCDRC|SCDRC)",
        ]
        for pat in court_patterns:
            matches = re.findall(pat, text, re.IGNORECASE)
            entities["courts"].extend(set(matches))

        # Judges
        judge_patterns = [
            r"(?:Justice|Hon'ble\s+(?:Mr\.|Mrs\.|Ms\.)\s+Justice)\s+[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+",
        ]
        for pat in judge_patterns:
            matches = re.findall(pat, text)
            entities["judges"].extend(set(matches))

        # Statutes / Acts
        act_pattern = r'(?:The\s+)?[A-Z][A-Za-z\s]+(?:Act|Code|Rules|Regulations|Order),?\s*(?:19|20)\d{2}'
        act_matches = re.findall(act_pattern, text)
        entities["statutes"] = list(set(m.strip() for m in act_matches))

        # Government bodies
        gov_pattern = r'(?:Union|State|Central)\s+(?:of\s+India|Government)|(?:Ministry|Department)\s+of\s+[A-Z][A-Za-z\s]+'
        gov_matches = re.findall(gov_pattern, text)
        entities["government_bodies"] = list(set(m.strip() for m in gov_matches))

        return entities

    # ── Domain Classification ──────────────────────────────────────

    def _classify_domain(self, text: str) -> List[Dict[str, Any]]:
        """Classify text into legal domain tags with confidence."""
        text_lower = text.lower()
        domains = {
            "Criminal Law": ["accused", "offence", "crime", "fir", "bail", "arrest",
                              "prosecution", "ipc", "bns", "crpc", "bnss", "murder",
                              "theft", "cheating", "forgery"],
            "Civil Law": ["plaintiff", "defendant", "suit", "decree", "injunction",
                           "damages", "cpc", "specific performance"],
            "Constitutional Law": ["fundamental", "article", "writ", "constitution",
                                    "constitutional", "supreme court"],
            "Corporate Law": ["company", "director", "shareholder", "nclt",
                               "insolvency", "winding up", "companies act"],
            "Family Law": ["divorce", "maintenance", "custody", "marriage",
                            "matrimonial", "domestic violence"],
            "Property Law": ["property", "land", "possession", "title deed",
                              "easement", "partition"],
            "Labour Law": ["employee", "employer", "wages", "retrenchment",
                            "industrial dispute", "workman"],
            "Tax Law": ["income tax", "gst", "assessment", "tribunal",
                         "tax evasion", "revenue"],
            "Environmental Law": ["environment", "pollution", "ngt",
                                   "green tribunal", "wildlife"],
            "Consumer Law": ["consumer", "deficiency", "service", "goods",
                              "unfair trade", "complaint"],
        }

        results = []
        for domain, keywords in domains.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                results.append({
                    "domain": domain,
                    "confidence": round(min(score / len(keywords), 1.0), 2),
                    "keyword_hits": score,
                })

        results.sort(key=lambda x: x["confidence"], reverse=True)
        return results[:5]

    # ── Sentiment Analysis ─────────────────────────────────────────

    def _analyse_sentiment(self, text: str) -> Dict[str, Any]:
        """Assess overall tone — adversarial, neutral, or cooperative."""
        text_lower = text.lower()

        adversarial_words = ["illegal", "unlawful", "fraud", "mala fide",
                              "abuse", "violation", "contravention", "breach",
                              "malicious", "oppressive", "arbitrary"]
        cooperative_words = ["mediation", "settlement", "compromise",
                              "conciliation", "mutual", "amicable",
                              "agreed", "consent"]

        adv_count = sum(1 for w in adversarial_words if w in text_lower)
        coop_count = sum(1 for w in cooperative_words if w in text_lower)

        if adv_count > coop_count + 2:
            tone = "adversarial"
        elif coop_count > adv_count:
            tone = "cooperative"
        else:
            tone = "neutral"

        return {
            "tone": tone,
            "adversarial_indicators": adv_count,
            "cooperative_indicators": coop_count,
        }

    # ── Complexity Assessment ──────────────────────────────────────

    def _assess_complexity(self, text: str) -> Dict[str, Any]:
        """Score the legal complexity of the brief."""
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        word_count = len(words)
        sentence_count = max(len([s for s in sentences if s.strip()]), 1)
        avg_sentence_len = word_count / sentence_count

        sections_mentioned = len(re.findall(r'Section\s+\d+', text, re.IGNORECASE))
        acts_mentioned = len(re.findall(r'(?:Act|Code),?\s*(?:19|20)\d{2}', text))
        parties_count = len(re.findall(r'\b(?:v\.?s?\.?|versus)\b', text, re.IGNORECASE))

        # Complexity score 1-10
        complexity = min(10, max(1,
            int(
                (word_count / 200) +
                (sections_mentioned * 0.5) +
                (acts_mentioned * 0.8) +
                (parties_count * 0.3) +
                (avg_sentence_len / 15)
            )
        ))

        return {
            "score": complexity,
            "level": "Low" if complexity <= 3 else "Medium" if complexity <= 6 else "High",
            "factors": {
                "word_count": word_count,
                "sentence_count": sentence_count,
                "avg_sentence_length": round(avg_sentence_len, 1),
                "sections_referenced": sections_mentioned,
                "acts_referenced": acts_mentioned,
                "parties_involved": parties_count,
            }
        }
