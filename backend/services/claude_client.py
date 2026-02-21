"""
LexAssist — Claude AI Client
==============================
Enterprise-grade integration with Anthropic's Claude API for advanced
Indian legal analysis, conversational AI, and document drafting.

Features:
  - Deep legal brief analysis with structured JSON output
  - Streaming conversational chat with context awareness
  - Legal document drafting (notices, petitions, applications)
  - Maintains conversation history per session
"""

import json
import re
from typing import Any, Dict, Generator, List, Optional
from backend.config import Config
from backend.utils.logger import setup_logger

logger = setup_logger("ClaudeClient")

# Try to load anthropic — required dependency
try:
    import anthropic
    _ANTHROPIC_AVAILABLE = True
    logger.info("Anthropic SDK available")
except ImportError:
    _ANTHROPIC_AVAILABLE = False
    logger.warning("Anthropic SDK not installed — AI features disabled")


# ──────────────────────────────────────────────────────────────────────
# System prompts
# ──────────────────────────────────────────────────────────────────────

LEGAL_ANALYST_SYSTEM = """You are **LexAssist AI**, an elite Indian legal research assistant built for practicing advocates, lawyers, and law students in India. You have deep expertise across the full spectrum of Indian law:

**Core Codes:**
- Indian Penal Code, 1860 (IPC) / Bharatiya Nyaya Sanhita, 2023 (BNS)
- Code of Criminal Procedure, 1973 (CrPC) / Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)
- Code of Civil Procedure, 1908 (CPC)
- Indian Evidence Act, 1872 / Bharatiya Sakshya Adhiniyam, 2023 (BSA)
- Constitution of India (Articles 12–35, 226, 227, 32, etc.)

**Special Laws:**
Hindu Marriage Act, Muslim Personal Law, Special Marriage Act, Transfer of Property Act, Specific Relief Act, Indian Contract Act, Negotiable Instruments Act, Limitation Act, Consumer Protection Act 2019, RERA 2016, Arbitration & Conciliation Act 1996, Companies Act 2013, IBC 2016, IT Act 2000, NDPS Act, POCSO Act, SC/ST Act, Motor Vehicles Act, Environment Protection Act, and all other major Indian statutes.

**Your Analysis Standards:**
1. Always cite specific Section numbers, Article numbers, and Order/Rule numbers
2. Reference landmark Supreme Court and High Court judgments by name and citation
3. Distinguish between old codes (IPC/CrPC/Evidence Act) and new codes (BNS/BNSS/BSA) with mapping
4. Provide practical, actionable advice that an advocate can use in court
5. Consider both sides — arguments and counter-arguments
6. Flag limitation periods, jurisdictional issues, and procedural requirements
7. Use Indian legal terminology appropriately (vakalatnama, cause title, plaints, etc.)

**Response Format:**
- Use clear Markdown headings (##, ###)
- Use bullet points for lists
- Bold important section numbers and case names
- Include relevant legal maxims where applicable
- End with actionable next steps

You are professional, thorough, and precise. You never fabricate case citations — if unsure, say so. You always note when laws have been recently amended or replaced."""

