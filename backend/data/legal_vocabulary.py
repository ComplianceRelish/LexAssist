"""
LexAssist — Legal Domain Vocabulary
=====================================
Comprehensive vocabulary lists for STT boosting, post-correction, and
context priming. These are injected into Whisper prompts and used by the
LLM correction layer to fix misrecognised legal terms.
"""

# ── Latin Maxims & Legal Phrases ───────────────────────────────────

LATIN_MAXIMS = [
    "habeas corpus", "mens rea", "actus reus", "prima facie", "res judicata",
    "stare decisis", "ultra vires", "intra vires", "sub judice", "obiter dicta",
    "ratio decidendi", "amicus curiae", "inter alia", "mutatis mutandis",
    "nemo judex in causa sua", "audi alteram partem", "de facto", "de jure",
    "ex parte", "in personam", "in rem", "lis pendens", "mala fide",
    "bona fide", "ipso facto", "locus standi", "sui generis", "caveat emptor",
    "volenti non fit injuria", "res ipsa loquitur", "damnum sine injuria",
    "injuria sine damno", "ignorantia juris non excusat", "noscitur a sociis",
    "ejusdem generis", "expressio unius est exclusio alterius",
    "generalia specialibus non derogant", "doli incapax", "pro bono",
    "subpoena duces tecum", "certiorari", "mandamus", "quo warranto",
    "prohibition", "habeas corpus ad subjiciendum", "nolle prosequi",
    "non sequitur", "per incuriam", "per curiam", "ab initio",
    "ad hoc", "ad interim", "ante litem", "causa mortis",
    "corpus delicti", "in camera", "in limine", "functus officio",
    "nexus", "quantum meruit", "quid pro quo", "sine die",
    "status quo ante", "tort feasor", "tortfeasor", "vis major",
    "force majeure", "void ab initio",
]

# ── Indian Legal Terminology ──────────────────────────────────────

INDIAN_LEGAL_TERMS = [
    "vakalatnama", "lok adalat", "tehsildar", "panchayat", "gram panchayat",
    "taluk", "taluka", "patwari", "sarpanch", "zillah", "zilla parishad",
    "naib tehsildar", "munsif", "sheristadar", "nazir", "amin",
    "amaldar", "faujdari", "diwani", "adalat", "mahkama",
    "plaintiff", "defendant", "petitioner", "respondent",
    "cause title", "plaint", "written statement", "rejoinder",
    "surrejoinder", "affidavit", "deposition", "examination in chief",
    "cross examination", "re-examination", "dying declaration",
    "first information report", "FIR", "charge sheet", "challan",
    "panchnama", "inquest", "mahazar", "seizure memo",
    "bail bond", "surety bond", "personal bond", "anticipatory bail",
    "regular bail", "interim bail", "default bail", "statutory bail",
    "cognizable offence", "non-cognizable offence", "bailable offence",
    "non-bailable offence", "compoundable offence", "non-compoundable offence",
    "summons case", "warrant case", "sessions case", "special case",
    "lok adalat award", "arbitral award", "consent decree",
    "ex parte decree", "preliminary decree", "final decree",
    "interlocutory order", "interim order", "stay order",
    "injunction", "temporary injunction", "permanent injunction",
    "mandatory injunction", "prohibitory injunction",
    "writ petition", "special leave petition", "SLP",
    "review petition", "curative petition", "mercy petition",
    "execution petition", "contempt petition", "transfer petition",
    "letters patent appeal", "LPA", "civil revision",
    "criminal revision", "criminal appeal", "civil appeal",
    "reference", "original petition", "company petition",
    "insolvency petition", "CIRP", "resolution professional",
    "committee of creditors", "COC", "NCLT", "NCLAT",
    "consumer dispute redressal commission", "CDRC",
    "real estate regulatory authority", "RERA",
    "National Green Tribunal", "NGT",
    "Central Administrative Tribunal", "CAT",
    "Debt Recovery Tribunal", "DRT", "DRAT",
    "Securities Appellate Tribunal", "SAT",
    "Income Tax Appellate Tribunal", "ITAT",
    "Competition Commission of India", "CCI",
    "SEBI", "RBI", "TRAI", "NHRC", "SHRC",
]

# ── Indian Statutes & Acts ────────────────────────────────────────

