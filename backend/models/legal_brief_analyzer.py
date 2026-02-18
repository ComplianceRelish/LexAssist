"""
LexAssist — Legal Brief Analyzer
=================================
Enterprise-grade engine that transforms a raw legal brief (text) into a
structured client-file payload containing:

  1. Entity extraction     — parties, dates, sections, acts, courts
  2. Case classification   — civil / criminal / constitutional / etc.
  3. Jurisdiction mapping   — Supreme Court / High Court / District / Tribunal
  4. Legal issue isolation  — each distinct legal question
  5. Timeline extraction    — chronological events from the narrative
  6. Indian Kanoon search   — real precedent lookup
  7. Statute cross-ref      — IPC / CrPC / CPC / BNS / BNSS / special acts
  8. Strategic analysis     — arguments, challenges, recommendations

All heavy NLP lives in InLegalBERTProcessor; this class orchestrates the
full pipeline and returns a single JSON-serialisable dict.
"""

import re
from typing import Any, Dict, List, Optional
from backend.utils.logger import setup_logger

logger = setup_logger("LegalBriefAnalyzer")

# ──────────────────────────────────────────────────────────────────────
# Reference data for Indian legal system
# ──────────────────────────────────────────────────────────────────────

INDIAN_ACTS = {
    # Major codes
    "IPC": "Indian Penal Code, 1860",
    "BNS": "Bharatiya Nyaya Sanhita, 2023",
    "CrPC": "Code of Criminal Procedure, 1973",
    "BNSS": "Bharatiya Nagarik Suraksha Sanhita, 2023",
    "CPC": "Code of Civil Procedure, 1908",
    "BSA": "Bharatiya Sakshya Adhiniyam, 2023",
    "Evidence Act": "Indian Evidence Act, 1872",
    # Constitutional
    "Constitution": "Constitution of India",
    "Article 14": "Right to Equality",
    "Article 19": "Freedom of Speech and Expression",
    "Article 21": "Right to Life and Personal Liberty",
    "Article 32": "Remedies for Enforcement of Rights (SC)",
    "Article 226": "Power of High Courts to Issue Writs",
    # Civil / Property
    "Transfer of Property Act": "Transfer of Property Act, 1882",
    "Specific Relief Act": "Specific Relief Act, 1963",
    "Indian Contract Act": "Indian Contract Act, 1872",
    "Limitation Act": "Limitation Act, 1963",
    "Registration Act": "Registration Act, 1908",
    "Indian Stamp Act": "Indian Stamp Act, 1899",
    # Criminal
    "NDPS Act": "Narcotic Drugs and Psychotropic Substances Act, 1985",
    "POCSO Act": "Protection of Children from Sexual Offences Act, 2012",
    "Domestic Violence Act": "Protection of Women from Domestic Violence Act, 2005",
    "SC/ST Act": "Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989",
    "IT Act": "Information Technology Act, 2000",
    # Labour
    "Industrial Disputes Act": "Industrial Disputes Act, 1947",
    "Factories Act": "Factories Act, 1948",
    # Family
    "Hindu Marriage Act": "Hindu Marriage Act, 1955",
    "Hindu Succession Act": "Hindu Succession Act, 1956",
    "Muslim Personal Law": "Muslim Personal Law (Shariat) Application Act, 1937",
    "Special Marriage Act": "Special Marriage Act, 1954",
    "Guardians and Wards Act": "Guardians and Wards Act, 1890",
    # Commercial
    "Companies Act": "Companies Act, 2013",
    "Insolvency Code": "Insolvency and Bankruptcy Code, 2016",
    "RERA": "Real Estate (Regulation and Development) Act, 2016",
    "Consumer Protection Act": "Consumer Protection Act, 2019",
    "Arbitration Act": "Arbitration and Conciliation Act, 1996",
    "Negotiable Instruments Act": "Negotiable Instruments Act, 1881",
    # Environment
    "Environment Protection Act": "Environment (Protection) Act, 1986",
    "Wildlife Protection Act": "Wildlife (Protection) Act, 1972",
    # Motor Vehicles
    "Motor Vehicles Act": "Motor Vehicles Act, 1988",
}