BRIEF_ANALYSIS_SYSTEM = """You are **LexAssist AI**, an expert Indian legal brief analyzer. Given a legal brief or case description, you must provide a comprehensive structured analysis.

Your response MUST be valid JSON with exactly this structure:
{
  "case_summary": "A clear 2-3 paragraph summary of the case facts and issues",
  "case_type": {
    "primary": "Criminal / Civil / Constitutional / Family / Labour / Consumer / Commercial / Property / etc.",
    "confidence": "high / medium / low",
    "reasoning": "Brief explanation of classification"
  },
  "jurisdiction": {
    "recommended_court": "The specific court/tribunal that should hear this matter",
    "reasoning": "Why this court has jurisdiction",
    "alternative_forums": ["Other possible forums"]
  },
  "legal_issues": [
    {
      "issue": "The legal question",
      "applicable_law": "Specific section/article",
      "analysis": "Brief analysis of this issue",
      "strength": "strong / moderate / weak"
    }
  ],
  "applicable_statutes": [
    {
      "act": "Full name of the Act",
      "sections": ["Section numbers"],
      "relevance": "How this statute applies",
      "key_provisions": "What these sections provide"
    }
  ],
  "relevant_precedents": [
    {
      "case_name": "Full case name",
      "citation": "Citation if known",
      "court": "Which court decided it",
      "principle": "The legal principle established",
      "applicability": "How it applies to this case"
    }
  ],
  "arguments_for_petitioner": [
    "Detailed argument 1 with legal basis",
    "Detailed argument 2 with legal basis"
  ],
  "arguments_for_respondent": [
    "Potential counter-argument 1",
    "Potential counter-argument 2"
  ],
  "risk_assessment": {
    "overall_risk": "low / medium / high",
    "strengths": ["Case strengths"],
    "weaknesses": ["Case weaknesses"],
    "mitigation_strategies": ["How to address weaknesses"]
  },
  "evidence_checklist": [
    "Document/evidence needed 1",
    "Document/evidence needed 2"
  ],
  "procedural_requirements": [
    "Step 1: ...",
    "Step 2: ..."
  ],
  "limitation_period": {
    "applicable_limitation": "The limitation period that applies",
    "start_date_trigger": "What event starts the limitation clock",
    "urgency": "Whether filing is urgent"
  },
  "strategic_recommendations": [
    "Recommendation 1 — detailed and actionable",
    "Recommendation 2 — detailed and actionable"
  ]
}

Be thorough and specific to Indian law. Cite real sections and real landmark cases. If you are unsure about a citation, note that it should be verified. Always consider the latest amendments including BNS/BNSS/BSA 2023."""

DOCUMENT_DRAFTER_SYSTEM = """You are **LexAssist AI**, an expert Indian legal document drafter. You draft professional legal documents following Indian court formatting standards and conventions.

**Documents you can draft:**
- Legal Notices (under various acts)
- Bail Applications (Regular / Anticipatory)
- Writ Petitions (Article 226 / 32)
- Civil Suits (Plaints)
- Written Statements / Counter-affidavits
- Criminal Complaints
- Consumer Complaints
- Appeals / Revisions
- Interlocutory Applications
- Affidavits
- Settlement Agreements

**Drafting Standards:**
1. Use proper cause title format (IN THE COURT OF ...)
2. Include correct court headers and case numbers
3. Use standard Indian legal drafting format
4. Include all required components (grounds, prayer, verification, etc.)
5. Use formal legal language appropriate to Indian courts
6. Reference relevant sections and case law
7. Include proper verification clause and affidavit format

Always format the document with proper indentation, numbering, and legal structure."""