INDIAN_STATUTES = [
    # Core codes
    "Indian Penal Code", "IPC", "Bharatiya Nyaya Sanhita", "BNS",
    "Code of Criminal Procedure", "CrPC", "Bharatiya Nagarik Suraksha Sanhita", "BNSS",
    "Code of Civil Procedure", "CPC", "Indian Evidence Act",
    "Bharatiya Sakshya Adhiniyam", "BSA",
    "Constitution of India",
    # Major acts
    "Transfer of Property Act", "TP Act",
    "Specific Relief Act", "SRA",
    "Indian Contract Act", "ICA",
    "Negotiable Instruments Act", "NI Act",
    "Limitation Act", "Hindu Marriage Act", "HMA",
    "Hindu Succession Act", "HSA",
    "Muslim Personal Law", "Shariat Act",
    "Special Marriage Act", "SMA",
    "Hindu Minority and Guardianship Act",
    "Guardians and Wards Act",
    "Indian Succession Act",
    "Consumer Protection Act", "CPA",
    "Real Estate Regulation and Development Act", "RERA",
    "Arbitration and Conciliation Act",
    "Companies Act", "Companies Act 2013",
    "Insolvency and Bankruptcy Code", "IBC",
    "Information Technology Act", "IT Act",
    "NDPS Act", "Narcotic Drugs and Psychotropic Substances Act",
    "POCSO Act", "Protection of Children from Sexual Offences Act",
    "SC ST Prevention of Atrocities Act",
    "Motor Vehicles Act", "MV Act",
    "Environment Protection Act", "EPA",
    "Electricity Act", "Electricity Act 2003",
    "Income Tax Act", "IT Act 1961",
    "Goods and Services Tax", "GST", "CGST", "SGST", "IGST",
    "Prevention of Money Laundering Act", "PMLA",
    "Foreign Exchange Management Act", "FEMA",
    "Right to Information Act", "RTI",
    "Domestic Violence Act", "PWDVA",
    "Prevention of Corruption Act", "PCA",
    "National Security Act", "NSA",
    "Unlawful Activities Prevention Act", "UAPA",
    "Arms Act", "Explosives Act",
    "Indian Stamps Act", "Registration Act",
    "Land Acquisition Act", "LARR Act",
    "Mines and Minerals Act", "MMDR Act",
    "Factories Act", "Industrial Disputes Act",
    "Payment of Wages Act", "Minimum Wages Act",
    "Employees State Insurance Act", "ESI Act",
    "Employees Provident Funds Act", "EPF Act",
    "Sexual Harassment of Women at Workplace Act", "POSH Act",
    "Juvenile Justice Act", "JJ Act",
    "Mental Healthcare Act",
    "Rights of Persons with Disabilities Act",
    "Maintenance and Welfare of Parents and Senior Citizens Act",
    "Food Safety and Standards Act", "FSSAI",
    "Competition Act", "Competition Act 2002",
    "Trademark Act", "Copyright Act", "Patent Act",
    "Indian Telegraph Act", "Telecom Regulatory Authority of India Act",
    "Wildlife Protection Act", "Forest Conservation Act",
    "Water Prevention and Control of Pollution Act",
    "Air Prevention and Control of Pollution Act",
    "Bonded Labour System Abolition Act",
    "Child Labour Prohibition Act",
    "Scheduled Castes and Scheduled Tribes Act",
]

# ── Courts & Tribunals ────────────────────────────────────────────

COURTS_AND_TRIBUNALS = [
    "Supreme Court of India", "High Court",
    "District Court", "Sessions Court", "Chief Judicial Magistrate",
    "Metropolitan Magistrate", "Judicial Magistrate First Class", "JMFC",
    "Civil Judge Junior Division", "Civil Judge Senior Division",
    "Additional District Judge", "ADJ",
    "Principal District Judge", "Family Court",
    "Labour Court", "Industrial Tribunal",
    "Allahabad High Court", "Bombay High Court", "Calcutta High Court",
    "Madras High Court", "Delhi High Court", "Karnataka High Court",
    "Kerala High Court", "Gujarat High Court", "Rajasthan High Court",
    "Punjab and Haryana High Court", "Patna High Court",
    "Andhra Pradesh High Court", "Telangana High Court",
    "Orissa High Court", "Gauhati High Court",
    "Jharkhand High Court", "Uttarakhand High Court",
    "Chhattisgarh High Court", "Himachal Pradesh High Court",
    "Jammu and Kashmir High Court", "Manipur High Court",
    "Meghalaya High Court", "Sikkim High Court", "Tripura High Court",
]

# ── Citation Formats ──────────────────────────────────────────────

CITATION_PATTERNS = [
    "AIR", "SCC", "SCR", "SCJ",
    "CrLJ", "Criminal Law Journal",
    "Bom CR", "Bom LR", "All ER",
    "DLT", "Delhi Law Times",
    "KLT", "Kerala Law Times",
    "MLJ", "Madras Law Journal",
    "CLT", "Cuttack Law Times",
    "GLR", "Gujarat Law Reporter",
    "MANU", "LiveLaw", "Indian Kanoon",
    "versus", "v/s",
]

# ── Section/Article Patterns (for Whisper prompt priming) ─────────

SECTION_PATTERNS = [
    "Section 302", "Section 304", "Section 306", "Section 307",
    "Section 376", "Section 498A", "Section 420", "Section 406",
    "Section 34", "Section 120B", "Section 149", "Section 34",
    "Section 138", "Section 125", "Section 144", "Section 151",
    "Section 154", "Section 161", "Section 164", "Section 200",
    "Section 482", "Section 439", "Section 437", "Section 438",
    "Article 14", "Article 19", "Article 21", "Article 32",
    "Article 226", "Article 227", "Article 136", "Article 142",
    "Article 141", "Article 300A", "Article 311", "Article 352",
    "Order 7 Rule 11", "Order 39 Rule 1", "Order 39 Rule 2",
    "Order 6 Rule 17", "Order 1 Rule 10", "Order 22",
    "Order 37", "Order 38 Rule 5",
]