CASE_TYPES = [
    "Criminal",
    "Civil",
    "Constitutional / Writ",
    "Family / Matrimonial",
    "Labour / Industrial",
    "Consumer",
    "Commercial / Corporate",
    "Property / Land",
    "Tax / Revenue",
    "Environmental",
    "Motor Accident Claims",
    "Arbitration",
    "Intellectual Property",
    "Cyber Crime",
    "Other",
]

JURISDICTIONS = [
    "Supreme Court of India",
    "High Court",
    "District Court",
    "Sessions Court",
    "Magistrate Court",
    "Family Court",
    "Consumer Forum / Commission",
    "Labour Court / Industrial Tribunal",
    "National Company Law Tribunal (NCLT)",
    "National Green Tribunal (NGT)",
    "Debt Recovery Tribunal (DRT)",
    "Motor Accident Claims Tribunal (MACT)",
    "Arbitral Tribunal",
    "Revenue / Civil Judge",
]

# Regex patterns for entity extraction
SECTION_PATTERN = re.compile(
    r'(?:(?:Section|Sec\.?|S\.?)\s*(\d+[A-Za-z]?(?:\s*(?:and|,|&|/)\s*\d+[A-Za-z]?)*))',
    re.IGNORECASE
)
ARTICLE_PATTERN = re.compile(
    r'(?:Article\s*(\d+[A-Za-z]?(?:\s*(?:and|,|&|/)\s*\d+[A-Za-z]?)*))',
    re.IGNORECASE
)
ORDER_RULE_PATTERN = re.compile(
    r'(?:Order\s+(\w+)\s*(?:Rule\s*(\d+[A-Za-z]?)))',
    re.IGNORECASE
)
DATE_PATTERN = re.compile(
    r'\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*,?\s*\d{2,4})\b',
    re.IGNORECASE
)
PARTY_VS_PATTERN = re.compile(
    r'([A-Z][A-Za-z\s.]+?)\s+(?:v\.?s?\.?|versus)\s+([A-Z][A-Za-z\s.]+)',
    re.IGNORECASE
)
COURT_PATTERN = re.compile(
    r'(?:Supreme\s+Court|High\s+Court\s+of\s+[A-Za-z\s]+|District\s+Court|Sessions\s+Court|'
    r'Magistrate\s+Court|Family\s+Court|Consumer\s+Forum|Labour\s+Court|NCLT|NGT|DRT|MACT)',
    re.IGNORECASE
)
FIR_PATTERN = re.compile(
    r'FIR\s*(?:No\.?\s*)?(\d+[/-]?\d*)',
    re.IGNORECASE
)


