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
import hashlib
import json
import re
import time
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
  ],
  "court_fees": {
    "estimated_amount": "Estimated court fee amount or range",
    "basis": "Applicable court fee schedule / ad valorem basis"
  },
  "interim_reliefs": [
    {
      "relief": "Specific interim relief available",
      "provision": "Statutory provision (e.g., Order XXXIX Rule 1 & 2 CPC)",
      "urgency": "Whether ex-parte/urgent hearing is warranted and why"
    }
  ],
  "old_new_code_mapping": [
    {
      "old_provision": "e.g., Section 498A IPC",
      "new_provision": "e.g., Section 85 BNS",
      "changes": "Key differences between old and new provision"
    }
  ],
  "cause_of_action": {
    "facts_constituting_cause": "What facts give rise to the legal claim",
    "accrual_date": "When the cause of action arose or is deemed to have arisen",
    "place_of_cause": "Where it arose (determines territorial jurisdiction)"
  }
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
10. Limitation period must cite the specific Article from the Schedule to the Limitation Act 1963
11. Court fees must reference the applicable court fee schedule or ad valorem basis
12. Interim reliefs must cite the specific CPC Order/Rule or statutory provision with grounds for urgency
13. NEVER fabricate a case citation. If you cannot recall the exact citation, state the legal principle and explicitly note "citation to be verified". An incorrect citation filed in court causes real harm — it can result in costs, contempt proceedings, and professional misconduct charges against the advocate.
14. For EVERY case you cite, verify: Is this a real case? Is the reporter and year plausible? If ANY doubt, prefix with ⚠️."""

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
    - Structured brief analysis (JSON output)  — uses Opus 4.6 for maximum depth
    - Streaming chat conversations              — uses Sonnet 4.6 for speed
    - Document drafting                         — uses Sonnet 4.6 for speed
    """

    MODEL = "claude-sonnet-4-6"            # Workhorse — chat, drafting, verification
    MODEL_DEEP = "claude-opus-4-6"         # Deep analysis — maximum intelligence
    MODEL_FAST = "claude-haiku-4-5-20251001"  # Fast preprocessing — context summarization
    MAX_TOKENS = 16384

    def __init__(self):
        self.client = None
        self.api_key = Config.CLAUDE_API_KEY
        self._available = False
        self._context_cache: Dict[str, str] = {}  # Cache for smart context summaries

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
            logger.info("Claude client initialized (chat: %s, deep: %s, fast: %s)", self.MODEL, self.MODEL_DEEP, self.MODEL_FAST)
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

    # ── Smart Context Builder ────────────────────────────────────

    def _build_smart_context(self, text: str, max_chars: int = 12000) -> str:
        """
        Intelligently extract and prioritize key parts of a legal brief.
        For short texts, returns as-is. For long texts, creates a structured
        summary using a fast model, preserving legally critical details.
        Results are cached by content hash to avoid repeated API calls
        for the same brief across multiple chat turns.
        """
        if not text or len(text) <= max_chars:
            return text or ""

        if not self.is_available:
            return text[:max_chars]

        # Check cache — same brief across multiple chat turns shouldn't re-summarize
        cache_key = hashlib.md5(text[:2000].encode("utf-8", errors="ignore")).hexdigest()
        if cache_key in self._context_cache:
            logger.debug("Smart context cache hit")
            return self._context_cache[cache_key]

        try:
            response = self.client.messages.create(
                model=self.MODEL_FAST,
                max_tokens=3000,
                messages=[{"role": "user", "content": f"""Create a dense, structured summary of this legal brief preserving ALL of the following in order of priority:

1. **Prayer/Relief sought** — exact reliefs claimed
2. **Key facts** — with specific dates, amounts, names, places
3. **Statutory provisions** — every section/article number mentioned
4. **Court history** — previous orders, pending proceedings
5. **Party details** — names, relationships, capacities
6. **Cause of action** — what happened, when, where

Do NOT add commentary or analysis — only extract and organize the information present in the brief.

Brief:
{text[:30000]}"""}],
                temperature=0.0,
            )
            summary = response.content[0].text
            logger.info("Smart context: compressed %d chars → %d chars", len(text), len(summary))
            # Cache the result (limit cache size to 20 entries to bound memory)
            if len(self._context_cache) >= 20:
                self._context_cache.pop(next(iter(self._context_cache)))
            self._context_cache[cache_key] = summary
            return summary
        except Exception as e:
            logger.warning("Smart context extraction failed, truncating: %s", e)
            return text[:max_chars]
        finally:
            gc.collect()

    # ── Multi-Pass Analysis Helpers ──────────────────────────────

    def _identify_issues(self, brief_text: str, context: Optional[Dict] = None) -> Dict:
        """
        Pass 1 — Fast issue identification and case classification.
        Uses Sonnet for speed. Feeds results into Pass 2 for deeper analysis.
        """
        prompt = f"""You are a senior Indian legal analyst. Quickly analyze this brief and extract:

1. **Case Type**: Criminal / Civil / Constitutional / Family / Labour / Consumer / Commercial / Property
2. **Core Legal Issues**: Each distinct legal question with the most relevant statute + section
3. **Key Statutes**: All applicable Acts with specific section numbers
4. **Parties**: Who is involved, in what capacity (petitioner/respondent/complainant/accused)
5. **Critical Dates**: Any dates affecting limitation, accrual, or procedural deadlines
6. **Jurisdiction**: Which court/tribunal should hear this and why
7. **Urgency Indicators**: Bail needed, injunction required, limitation about to expire?

Brief:
---
{brief_text[:8000]}
---"""

        if context:
            extras = []
            if context.get("entities", {}).get("sections"):
                extras.append(f"Sections detected: {', '.join(context['entities']['sections'])}")
            if context.get("case_type", {}).get("primary"):
                extras.append(f"Auto-classification: {context['case_type']['primary']}")
            if context.get("entities", {}).get("courts"):
                extras.append(f"Courts detected: {', '.join(context['entities']['courts'])}")
            if extras:
                prompt += "\n\nRegex pre-extraction:\n" + "\n".join(extras)

        prompt += "\n\nRespond in JSON format."

        try:
            response = self.client.messages.create(
                model=self.MODEL,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
            )
            text = response.content[0].text
            json_text = self._extract_json(text)
            result = json.loads(json_text)
            logger.info("Pass 1 identified %d issues",
                        len(result.get("core_legal_issues", result.get("legal_issues", []))))
            return result
        except Exception as e:
            logger.warning("Pass 1 (issue identification) failed: %s — continuing without", e)
            return {}
        finally:
            gc.collect()

    def _verify_citations(self, analysis: Dict) -> Dict:
        """
        Pass 3 — Citation verification.
        Sends generated citations back for confidence scoring.
        Citations scoring <= 3/5 are flagged with ⚠️.
        """
        precedents = analysis.get("relevant_precedents", [])
        if not precedents:
            return analysis

        citations_text = "\n".join([
            f"{i+1}. {p.get('case_name', 'Unknown')} — {p.get('citation', 'No citation')} ({p.get('court', 'Unknown court')})"
            for i, p in enumerate(precedents)
        ])

        try:
            response = self.client.messages.create(
                model=self.MODEL,
                max_tokens=2048,
                messages=[{"role": "user", "content": f"""You are a citation verification assistant for Indian law. For each case citation below, rate your confidence (1-5) that this is a REAL Indian case with a CORRECT citation:

5 = Certain — landmark case, well-known citation
4 = Very likely real — recognized case, citation format correct
3 = Plausible — could be real but not fully certain of details
2 = Uncertain — might be fabricated or confused with a different case
1 = Almost certainly wrong — citation format implausible or case doesn't exist

Be BRUTALLY honest. A fabricated citation filed in an Indian court can result in costs, contempt proceedings, and professional misconduct charges. It is FAR better to flag a real case as uncertain than to let a fake citation through.

Citations to verify:
{citations_text}

Respond in JSON array: [{{"index": 1, "confidence": 4, "note": "any concerns or corrections"}}]"""}],
                temperature=0.0,
            )
        except Exception as api_err:
            # Single retry after 2s for transient errors (529 overloaded, 500, network)
            logger.warning("Citation verification API call failed (%s), retrying in 2s…", api_err)
            time.sleep(2)
            try:
                response = self.client.messages.create(
                    model=self.MODEL,
                    max_tokens=2048,
                    messages=[{"role": "user", "content": f"""You are a citation verification assistant for Indian law. For each case citation below, rate your confidence (1-5) that this is a REAL Indian case with a CORRECT citation:

5 = Certain — landmark case, well-known citation
4 = Very likely real — recognized case, citation format correct
3 = Plausible — could be real but not fully certain of details
2 = Uncertain — might be fabricated or confused with a different case
1 = Almost certainly wrong — citation format implausible or case doesn't exist

Be BRUTALLY honest.

Citations to verify:
{citations_text}

Respond in JSON array: [{{"index": 1, "confidence": 4, "note": "any concerns or corrections"}}]"""}],
                    temperature=0.0,
                )
            except Exception as retry_err:
                logger.warning("Citation verification retry also failed: %s", retry_err)
                for p in precedents:
                    if "citation_confidence" not in p:
                        p["verification_note"] = "Auto-verification unavailable — verify all citations before filing"
                analysis["citation_verification"] = {
                    "verified": 0, "flagged": 0, "total": len(precedents),
                    "note": "Verification service unavailable after retry — manually verify all citations"
                }
                return analysis

        try:
            text = response.content[0].text
            json_text = self._extract_json(text)
            verifications = json.loads(json_text)

            verified_count = 0
            flagged_count = 0

            if isinstance(verifications, list):
                for v in verifications:
                    idx = v.get("index", 0) - 1
                    if 0 <= idx < len(precedents):
                        confidence = v.get("confidence", 5)
                        precedents[idx]["citation_confidence"] = confidence
                        if confidence <= 3:
                            name = precedents[idx].get("case_name", "")
                            if not name.startswith("⚠️"):
                                precedents[idx]["case_name"] = f"⚠️ {name}"
                            precedents[idx]["verification_note"] = v.get(
                                "note", "Citation confidence low — verify before filing")
                            flagged_count += 1
                        else:
                            verified_count += 1

            analysis["relevant_precedents"] = precedents
            analysis["citation_verification"] = {
                "verified": verified_count,
                "flagged": flagged_count,
                "total": len(precedents),
                "methodology": "AI self-verification (same model family) — independent database verification recommended for high-stakes filings",
                "note": "Citations with ⚠️ should be independently verified before filing in court"
            }
            logger.info("Pass 3 verified %d citations: %d confirmed, %d flagged",
                        len(precedents), verified_count, flagged_count)
            return analysis

        except Exception as e:
            logger.warning("Pass 3 (citation verification) failed: %s", e)
            for p in precedents:
                if "citation_confidence" not in p:
                    p["verification_note"] = "Auto-verification unavailable — verify all citations before filing"
            analysis["citation_verification"] = {
                "verified": 0, "flagged": 0, "total": len(precedents),
                "note": "Verification service unavailable — manually verify all citations"
            }
            return analysis
        finally:
            gc.collect()

    # ── Structured Brief Analysis (Multi-Pass Pipeline) ──────────

    def analyze_brief(self, brief_text: str, context: Optional[Dict] = None,
                       deep: bool = True) -> Dict[str, Any]:
        """
        Multi-pass AI analysis of a legal brief. Returns structured JSON.

        Pipeline (deep=True, default):
          Pass 1 (Sonnet 4.6 — fast):   Issue identification & classification
          Pass 2 (Opus 4.6 — deep):     Full structured analysis enriched by Pass 1
          Pass 3 (Sonnet 4.6 — fast):   Citation verification & flagging

        Quick mode (deep=False):
          Single-pass Sonnet analysis — faster, cheaper, suitable for initial review.

        Args:
            brief_text: The raw legal brief text
            context: Optional dict with regex-extracted entities for enrichment
            deep: If True (default), run full 3-pass pipeline. If False, single-pass quick analysis.

        Returns:
            Structured analysis dict with verified citations
        """
        if not self.is_available:
            return {"error": "AI service unavailable", "status": "unavailable"}

        pipeline_start = time.time()
        pipeline_notes: List[str] = []

        # ── Quick mode: single-pass Sonnet analysis ──────────────
        if not deep:
            return self._quick_analyze(brief_text, context, pipeline_start)

        # ── Pass 1: Issue Identification (Sonnet — fast) ─────────
        logger.info("▶ Analysis Pass 1/3: Issue identification (Sonnet 4.6)")
        pass1_start = time.time()
        issues_context = self._identify_issues(brief_text, context)
        pass1_time = round(time.time() - pass1_start, 1)
        logger.info("Pass 1 completed in %.1fs", pass1_time)

        if not issues_context:
            pipeline_notes.append(
                "Pass 1 (issue identification) failed — analysis may lack depth on some issues"
            )

        # ── Pass 2: Deep Structured Analysis (Opus — maximum depth) ──
        logger.info("▶ Analysis Pass 2/3: Deep structured analysis (Opus 4.6)")

        prompt = f"Analyze the following Indian legal brief thoroughly:\n\n---\n{brief_text}\n---"

        # Enrich with Pass 1 results
        if issues_context:
            prompt += "\n\n**Preliminary Issue Analysis (from Pass 1 — use this to go DEEPER on each issue, do not merely repeat it):**\n"
            prompt += json.dumps(issues_context, indent=2, default=str)[:6000]

        # Enrich with regex context
        if context:
            enrichment_parts = []
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
                prompt += "\n\nRegex extraction (verify and expand):\n" + "\n".join(enrichment_parts)

        prompt += """\n\nProvide your complete structured JSON analysis. Be EXHAUSTIVE and SPECIFIC:
- For EACH legal issue from Pass 1, provide deep analysis with at least 2 relevant case citations
- Every section/article number must be exact — cite the specific sub-section where applicable
- Every case citation must include: full case name, (year) volume reporter page, and court
- Arguments must be detailed enough to include in a court filing — not bullet-point summaries
- Map ALL applicable old code sections to new code (IPC→BNS, CrPC→BNSS, Evidence Act→BSA)
- Strategic recommendations must specify: what to file, under which section, in which court, within what deadline
- If you are NOT confident about a case citation, mark it with ⚠️ — NEVER fabricate
- PRIORITY if running low on space: legal_issues, relevant_precedents, arguments, strategic_recommendations. Court fees and interim reliefs can be abbreviated."""

        try:
            # Stream the response to avoid memory spikes and gunicorn worker kills.
            text = ""
            json_text = ""
            pass2_start = time.time()
            chunks: List[str] = []
            with self.client.messages.stream(
                model=self.MODEL_DEEP,
                max_tokens=self.MAX_TOKENS,
                system=BRIEF_ANALYSIS_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.05,
            ) as stream:
                for chunk in stream.text_stream:
                    chunks.append(chunk)

            pass2_time = round(time.time() - pass2_start, 1)
            logger.info("Pass 2 completed in %.1fs", pass2_time)

            text = "".join(chunks).strip()
            json_text = self._extract_json(text)

            result = json.loads(json_text)
            result["status"] = "success"
            result["ai_model"] = self.MODEL_DEEP

            gc.collect()

            # ── Pass 3: Citation Verification (Sonnet — fast) ────
            logger.info("▶ Analysis Pass 3/3: Citation verification (Sonnet 4.6)")
            pass3_start = time.time()
            if result.get("relevant_precedents"):
                result = self._verify_citations(result)
            else:
                result["citation_verification"] = {
                    "note": "No precedents found in analysis — request re-analysis if needed"
                }
                pipeline_notes.append("No precedents to verify — citation verification skipped")
            pass3_time = round(time.time() - pass3_start, 1)
            logger.info("Pass 3 completed in %.1fs", pass3_time)

            result["analysis_pipeline"] = "multi-pass-v1"
            if pipeline_notes:
                result["pipeline_notes"] = pipeline_notes
            result["timing"] = {
                "pass1_issue_id_sec": pass1_time,
                "pass2_deep_analysis_sec": pass2_time,
                "pass3_citation_verify_sec": pass3_time,
                "total_sec": round(time.time() - pipeline_start, 1),
            }

            gc.collect()
            return result

        except json.JSONDecodeError as e:
            # Attempt to repair truncated JSON before giving up
            logger.warning("Initial JSON parse failed (%s), attempting repair\u2026", e)
            try:
                repaired = self._repair_truncated_json(json_text)
                result = json.loads(repaired)
                result["status"] = "success"
                result["ai_model"] = self.MODEL_DEEP
                # Only verify citations if precedents survived the truncation repair
                if result.get("relevant_precedents"):
                    result = self._verify_citations(result)
                else:
                    result["citation_verification"] = {
                        "note": "No precedents found after JSON repair (possible truncation) — request re-analysis if needed"
                    }
                    pipeline_notes.append("Precedents lost during JSON repair — citation verification skipped")
                result["analysis_pipeline"] = "multi-pass-v1-repaired"
                if pipeline_notes:
                    result["pipeline_notes"] = pipeline_notes
                result["timing"] = {"total_sec": round(time.time() - pipeline_start, 1)}
                logger.info("JSON repair succeeded")
                return result
            except Exception:
                pass

            logger.warning("Claude returned non-JSON even after repair, wrapping as text")
            raw = text if text else "Analysis generated"
            clean = raw.lstrip("`").lstrip("json").strip()
            if clean.startswith("{"):
                summary = "AI analysis completed (structured parsing failed)"
            else:
                summary = clean[:2000]
            return {
                "status": "success",
                "ai_model": self.MODEL_DEEP,
                "raw_analysis": raw,
                "case_summary": summary,
                "analysis_pipeline": "multi-pass-v1-fallback",
                "pipeline_notes": pipeline_notes if pipeline_notes else ["JSON parsing failed — raw text returned"],
                "timing": {"total_sec": round(time.time() - pipeline_start, 1)},
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
            smart_ctx = self._build_smart_context(brief_context)
            system += f"\n\n**Current Case Context (use this to give SPECIFIC answers):**\n{smart_ctx}"

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
            smart_ctx = self._build_smart_context(brief_context)
            system += f"\n\n**Current Case Context (use this to give SPECIFIC answers):**\n{smart_ctx}"

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
            smart_ctx = self._build_smart_context(brief_context)
            prompt += f"\n\n**Case Background (incorporate all relevant details):**\n{smart_ctx}"

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
                temperature=0.05,
            ) as stream:
                for text in stream.text_stream:
                    yield text

        except Exception as e:
            logger.error("Document drafting error: %s", e)
            yield f"\n\n[Error drafting document: {str(e)}]"

    # ── Quick Analysis (Single-Pass) ─────────────────────────────

    def _quick_analyze(self, brief_text: str, context: Optional[Dict] = None,
                       pipeline_start: Optional[float] = None) -> Dict[str, Any]:
        """
        Single-pass Sonnet analysis — faster and cheaper than the full 3-pass pipeline.
        Good for initial review, routine queries, or when cost/latency is a concern.
        """
        if pipeline_start is None:
            pipeline_start = time.time()

        logger.info("▶ Quick analysis (single-pass Sonnet 4.6)")

        prompt = f"Analyze the following Indian legal brief thoroughly:\n\n---\n{brief_text}\n---"

        if context:
            enrichment_parts = []
            if context.get("jurisdiction_prompt"):
                enrichment_parts.append(context["jurisdiction_prompt"])
            if context.get("entities", {}).get("sections"):
                enrichment_parts.append(f"Sections mentioned: {', '.join(context['entities']['sections'])}")
            if context.get("case_type", {}).get("primary"):
                enrichment_parts.append(f"Preliminary case classification: {context['case_type']['primary']}")
            if enrichment_parts:
                prompt += "\n\nPreliminary extraction (verify and expand):\n" + "\n".join(enrichment_parts)

        prompt += """\n\nProvide your complete structured JSON analysis. Be specific and cite exact section numbers and case law."""

        try:
            text = ""
            json_text = ""
            chunks: List[str] = []
            with self.client.messages.stream(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=BRIEF_ANALYSIS_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.05,
            ) as stream:
                for chunk in stream.text_stream:
                    chunks.append(chunk)

            text = "".join(chunks).strip()
            json_text = self._extract_json(text)
            result = json.loads(json_text)
            result["status"] = "success"
            result["ai_model"] = self.MODEL
            result["analysis_pipeline"] = "quick-single-pass"
            result["timing"] = {"total_sec": round(time.time() - pipeline_start, 1)}
            result["pipeline_notes"] = [
                "Quick analysis mode — single-pass without issue pre-identification or citation verification.",
                "For deeper analysis with citation verification, use deep=True."
            ]
            return result
        except json.JSONDecodeError:
            try:
                repaired = self._repair_truncated_json(json_text)
                result = json.loads(repaired)
                result["status"] = "success"
                result["ai_model"] = self.MODEL
                result["analysis_pipeline"] = "quick-single-pass-repaired"
                result["timing"] = {"total_sec": round(time.time() - pipeline_start, 1)}
                return result
            except Exception:
                pass
            return {
                "status": "success",
                "ai_model": self.MODEL,
                "raw_analysis": text if text else "Analysis generated",
                "analysis_pipeline": "quick-single-pass-fallback",
                "timing": {"total_sec": round(time.time() - pipeline_start, 1)},
            }
        except Exception as e:
            logger.error("Quick analysis error: %s", e)
            return {"error": str(e), "status": "error"}
        finally:
            gc.collect()

    # ── STT Preprocessing ────────────────────────────────────────

    def preprocess_voice_input(self, transcript: str) -> str:
        """
        Normalize a speech-to-text transcript for legal processing.

        Corrects common STT errors in Indian legal terminology:
        - Misheard section numbers ("section for 98 A" → "Section 498A")
        - Statute name normalization ("I P C" → "IPC", "code of criminal procedure" → "CrPC")
        - Court name normalization ("supreme court" → "Supreme Court of India")
        - Proper noun capitalization for legal terms

        Args:
            transcript: Raw speech-to-text output

        Returns:
            Cleaned transcript ready for analyze_brief or chat_stream
        """
        if not transcript or not transcript.strip():
            return transcript or ""

        if not self.is_available:
            # Basic regex cleanup when AI is unavailable
            return self._basic_stt_cleanup(transcript)

        try:
            response = self.client.messages.create(
                model=self.MODEL_FAST,
                max_tokens=2048,
                messages=[{"role": "user", "content": f"""You are a legal transcription corrector for Indian law. Clean up this speech-to-text transcript:

1. Fix misheard legal terms (e.g., "section for 98 A" → "Section 498A IPC")
2. Correct statute names (e.g., "I P C" → "IPC", "see are pee see" → "CrPC")
3. Fix court names (e.g., "supreme court" → "Supreme Court of India") 
4. Correct legal Latin (e.g., "rex ipsa loquitor" → "res ipsa loquitur")
5. Add proper punctuation and paragraph breaks
6. Do NOT change the substance or meaning — only fix transcription errors

Transcript:
{transcript[:8000]}

Return ONLY the corrected text, nothing else."""}],
                temperature=0.0,
            )
            corrected = response.content[0].text.strip()
            logger.info("STT preprocessing: %d chars → %d chars", len(transcript), len(corrected))
            return corrected
        except Exception as e:
            logger.warning("STT preprocessing failed, using raw transcript: %s", e)
            return self._basic_stt_cleanup(transcript)
        finally:
            gc.collect()

    @staticmethod
    def _basic_stt_cleanup(text: str) -> str:
        """Basic regex-based STT cleanup when AI is unavailable."""
        # Common STT misheard legal abbreviations
        replacements = {
            r'\bi p c\b': 'IPC', r'\bc r p c\b': 'CrPC', r'\bc p c\b': 'CPC',
            r'\bb n s\b': 'BNS', r'\bb n s s\b': 'BNSS', r'\bb s a\b': 'BSA',
            r'\bfir\b': 'FIR', r'\bn c l t\b': 'NCLT', r'\bn c d r c\b': 'NCDRC',
            r'\brera\b': 'RERA', r'\bpocso\b': 'POCSO', r'\bndps\b': 'NDPS',
            r'\bsection (\d)': r'Section \1',
            r'\barticle (\d)': r'Article \1',
            r'\border (\d)': r'Order \1',
            r'\brule (\d)': r'Rule \1',
        }
        result = text
        for pattern, replacement in replacements.items():
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
        return result