def build_whisper_prompt() -> str:
    """
    Build a comprehensive prompt for OpenAI Whisper to boost
    recognition accuracy on legal terminology.
    
    Whisper uses the prompt as context to guide transcription.
    Max ~224 tokens — we prioritise the most impactful terms.
    """
    # Select a representative subset to stay within token limits
    key_terms = (
        LATIN_MAXIMS[:20]
        + INDIAN_LEGAL_TERMS[:30]
        + INDIAN_STATUTES[:25]
        + COURTS_AND_TRIBUNALS[:10]
        + CITATION_PATTERNS[:10]
        + SECTION_PATTERNS[:10]
    )
    
    prompt = (
        "Legal dictation — Indian law. Terms include: "
        + ", ".join(key_terms)
        + ". Section numbers, AIR citations, and SCC references may appear."
    )
    return prompt


def build_correction_context() -> str:
    """
    Build a comprehensive vocabulary reference for the LLM
    post-correction layer. No token limit — Claude handles long context.
    """
    sections = {
        "Latin Legal Maxims": LATIN_MAXIMS,
        "Indian Legal Terminology": INDIAN_LEGAL_TERMS,
        "Indian Statutes and Acts": INDIAN_STATUTES,
        "Courts and Tribunals": COURTS_AND_TRIBUNALS,
        "Citation Formats": CITATION_PATTERNS,
        "Common Section References": SECTION_PATTERNS,
    }
    
    parts = []
    for heading, terms in sections.items():
        parts.append(f"**{heading}:** {', '.join(terms)}")
    
    return "\n\n".join(parts)


# ── Role-Based Context Priming ────────────────────────────────────

ROLE_CONTEXTS = {
    "advocate": (
        "The speaker is a practicing advocate dictating legal content. "
        "Expect petition language, court procedures, section citations, "
        "case references, and formal legal arguments."
    ),
    "judge_clerk": (
        "The speaker is a judge's clerk dictating court orders or case notes. "
        "Expect order sheets, case numbers, hearing dates, and judicial terminology."
    ),
    "paralegal": (
        "The speaker is a paralegal describing case facts for documentation. "
        "Expect factual narratives with legal terms, party names, and dates."
    ),
    "student": (
        "The speaker is a law student researching a legal topic. "
        "Expect questions about legal concepts, landmark cases, and statutory provisions."
    ),
    "consumer": (
        "The speaker is filing a consumer complaint. "
        "Expect product/service descriptions, complaint details, and consumer protection terminology."
    ),
    "litigant": (
        "The speaker is a self-represented litigant describing their case. "
        "Expect informal language mixed with legal terms, personal narratives, and grievances."
    ),
}


# ── Common Misrecognitions (for fuzzy matching correction) ────────

COMMON_MISRECOGNITIONS = {
    # Misheard → Correct
    "habeas corpus": ["hey bs corpus", "habeas corpse", "habis corpus", "habiyas corpus"],
    "mens rea": ["men's ray", "mens ray", "men's rea", "menstreia"],
    "actus reus": ["actus reis", "act us reus", "actors reus"],
    "prima facie": ["prima facia", "prima fachy", "prima facy"],
    "res judicata": ["race judicata", "res judy catah", "race judicata"],
    "tortfeasor": ["tort feasor", "tort feezer", "tortfeesor"],
    "vakalatnama": ["wakalat nama", "vakalt nama", "vakalat nama", "wakalatnamah"],
    "lok adalat": ["lock adalat", "lok adalaat", "local adalat"],
    "tehsildar": ["tahsildar", "tehsildaar", "technical dar"],
    "cognizable": ["recognizable", "cognisable"],
    "FIR": ["fear", "fir tree"],
    "CrPC": ["CRPC", "cr pc", "see ar pee see"],
    "IPC": ["i p c", "eye pee see"],
    "CPC": ["c p c", "see pee see"],
    "BNS": ["b n s", "bee en ess"],
    "BNSS": ["b n s s", "bee en ess ess"],
    "SCC": ["s c c", "ess see see"],
    "AIR": ["air", "a i r"],
    "Section 302": ["section 3 0 2", "section three hundred two"],
    "Section 498A": ["section 4 9 8 a", "section four ninety eight a"],
    "Section 138": ["section 1 3 8", "section one thirty eight"],
    "Article 21": ["article 2 1", "article twenty one"],
    "Article 226": ["article 2 2 6", "article two twenty six"],
    "subpoena duces tecum": ["subpoena doosis tekum", "subpena duces techum"],
    "suo motu": ["suo motto", "su moto", "suomoto"],
    "writ petition": ["rit petition", "right petition"],
    "special leave petition": ["special leaf petition"],
    "anticipatory bail": ["anticipatory bale", "anticipetory bail"],
    "chargesheet": ["charge seat", "charge shit"],
}