class LegalBriefAnalyzer:
    """
    Stateless analyser — call ``analyze(text)`` and receive a structured dict.
    Optionally pass ``indian_kanoon`` (IndianKanoonAPI) and ``inlegalbert``
    (InLegalBERTProcessor) to enable live enrichment; without them the
    analyser still returns a fully-structured skeleton with regex-based
    extraction.
    """

    def __init__(self, indian_kanoon=None, inlegalbert=None):
        self.indian_kanoon = indian_kanoon
        self.inlegalbert = inlegalbert
        logger.info("LegalBriefAnalyzer initialised")

    # ── public entry point ─────────────────────────────────────────
    def analyze(self, text: str) -> Dict[str, Any]:
        """Full analysis pipeline.  Returns a JSON-serialisable dict."""
        if not text or not text.strip():
            return {"error": "Empty brief submitted", "status": "error"}

        text = text.strip()
        logger.info("Analysing brief (%d chars)", len(text))

        # 1. Entity extraction (regex-based — always available)
        entities = self._extract_entities(text)

        # 2. Classify case type
        case_type = self._classify_case_type(text, entities)

        # 3. Identify jurisdiction
        jurisdiction = self._identify_jurisdiction(text, entities)

        # 4. Extract legal issues
        issues = self._extract_legal_issues(text, entities)

        # 5. Build timeline
        timeline = self._extract_timeline(text)

        # 6. Map statutes
        statutes = self._map_statutes(text, entities)

        # 7. NLP enrichment (if InLegalBERT available)
        nlp_enrichment = {}
        if self.inlegalbert:
            try:
                nlp_enrichment = self.inlegalbert.process(text)
            except Exception as e:
                logger.warning("InLegalBERT enrichment skipped: %s", e)

        # 8. Indian Kanoon precedent search
        precedents = []
        if self.indian_kanoon:
            try:
                precedents = self._search_precedents(text, entities, case_type)
            except Exception as e:
                logger.warning("Precedent search skipped: %s", e)

        # 9. Strategic analysis
        analysis = self._strategic_analysis(text, entities, case_type, statutes, precedents)

        result = {
            "status": "success",
            "brief_summary": self._summarise(text),
            "entities": entities,
            "case_type": case_type,
            "jurisdiction": jurisdiction,
            "legal_issues": issues,
            "timeline": timeline,
            "statutes": statutes,
            "precedents": precedents,
            "analysis": analysis,
            "nlp_enrichment": nlp_enrichment,
        }
        logger.info("Analysis complete — %d statutes, %d precedents, %d issues",
                     len(statutes), len(precedents), len(issues))
        return result

    # ── private helpers ────────────────────────────────────────────

    def _extract_entities(self, text: str) -> Dict[str, Any]:
        """Pull parties, dates, sections, articles, courts, FIR numbers."""
        sections = SECTION_PATTERN.findall(text)
        articles = ARTICLE_PATTERN.findall(text)
        orders = ORDER_RULE_PATTERN.findall(text)
        dates = DATE_PATTERN.findall(text)
        party_matches = PARTY_VS_PATTERN.findall(text)
        courts = list(set(COURT_PATTERN.findall(text)))
        firs = FIR_PATTERN.findall(text)

        parties = []
        for petitioner, respondent in party_matches:
            parties.append({
                "petitioner": petitioner.strip(),
                "respondent": respondent.strip()
            })

        return {
            "parties": parties,
            "sections": [s.strip() for s in sections],
            "articles": [a.strip() for a in articles],
            "orders_rules": [{"order": o, "rule": r} for o, r in orders],
            "dates": list(set(dates)),
            "courts": courts,
            "fir_numbers": firs,
        }

    def _classify_case_type(self, text: str, entities: dict) -> Dict[str, Any]:
        """Rule-based case type classifier."""
        text_lower = text.lower()
        scores: Dict[str, float] = {}

        keyword_map = {
            "Criminal": ["fir", "accused", "offence", "crime", "bail", "arrest",
                         "prosecution", "charge sheet", "cognizable", "ipc", "bns",
                         "crpc", "bnss", "murder", "theft", "robbery", "fraud",
                         "cheating", "assault", "kidnap"],
            "Civil": ["suit", "plaintiff", "defendant", "decree", "injunction",
                      "damages", "specific performance", "partition", "declaration",
                      "civil suit", "cpc"],
            "Constitutional / Writ": ["writ", "fundamental right", "article 14",
                                       "article 19", "article 21", "article 32",
                                       "article 226", "habeas corpus", "mandamus",
                                       "certiorari", "prohibition", "quo warranto",
                                       "constitution"],
            "Family / Matrimonial": ["divorce", "maintenance", "custody", "marriage",
                                      "matrimonial", "alimony", "domestic violence",
                                      "dowry", "hindu marriage", "muslim law",
                                      "guardianship", "child support"],
            "Labour / Industrial": ["employee", "employer", "industrial dispute",
                                     "retrenchment", "workman", "wages", "gratuity",
                                     "provident fund", "termination", "labour"],
            "Consumer": ["consumer", "deficiency", "service", "unfair trade",
                          "goods", "complaint", "consumer forum", "ncdrc"],
            "Commercial / Corporate": ["company", "shareholder", "director",
                                        "insolvency", "nclt", "winding up",
                                        "debenture", "merger", "acquisition"],
            "Property / Land": ["property", "land", "possession", "title",
                                 "encroachment", "easement", "partition",
                                 "registration", "mutation", "revenue"],
            "Motor Accident Claims": ["motor accident", "mact", "compensation",
                                       "vehicle", "accident", "injury",
                                       "motor vehicles act"],
            "Arbitration": ["arbitration", "arbitral", "award", "arbitrator",
                            "conciliation"],
        }

        for case_type, keywords in keyword_map.items():
            count = sum(1 for kw in keywords if kw in text_lower)
            if count > 0:
                scores[case_type] = count

        if not scores:
            return {"primary": "Other", "confidence": 0.3, "secondary": []}

        sorted_types = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        primary = sorted_types[0]
        total = sum(s for _, s in sorted_types)

        return {
            "primary": primary[0],
            "confidence": round(min(primary[1] / max(total, 1), 1.0), 2),
            "secondary": [
                {"type": t, "confidence": round(s / total, 2)}
                for t, s in sorted_types[1:3]
            ]
        }

    def _identify_jurisdiction(self, text: str, entities: dict) -> Dict[str, Any]:
        """Determine most likely court / jurisdiction."""
        text_lower = text.lower()

        if entities.get("courts"):
            return {
                "identified_courts": entities["courts"],
                "suggested": entities["courts"][0]
            }

        jurisdiction_keywords = {
            "Supreme Court of India": ["supreme court", "hon'ble supreme", "sci"],
            "High Court": ["high court", "hon'ble high court"],
            "District Court": ["district court", "district judge"],
            "Sessions Court": ["sessions court", "sessions judge"],
            "Magistrate Court": ["magistrate", "jmfc", "cjm", "acjm"],
            "Family Court": ["family court"],
            "Consumer Forum / Commission": ["consumer forum", "consumer commission",
                                              "ncdrc", "scdrc", "dcdrc"],
            "NCLT": ["nclt", "company law tribunal"],
            "NGT": ["ngt", "green tribunal"],
            "MACT": ["mact", "motor accident", "claims tribunal"],
        }

        for court, keywords in jurisdiction_keywords.items():
            if any(kw in text_lower for kw in keywords):
                return {"identified_courts": [court], "suggested": court}

        return {"identified_courts": [], "suggested": "To be determined"}

    def _extract_legal_issues(self, text: str, entities: dict) -> List[Dict[str, str]]:
        """Identify distinct legal questions from the brief."""
        issues = []
        text_lower = text.lower()

        issue_indicators = [
            (r'whether\s+(.+?)(?:\.|$)', 'framed_question'),
            (r'the\s+(?:main|primary|key|central)\s+issue\s+(?:is|was)\s+(.+?)(?:\.|$)', 'stated_issue'),
            (r'question\s+(?:of|regarding)\s+(.+?)(?:\.|$)', 'question_of'),
        ]

        for pattern, source in issue_indicators:
            matches = re.findall(pattern, text_lower)
            for m in matches:
                issues.append({
                    "issue": m.strip().capitalize(),
                    "source": source,
                    "type": "explicit"
                })

        # Infer implicit issues from entities
        if entities.get("sections"):
            issues.append({
                "issue": f"Applicability of Section(s) {', '.join(entities['sections'][:5])}",
                "source": "entity_extraction",
                "type": "inferred"
            })

        if entities.get("articles"):
            issues.append({
                "issue": f"Constitutional validity under Article(s) {', '.join(entities['articles'][:3])}",
                "source": "entity_extraction",
                "type": "inferred"
            })

        # Deduplicate
        seen = set()
        unique = []
        for iss in issues:
            key = iss["issue"].lower()[:60]
            if key not in seen:
                seen.add(key)
                unique.append(iss)

        return unique or [{"issue": "General legal analysis required", "source": "default", "type": "inferred"}]

    def _extract_timeline(self, text: str) -> List[Dict[str, str]]:
        """Build a chronological timeline from date references."""
        timeline = []
        sentences = re.split(r'[.;]', text)

        for sent in sentences:
            dates_found = DATE_PATTERN.findall(sent)
            for d in dates_found:
                event = sent.strip()
                if len(event) > 200:
                    event = event[:200] + "…"
                timeline.append({"date": d, "event": event})

        return timeline

    def _map_statutes(self, text: str, entities: dict) -> List[Dict[str, str]]:
        """Find every statute / act / section referenced."""
        statutes = []
        text_lower = text.lower()

        for short_name, full_name in INDIAN_ACTS.items():
            if short_name.lower() in text_lower:
                # Find associated sections
                associated_sections = []
                for s in entities.get("sections", []):
                    # Check if section is near this act mention
                    idx = text_lower.find(short_name.lower())
                    s_idx = text_lower.find(f"section {s}".lower())
                    if idx >= 0 and s_idx >= 0 and abs(idx - s_idx) < 300:
                        associated_sections.append(s)

                statutes.append({
                    "short_name": short_name,
                    "full_name": full_name,
                    "sections": associated_sections if associated_sections else entities.get("sections", [])[:3],
                    "relevance": "high" if short_name.lower() in text_lower[:500] else "medium"
                })

        # Add any section references not yet tied to an act
        if entities.get("articles"):
            statutes.append({
                "short_name": "Constitution",
                "full_name": "Constitution of India",
                "sections": entities["articles"],
                "relevance": "high"
            })

        return statutes

    def _search_precedents(self, text: str, entities: dict, case_type: dict) -> list:
        """Query Indian Kanoon for relevant precedents."""
        if not self.indian_kanoon:
            return []

        queries = []
        # Build query from case type + key sections
        primary = case_type.get("primary", "")
        sections = entities.get("sections", [])[:3]
        if primary and primary != "Other":
            q = primary
            if sections:
                q += " Section " + " ".join(sections)
            queries.append(q)

        # Also search by parties if available
        for p in entities.get("parties", [])[:1]:
            queries.append(f"{p.get('petitioner', '')} vs {p.get('respondent', '')}")

        precedents = []
        seen_titles = set()
        for q in queries:
            try:
                results = self.indian_kanoon.search_judgments(q, pagenum=0)
                docs = results.get("docs", [])
                for doc in docs[:5]:
                    title = doc.get("title", "")
                    if title and title not in seen_titles:
                        seen_titles.add(title)
                        precedents.append({
                            "title": title,
                            "citation": doc.get("citation", ""),
                            "doc_id": doc.get("tid", ""),
                            "headline": doc.get("headline", ""),
                            "source": "Indian Kanoon"
                        })
            except Exception as e:
                logger.warning("Precedent search failed for query '%s': %s", q, e)

        return precedents

    def _strategic_analysis(self, text: str, entities: dict,
                            case_type: dict, statutes: list,
                            precedents: list) -> Dict[str, Any]:
        """Generate strategic insights for the advocate."""
        primary = case_type.get("primary", "Other")
        text_lower = text.lower()

        # Summary
        summary = self._summarise(text)

        # Arguments
        arguments = []
        if statutes:
            arguments.append(
                f"Rely on {', '.join(s['short_name'] for s in statutes[:3])} "
                f"to establish the legal basis."
            )
        if precedents:
            arguments.append(
                f"Cite {precedents[0]['title']}"
                + (f" and {len(precedents)-1} other precedent(s)" if len(precedents) > 1 else "")
                + " as supporting authority."
            )
        if entities.get("articles"):
            arguments.append(
                f"Invoke Constitutional protection under Article(s) "
                f"{', '.join(entities['articles'][:3])}."
            )

        # Type-specific arguments
        type_arguments = {
            "Criminal": [
                "Challenge the legality of arrest / FIR if procedural irregularities exist.",
                "Examine whether ingredients of the alleged offence are made out.",
                "Consider bail application if the accused is in custody."
            ],
            "Civil": [
                "Establish cause of action with documentary evidence.",
                "Check limitation period under the Limitation Act, 1963.",
                "Consider interim relief / injunction to protect rights during pendency."
            ],
            "Constitutional / Writ": [
                "Demonstrate violation of fundamental rights with specificity.",
                "Establish locus standi of the petitioner.",
                "Show that no alternative efficacious remedy is available."
            ],
            "Family / Matrimonial": [
                "Consider mediation / alternate dispute resolution as mandated by the court.",
                "Gather evidence of cruelty / desertion as applicable.",
                "Assess maintenance and custody rights carefully."
            ],
            "Consumer": [
                "Establish deficiency in service or defect in goods with evidence.",
                "File within the limitation period (2 years from cause of action).",
                "Claim appropriate compensation and costs."
            ],
        }
        arguments.extend(type_arguments.get(primary, []))

        # Challenges
        challenges = []
        if not entities.get("parties"):
            challenges.append("Party names not clearly identified — verify petitioner/respondent details.")
        if not entities.get("dates"):
            challenges.append("No dates extracted — confirm limitation period compliance.")
        if not statutes:
            challenges.append("No specific statutes identified — legal provisions need manual review.")
        if "criminal" in primary.lower() and "bail" in text_lower:
            challenges.append("Bail matters require strict compliance with S. 439 / S. 437 CrPC (now BNSS provisions).")

        # Recommendations
        recommendations = [
            "Verify all extracted entities with original documents before filing.",
            "Cross-check limitation period for the identified cause of action.",
        ]
        if precedents:
            recommendations.append("Read the full text of cited precedents to confirm applicability.")
        if primary in ("Criminal", "Constitutional / Writ"):
            recommendations.append("Consider urgency — prepare for early hearing listing.")
        recommendations.append("Prepare a comprehensive evidence matrix to support each legal issue.")

        return {
            "summary": summary,
            "arguments": arguments,
            "challenges": challenges,
            "recommendations": recommendations,
            "evidence_checklist": self._evidence_checklist(primary, entities),
            "next_steps": self._next_steps(primary),
        }

    def _summarise(self, text: str, max_len: int = 500) -> str:
        """Simple extractive summary — first meaningful sentences."""
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        summary = ""
        for s in sentences:
            if len(summary) + len(s) > max_len:
                break
            summary += s + " "
        return summary.strip() or text[:max_len]

    def _evidence_checklist(self, case_type: str, entities: dict) -> List[str]:
        """Suggest evidence to collect based on case type."""
        base = ["Signed Vakalatnama", "Court fee stamp papers", "Identity proof of parties"]
        type_evidence = {
            "Criminal": ["Copy of FIR", "Charge sheet", "Bail application",
                          "Medical / forensic reports", "Witness statements"],
            "Civil": ["Original contracts / agreements", "Property documents",
                       "Correspondence / notices", "Valuation reports"],
            "Constitutional / Writ": ["Government orders under challenge",
                                       "Representation letters sent",
                                       "Constitutional provision analysis"],
            "Family / Matrimonial": ["Marriage certificate", "Income proof",
                                      "Evidence of cruelty / desertion",
                                      "Children's school records"],
            "Property / Land": ["Title deed", "Survey records", "Mutation entries",
                                 "Tax receipts", "Encumbrance certificate"],
            "Consumer": ["Purchase invoice / receipt", "Warranty documents",
                          "Complaint letters", "Expert opinion on defect"],
            "Motor Accident Claims": ["FIR / accident report", "Medical bills",
                                       "Disability certificate", "Income proof",
                                       "Vehicle registration / insurance"],
        }
        return base + type_evidence.get(case_type, [])

    def _next_steps(self, case_type: str) -> List[str]:
        """Suggest procedural next steps."""
        common = [
            "1. Finalise and verify all facts with the client",
            "2. Draft the petition / complaint / suit",
            "3. Arrange supporting documents and evidence",
            "4. File before the appropriate forum with court fee",
            "5. Serve notice on opposite party as required",
        ]
        if case_type == "Criminal":
            common.insert(2, "2a. If bail needed, file bail application on priority")
        if case_type in ("Civil", "Property / Land"):
            common.insert(2, "2a. Consider sending legal notice under S. 80 CPC if against government")
        return common