class ClaudeClient:
    """
    Anthropic Claude API client for legal AI features.
    
    Supports:
    - Structured brief analysis (JSON output)
    - Streaming chat conversations
    - Document drafting
    """

    MODEL = "claude-sonnet-4-6"
    MAX_TOKENS = 8192

    def __init__(self):
        self.client = None
        self.api_key = Config.CLAUDE_API_KEY
        self._available = False

        if not _ANTHROPIC_AVAILABLE:
            logger.warning("Anthropic SDK not available — install with: pip install anthropic")
            return

        if not self.api_key:
            logger.warning("CLAUDE_API_KEY not set — AI features disabled")
            return

        try:
            self.client = anthropic.Anthropic(
                api_key=self.api_key,
                timeout=240.0,  # 4-minute timeout for deep legal analysis
            )
            self._available = True
            logger.info("Claude client initialized (model: %s)", self.MODEL)
        except Exception as e:
            logger.error("Claude client init failed: %s", e)

    @property
    def is_available(self) -> bool:
        return self._available and self.client is not None

    # ── JSON extraction helper ───────────────────────────────────

    @staticmethod
    def _extract_json(text: str) -> str:
        """
        Robustly extract JSON from Claude's response.
        Handles: raw JSON, ```json blocks, ``` blocks, or JSON buried in prose.
        Also handles truncated JSON by attempting to close open braces.
        """
        stripped = text.strip()

        # 1. Already valid JSON (starts with { or [)
        if stripped.startswith("{") or stripped.startswith("["):
            return stripped

        # 2. Markdown code block: ```json ... ``` or ``` ... ```
        code_block = re.search(r"```(?:json)?\s*\n?(.*?)```", stripped, re.DOTALL)
        if code_block:
            return code_block.group(1).strip()

        # 2b. Unclosed markdown code block (truncated output): ```json ... EOF
        unclosed = re.search(r"```(?:json)?\s*\n?(.*)", stripped, re.DOTALL)
        if unclosed:
            candidate = unclosed.group(1).strip()
            if candidate.startswith("{"):
                return candidate

        # 3. Find the first { ... last } (greedy brace matching)
        brace_match = re.search(r"\{.*\}", stripped, re.DOTALL)
        if brace_match:
            return brace_match.group(0)

        # 3b. Unclosed JSON object — find first { to end of string
        brace_start = re.search(r"\{.*", stripped, re.DOTALL)
        if brace_start:
            return brace_start.group(0)

        # 4. Give up — return original text (will trigger JSONDecodeError)
        return stripped

    @staticmethod
    def _repair_truncated_json(text: str) -> str:
        """
        Attempt to repair truncated JSON by closing open braces/brackets
        and removing trailing incomplete values.
        """
        # Count open vs close braces/brackets
        open_braces = text.count("{") - text.count("}")
        open_brackets = text.count("[") - text.count("]")

        if open_braces <= 0 and open_brackets <= 0:
            return text  # Not truncated

        # Remove trailing incomplete value (partial string, number, etc.)
        repaired = re.sub(r',\s*"[^"]*$', '', text)  # trailing incomplete key
        repaired = re.sub(r',\s*$', '', repaired)      # trailing comma
        repaired = re.sub(r':\s*"[^"]*$', ': ""', repaired)  # incomplete string value

        # Re-count after cleanup
        open_braces = repaired.count("{") - repaired.count("}")
        open_brackets = repaired.count("[") - repaired.count("]")

        # Close open brackets first, then braces
        repaired += "]" * max(0, open_brackets)
        repaired += "}" * max(0, open_braces)

        return repaired

    # ── Structured Brief Analysis ────────────────────────────────

    def analyze_brief(self, brief_text: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Deep AI analysis of a legal brief. Returns structured JSON.
        Uses streaming internally to avoid memory spikes and worker timeouts.
        
        Args:
            brief_text: The raw legal brief text
            context: Optional dict with regex-extracted entities for enrichment
        
        Returns:
            Structured analysis dict
        """
        if not self.is_available:
            return {"error": "AI service unavailable", "status": "unavailable"}

        # Build the user prompt with optional context enrichment
        prompt = f"Analyze the following Indian legal brief thoroughly:\n\n---\n{brief_text}\n---"

        if context:
            enrichment_parts = []

            # ── Jurisdiction data (verified geographic lookup) ──
            if context.get("jurisdiction_prompt"):
                enrichment_parts.append(context["jurisdiction_prompt"])

            if context.get("entities", {}).get("sections"):
                enrichment_parts.append(f"Sections mentioned: {', '.join(context['entities']['sections'])}")
            if context.get("entities", {}).get("articles"):
                enrichment_parts.append(f"Articles mentioned: {', '.join(context['entities']['articles'])}")
            if context.get("case_type", {}).get("primary"):
                enrichment_parts.append(f"Preliminary case classification: {context['case_type']['primary']}")
            if context.get("entities", {}).get("courts"):
                enrichment_parts.append(f"Courts mentioned: {', '.join(context['entities']['courts'])}")
            if enrichment_parts:
                prompt += "\n\nPreliminary extraction (verify and expand):\n" + "\n".join(enrichment_parts)

        prompt += "\n\nProvide your complete structured JSON analysis."

        try:
            # Stream the response to avoid memory spikes and gunicorn worker kills.
            # Collect chunks incrementally instead of buffering the entire response.
            chunks: List[str] = []
            with self.client.messages.stream(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=BRIEF_ANALYSIS_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            ) as stream:
                for chunk in stream.text_stream:
                    chunks.append(chunk)

            text = "".join(chunks).strip()

            # Extract JSON from response — handle markdown code blocks, preamble text, etc.
            json_text = self._extract_json(text)

            result = json.loads(json_text)
            result["status"] = "success"
            result["ai_model"] = self.MODEL
            return result

        except json.JSONDecodeError as e:
            # Attempt to repair truncated JSON before giving up
            logger.warning("Initial JSON parse failed (%s), attempting repair…", e)
            try:
                repaired = self._repair_truncated_json(json_text)
                result = json.loads(repaired)
                result["status"] = "success"
                result["ai_model"] = self.MODEL
                logger.info("JSON repair succeeded")
                return result
            except Exception:
                pass

            logger.warning("Claude returned non-JSON even after repair, wrapping as text")
            raw = text if text else "Analysis generated"
            # Strip markdown / JSON wrapping so downstream never sees raw JSON as a title
            clean = raw.lstrip("`").lstrip("json").strip()
            if clean.startswith("{"):
                summary = "AI analysis completed (structured parsing failed)"
            else:
                summary = clean[:2000]
            return {
                "status": "success",
                "ai_model": self.MODEL,
                "raw_analysis": raw,
                "case_summary": summary,
            }
        except anthropic.APIError as e:
            logger.error("Claude API error: %s", e)
            return {"error": f"AI analysis failed: {str(e)}", "status": "error"}
        except Exception as e:
            logger.error("Unexpected error in brief analysis: %s", e)
            return {"error": str(e), "status": "error"}

    # ── Streaming Chat ───────────────────────────────────────────

    def chat_stream(
        self,
        messages: List[Dict[str, str]],
        brief_context: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """
        Streaming chat response. Yields text chunks.
        
        Args:
            messages: List of {"role": "user"|"assistant", "content": "..."}
            brief_context: Optional case brief for context
        
        Yields:
            Text chunks as they arrive from the API
        """
        if not self.is_available:
            yield "I'm sorry, the AI service is currently unavailable. Please check the Claude API key configuration."
            return

        system = LEGAL_ANALYST_SYSTEM
        if brief_context:
            system += f"\n\n**Current Case Context:**\n{brief_context[:4000]}"

        try:
            with self.client.messages.stream(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=system,
                messages=messages,
                temperature=0.4,
            ) as stream:
                for text in stream.text_stream:
                    yield text

        except anthropic.APIError as e:
            logger.error("Claude streaming error: %s", e)
            yield f"\n\n[Error: AI service encountered an issue — {str(e)}]"
        except Exception as e:
            logger.error("Unexpected streaming error: %s", e)
            yield f"\n\n[Error: {str(e)}]"

    # ── Non-Streaming Chat ───────────────────────────────────────

    def chat(
        self,
        messages: List[Dict[str, str]],
        brief_context: Optional[str] = None,
    ) -> str:
        """Non-streaming chat for simple queries."""
        if not self.is_available:
            return "AI service is currently unavailable."

        system = LEGAL_ANALYST_SYSTEM
        if brief_context:
            system += f"\n\n**Current Case Context:**\n{brief_context[:4000]}"

        try:
            response = self.client.messages.create(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=system,
                messages=messages,
                temperature=0.4,
            )
            return response.content[0].text
        except Exception as e:
            logger.error("Chat error: %s", e)
            return f"Sorry, I encountered an error: {str(e)}"

    # ── Document Drafting ────────────────────────────────────────

    def draft_document(
        self,
        doc_type: str,
        details: Dict[str, Any],
        brief_context: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """
        Stream a legal document draft.
        
        Args:
            doc_type: Type of document (e.g., "Legal Notice", "Bail Application")
            details: Dict with specifics (parties, facts, relief sought, etc.)
            brief_context: Optional case brief for context
        """
        if not self.is_available:
            yield "AI service is currently unavailable."
            return

        prompt = f"Draft a professional **{doc_type}** for an Indian court with these details:\n\n"
        for key, value in details.items():
            prompt += f"- **{key}**: {value}\n"

        if brief_context:
            prompt += f"\n\n**Case Background:**\n{brief_context[:3000]}"

        prompt += "\n\nDraft the complete document with proper formatting, legal structure, and all required components."

        try:
            with self.client.messages.stream(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=DOCUMENT_DRAFTER_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            ) as stream:
                for text in stream.text_stream:
                    yield text

        except Exception as e:
            logger.error("Document drafting error: %s", e)
            yield f"\n\n[Error drafting document: {str(e)}]"
