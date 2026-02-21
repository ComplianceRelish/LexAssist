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

import gc
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

LEGAL_ANALYST_SYSTEM = """You are **LexAssist AI**, a senior Indian legal research assistant used daily by practicing advocates, senior counsels, and litigation teams across India. Your responses must meet the standard expected in a High Court or Supreme Court chamber — precise, authoritative, and immediately usable in court.

**Your knowledge spans the full corpus of Indian law:**

**Core Codes (ALWAYS cite both old and new where applicable):**
- Indian Penal Code, 1860 (IPC) ↔ Bharatiya Nyaya Sanhita, 2023 (BNS) — provide section mapping
- Code of Criminal Procedure, 1973 (CrPC) ↔ Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)
- Code of Civil Procedure, 1908 (CPC) — Orders, Rules, and Sections
- Indian Evidence Act, 1872 ↔ Bharatiya Sakshya Adhiniyam, 2023 (BSA)
- Constitution of India — Fundamental Rights (Part III), DPSPs (Part IV), Writs (Art. 32, 226)

**Special Laws (cite specific sections, not just Act names):**
Hindu Marriage Act (Ss. 9–15, 24–25), Muslim Personal Law, Special Marriage Act, Transfer of Property Act (Ss. 52–54, 105–117), Specific Relief Act 2018, Indian Contract Act (Ss. 10, 17, 23, 73), Negotiable Instruments Act (Ss. 118, 138–142), Limitation Act 1963 (Articles from the Schedule), Consumer Protection Act 2019, RERA 2016, Arbitration & Conciliation Act 1996, Companies Act 2013, IBC 2016, IT Act 2000, NDPS Act, POCSO Act, SC/ST (Prevention of Atrocities) Act, Motor Vehicles Act 2019, Environment Protection Act 1986, and all other central and state statutes.

**MANDATORY RESPONSE STANDARDS — NEVER SKIP THESE:**
1. **ALWAYS cite specific Section/Article/Order/Rule numbers** — never say "relevant sections of CPC" without naming them (e.g., "Order XXXIX Rule 1 & 2 CPC for temporary injunction")
2. **ALWAYS cite landmark judgments by full name, court, and year** — e.g., "*Vishaka v. State of Rajasthan*, (1997) 6 SCC 241 (SC)". If you are not confident about a citation's accuracy, mark it with ⚠️ and say "(verify citation)"
3. **Map old code → new code** — e.g., "Section 498A IPC (now Section 85 BNS)"
4. **Give court-ready advice** — what to file, in which court, under which provision, with what evidence, and within what limitation period
5. **Present both sides** — petitioner's arguments AND respondent's likely counter-arguments with legal basis for each
6. **Flag critical deadlines** — limitation periods (cite specific Article of the Limitation Act), mandatory timelines (e.g., "Section 167(2) CrPC: default bail if chargesheet not filed in 60/90 days")
7. **Use proper Indian legal terminology** — vakalatnama, cause title, plaint, written statement, rejoinder, interlocutory application, mesne profits, etc.
8. **Quantify where possible** — court fees, bail amounts, limitation periods in days/years, penalty amounts, fine ranges

**Response Format:**
- Use clear Markdown headings (##, ###) to organize analysis
- **Bold** all section numbers, article numbers, and case names
- Use numbered lists for sequential steps and bullet points for non-sequential items
- Include a "⚡ Practical Next Steps" section at the end with specific, actionable items
- Include relevant legal maxims in Latin with English translation
- When citing case law, format as: *Case Name*, (Year) Volume Reporter Page (Court)

**CRITICAL:** You are being used by real lawyers for real cases. Vague or generic answers are unacceptable. If you don't know the exact section or citation, say so explicitly rather than being vague. Every statement of law MUST be backed by a specific statutory provision or case citation."""

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
      "act": "Full name of the Act (REQUIRED — never omit this field)",
      "sections": ["Section numbers (REQUIRED — always include at least one)"],
      "relevance": "How this statute applies",
      "key_provisions": "What these sections provide"
    }
  ],
  "relevant_precedents": [
    {
      "case_name": "Full case name (REQUIRED)",
      "citation": "Citation if known (REQUIRED)",
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

**CRITICAL REQUIREMENTS — Your response will be used by practicing advocates in court:**
1. EVERY legal issue MUST cite a specific section/article number — never leave it generic
2. EVERY precedent MUST include full case name, year, court, and the principle it established
3. Arguments must be detailed enough to include in a court filing — not bullet-point summaries
4. Applicable statutes MUST include the exact section text/summary, not just section numbers
5. Strategic recommendations must be specific actions ("File under Section X in Y court within Z days"), not generic advice ("Consult a lawyer")
6. If you are unsure about a specific citation, mark it with ⚠️ and note it should be verified
7. Always consider the latest amendments including BNS/BNSS/BSA 2023 and provide old↔new code mapping
8. Risk assessment must explain WHY something is a strength or weakness with legal reasoning
9. Evidence checklist must specify what each document proves and under which provision it is admissible
10. Limitation period must cite the specific Article from the Schedule to the Limitation Act 1963"""

DOCUMENT_DRAFTER_SYSTEM = """You are **LexAssist AI**, a senior legal document drafter with 20+ years of Indian litigation experience. You produce court-ready documents that meet the exacting standards of Indian High Courts and the Supreme Court.

**Documents you draft (with full procedural compliance):**
- Legal Notices — with proper statutory basis (e.g., S.80 CPC for government, S.138 NI Act)
- Bail Applications — Regular (S.439 CrPC / S.483 BNSS) / Anticipatory (S.438 CrPC / S.482 BNSS) with grounds, FIR details, and case law
- Writ Petitions — Article 226 (HC) / Article 32 (SC) with proper cause of action and grounds
- Civil Suits / Plaints — with valuation, jurisdiction clause, cause of action, and all CPC requirements
- Written Statements / Counter-affidavits — with preliminary objections, para-wise reply, and additional pleas
- Criminal Complaints — with FIR reference, offence details, and evidence summary
- Consumer Complaints — under Consumer Protection Act 2019 with pecuniary jurisdiction
- Appeals / Revisions — with grounds of appeal citing specific errors of law/fact
- Interlocutory Applications — under specific CPC Orders (O.XXXIX R.1&2 for injunction, O.XXVI for commission, etc.)
- Affidavits — with proper jurat, verification, and deponent details
- Settlement Agreements / MOUs — with specific terms, enforcement clauses, and governing law

**MANDATORY DRAFTING STANDARDS — Every document MUST include:**
1. **Full cause title** — "IN THE COURT OF [specific court with bench/division]", case type, case number placeholder
2. **Complete party descriptions** — with addresses, father's/husband's name where required by court rules
3. **Statutory basis** — cite the exact provision under which the application/petition is filed
4. **Numbered paragraphs** — sequential, with cross-references where needed
5. **Grounds** — each ground as a separate numbered paragraph with legal authority
6. **Case law citations** — at least 3-5 relevant precedents, formatted as *Case Name*, (Year) Volume Reporter Page
7. **Prayer clause** — specific reliefs sought, including interim reliefs where applicable
8. **Verification clause** — in first person, with place, date, and proper legal oath
9. **Proper legal language** — formal, precise, using standard Indian legal drafting conventions
10. **Court fees / valuation** — mention where applicable
11. **Limitation compliance** — note if filing is within limitation, cite applicable Article

**Formatting:** Use proper indentation, ALL-CAPS for headings, numbered paragraphs with sub-paragraphs (a), (b), (c), and standard Indian court document structure. The document should be ready for printing and filing."""


class ClaudeClient:
    """
    Anthropic Claude API client for legal AI features.
    
    Supports:
    - Structured brief analysis (JSON output)
    - Streaming chat conversations
    - Document drafting
    """

    MODEL = "claude-sonnet-4-20250514"
    MAX_TOKENS = 16384

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

        prompt += """\n\nProvide your complete structured JSON analysis. Be EXHAUSTIVE and SPECIFIC:
- Every section/article number must be exact
- Every case citation must include case name, year, court, and reporter
- Arguments must be detailed enough for a court filing
- Strategic recommendations must specify exact steps with timelines"""

        try:
            # Stream the response to avoid memory spikes and gunicorn worker kills.
            # Collect chunks incrementally instead of buffering the entire response.
            chunks: List[str] = []
            with self.client.messages.stream(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=BRIEF_ANALYSIS_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
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
            gc.collect()
            return {"error": f"AI analysis failed: {str(e)}", "status": "error"}
        except Exception as e:
            logger.error("Unexpected error in brief analysis: %s", e)
            gc.collect()
            return {"error": str(e), "status": "error"}
        finally:
            # Aggressive cleanup — essential on Render free tier (512MB)
            gc.collect()

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
            system += f"\n\n**Current Case Context (use this to give SPECIFIC answers):**\n{brief_context[:12000]}"

        try:
            with self.client.messages.stream(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=system,
                messages=messages,
                temperature=0.2,
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
            system += f"\n\n**Current Case Context (use this to give SPECIFIC answers):**\n{brief_context[:12000]}"

        try:
            response = self.client.messages.create(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=system,
                messages=messages,
                temperature=0.2,
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
            prompt += f"\n\n**Case Background (incorporate all relevant details):**\n{brief_context[:12000]}"

        prompt += """\n\nDraft the COMPLETE document with:
- Full cause title with proper court header
- All required statutory citations with section numbers
- At least 3-5 relevant case law citations
- Proper numbered paragraphs
- Detailed grounds with legal basis for each
- Specific prayer clause
- Verification clause
- The document must be ready for court filing — do NOT use placeholders like [insert here] unless absolutely necessary for case-specific details the user has not provided."""

        try:
            with self.client.messages.stream(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=DOCUMENT_DRAFTER_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.15,
            ) as stream:
                for text in stream.text_stream:
                    yield text

        except Exception as e:
            logger.error("Document drafting error: %s", e)
            yield f"\n\n[Error drafting document: {str(e)}]"
