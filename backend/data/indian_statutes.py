"""
Indian Statutes — Key Sections Reference
==========================================
Local reference for the ~20 most-cited Indian acts with their most
frequently invoked sections.  Used to inject authoritative section text
into the Claude analysis prompt so it never hallucinates section content.

Structure:
    STATUTES[act_short_name] = {
        "full_name": str,
        "year": int,
        "replaced_by": str | None,      # new-code short-name if repealed
        "sections": {
            "<number>": "<text summary>"
        }
    }

Maintained manually — update when amendments are notified.
Last updated: 2026-03-23
"""

STATUTES = {
    # ═══════════════════════════════════════════════════════════════
    # CRIMINAL — OLD CODES
    # ═══════════════════════════════════════════════════════════════
    "IPC": {
        "full_name": "Indian Penal Code, 1860",
        "year": 1860,
        "replaced_by": "BNS",
        "sections": {
            "302": "Punishment for murder — imprisonment for life or death, and fine.",
            "304": "Punishment for culpable homicide not amounting to murder.",
            "304A": "Causing death by negligence — imprisonment up to 2 years, or fine, or both.",
            "304B": "Dowry death — where death within 7 years of marriage under abnormal circumstances, minimum 7 years imprisonment.",
            "306": "Abetment of suicide — imprisonment up to 10 years and fine.",
            "307": "Attempt to murder — imprisonment up to 10 years and fine; if hurt caused, imprisonment for life.",
            "323": "Punishment for voluntarily causing hurt — imprisonment up to 1 year, or fine up to ₹1,000, or both.",
            "354": "Assault or criminal force to woman with intent to outrage modesty — imprisonment 1-5 years and fine.",
            "376": "Punishment for rape — rigorous imprisonment not less than 10 years, extendable to life, and fine.",
            "392": "Punishment for robbery — rigorous imprisonment up to 10 years and fine.",
            "406": "Punishment for criminal breach of trust — imprisonment up to 3 years, or fine, or both.",
            "420": "Cheating and dishonestly inducing delivery of property — imprisonment up to 7 years and fine.",
            "498A": "Husband or relative of husband subjecting woman to cruelty — imprisonment up to 3 years and fine.",
            "499": "Defamation — whoever makes or publishes any imputation concerning any person.",
            "500": "Punishment for defamation — simple imprisonment up to 2 years, or fine, or both.",
            "506": "Punishment for criminal intimidation — imprisonment up to 2 years, or fine, or both.",
            "509": "Word, gesture or act intended to insult the modesty of a woman.",
        },
    },

    "CrPC": {
        "full_name": "Code of Criminal Procedure, 1973",
        "year": 1973,
        "replaced_by": "BNSS",
        "sections": {
            "125": "Order for maintenance of wives, children and parents — Magistrate may order monthly allowance.",
            "144": "Power to issue order in urgent cases of nuisance or apprehended danger.",
            "154": "Information in cognizable cases (FIR) — every information relating to commission of a cognizable offence shall be recorded.",
            "155": "Information as to non-cognizable cases and investigation of such cases.",
            "156": "Police officer's power to investigate cognizable cases.",
            "161": "Examination of witnesses by police — oral examination of persons acquainted with facts.",
            "164": "Recording of confessions and statements before Magistrate.",
            "167": "Procedure when investigation cannot be completed in 24 hours — judicial remand provisions.",
            "173": "Report of police officer on completion of investigation (charge sheet).",
            "190": "Cognizance of offences by Magistrate.",
            "197": "Prosecution of Judges and public servants — sanction requirements.",
            "200": "Examination of complainant in complaint cases.",
            "227": "Discharge of accused when no sufficient ground for proceeding.",
            "228": "Framing of charge when there is ground for presuming accused committed offence.",
            "239": "Discharge in warrant cases on police report.",
            "241": "When accused shall be discharged in summons cases.",
            "313": "Power to examine the accused — court may examine accused to explain circumstances.",
            "354": "Language and contents of judgment.",
            "374": "Appeals from convictions — appeal lies to High Court or Sessions Court.",
            "378": "Appeal in case of acquittal — State Government or Central Government may appeal.",
            "389": "Suspension of sentence pending appeal; release on bail.",
            "397": "Calling for records to exercise powers of revision.",
            "401": "High Court's powers of revision.",
            "436": "In what cases bail to be taken — bailable offences.",
            "437": "When bail may be granted in non-bailable offences.",
            "438": "Direction for grant of anticipatory bail.",
            "439": "Special powers of High Court or Court of Session regarding bail.",
            "482": "Saving of inherent powers of High Court — nothing shall limit or affect the inherent powers.",
        },
    },

    "Evidence Act": {
        "full_name": "Indian Evidence Act, 1872",
        "year": 1872,
        "replaced_by": "BSA",
        "sections": {
            "3": "Interpretation clause — definitions of court, fact, relevant, proved, disproved, not proved.",
            "17": "Admission — statement, oral or documentary, suggesting inference about a fact in issue.",
            "21": "Proof of admissions against persons making them.",
            "24": "Confession caused by inducement, threat or promise — irrelevant in criminal proceedings.",
            "25": "Confession to police officer not to be proved.",
            "27": "How much of information received from accused may be proved.",
            "32": "Cases in which statement of relevant fact by person who is dead or cannot be found is relevant (dying declaration).",
            "45": "Opinions of experts — relevant when court has to form an opinion on foreign law, science, art, handwriting, finger impressions.",
            "65B": "Admissibility of electronic records — certificate required for computer output.",
            "101": "Burden of proof — whoever desires court to give judgment must prove those facts.",
            "106": "Burden of proving fact especially within knowledge — when any fact is especially within knowledge of any person.",
            "112": "Birth during marriage, conclusive proof of legitimacy.",
            "113A": "Presumption as to abetment of suicide by a married woman.",
            "113B": "Presumption as to dowry death.",
            "114": "Court may presume existence of certain facts — illustration (g) — evidence which could be and is not produced.",
        },
    },

    # ═══════════════════════════════════════════════════════════════
    # CRIMINAL — NEW CODES (effective 1 July 2024)
    # ═══════════════════════════════════════════════════════════════
    "BNS": {
        "full_name": "Bharatiya Nyaya Sanhita, 2023",
        "year": 2023,
        "replaced_by": None,
        "sections": {
            "101": "Murder — equivalent of IPC S.302.",
            "103": "Punishment for murder — death or imprisonment for life, and fine.",
            "105": "Culpable homicide not amounting to murder — equivalent of IPC S.304.",
            "106": "Causing death by negligence — equivalent of IPC S.304A; up to 5 years and fine.",
            "108": "Abetment of suicide — equivalent of IPC S.306.",
            "109": "Attempt to murder — equivalent of IPC S.307.",
            "115": "Voluntarily causing hurt — equivalent of IPC S.323.",
            "74": "Assault on woman with intent to outrage modesty — equivalent of IPC S.354.",
            "63": "Rape — equivalent of IPC S.376; minimum 10 years RI extendable to life.",
            "309": "Robbery — equivalent of IPC S.392.",
            "316": "Criminal breach of trust — equivalent of IPC S.406.",
            "318": "Cheating — equivalent of IPC S.420.",
            "85": "Cruelty by husband or relative — equivalent of IPC S.498A.",
            "356": "Defamation — equivalent of IPC S.499/500.",
            "351": "Criminal intimidation — equivalent of IPC S.506.",
        },
    },

    "BNSS": {
        "full_name": "Bharatiya Nagarik Suraksha Sanhita, 2023",
        "year": 2023,
        "replaced_by": None,
        "sections": {
            "144": "Maintenance of wives, children, parents — equivalent of CrPC S.125.",
            "163": "Order in urgent cases of nuisance — equivalent of CrPC S.144.",
            "173": "FIR — information in cognizable cases — equivalent of CrPC S.154. Now allows electronic/online FIR filing.",
            "175": "Investigation of cognizable cases — equivalent of CrPC S.156.",
            "180": "Recording statements — equivalent of CrPC S.161.",
            "183": "Confessions before Magistrate — equivalent of CrPC S.164. Mandatory audio-video recording.",
            "187": "Remand provisions — equivalent of CrPC S.167. Max 15 days police custody; 60/90 days judicial.",
            "193": "Charge sheet — equivalent of CrPC S.173.",
            "210": "Cognizance by Magistrate — equivalent of CrPC S.190.",
            "251": "Discharge — equivalent of CrPC S.227.",
            "252": "Framing of charge — equivalent of CrPC S.228.",
            "346": "Examination of accused — equivalent of CrPC S.313.",
            "480": "Bail in bailable offences — equivalent of CrPC S.436.",
            "481": "Bail in non-bailable offences — equivalent of CrPC S.437.",
            "482": "Anticipatory bail — equivalent of CrPC S.438.",
            "483": "Special bail powers of HC/Sessions — equivalent of CrPC S.439.",
            "528": "Inherent powers of High Court — equivalent of CrPC S.482.",
        },
    },

    "BSA": {
        "full_name": "Bharatiya Sakshya Adhiniyam, 2023",
        "year": 2023,
        "replaced_by": None,
        "sections": {
            "2": "Definitions — court, document, evidence, fact, oral evidence, proved, disproved.",
            "15": "Admission defined — equivalent of Evidence Act S.17.",
            "22": "Confession to police — equivalent of Evidence Act S.25.",
            "23": "Confession by accused in police custody — equivalent of Evidence Act S.26.",
            "24": "How much of information from accused provable — equivalent of Evidence Act S.27.",
            "26": "Dying declaration — equivalent of Evidence Act S.32.",
            "39": "Expert opinion — equivalent of Evidence Act S.45.",
            "63": "Admissibility of electronic/digital records — replaces Evidence Act S.65B. Certificate requirements updated.",
            "104": "Burden of proof — equivalent of Evidence Act S.101.",
            "106": "Burden when fact is within special knowledge — equivalent of Evidence Act S.106.",
            "112": "Presumption of legitimacy — equivalent of Evidence Act S.112.",
            "118": "Court may presume certain facts — equivalent of Evidence Act S.114.",
        },
    },

    # ═══════════════════════════════════════════════════════════════
    # CIVIL
    # ═══════════════════════════════════════════════════════════════
    "CPC": {
        "full_name": "Code of Civil Procedure, 1908",
        "year": 1908,
        "replaced_by": None,
        "sections": {
            "9": "Courts to try all civil suits unless barred — civil courts have jurisdiction to try all suits of civil nature.",
            "10": "Stay of suit — no court shall proceed with trial of any suit in which the matter is directly and substantially in issue in a previously instituted suit.",
            "11": "Res judicata — no court shall try any suit or issue which has been directly and substantially in issue in a former suit.",
            "47": "Questions to be determined by the court executing decree.",
            "89": "Settlement of disputes outside the court — mediation, arbitration, conciliation, Lok Adalat.",
            "96": "Appeal from original decree — appeal lies from every decree passed by any court exercising original jurisdiction.",
            "100": "Second appeal — lies to the High Court on substantial question of law.",
            "115": "Revision — High Court may call for record of any case decided by any subordinate court.",
            "151": "Saving of inherent powers — nothing shall limit or affect inherent powers of court to make orders necessary for ends of justice.",
            "Order VII Rule 11": "Rejection of plaint — where it does not disclose a cause of action, or is barred by law.",
            "Order IX Rule 13": "Setting aside decree ex parte — defendant may apply to set aside decree if summons not duly served or sufficient cause shown.",
            "Order XXXIX Rules 1-2": "Temporary injunctions — court may grant to restrain breach of contract or waste/alienation/wrongful disposal of property.",
            "Order XLIII": "Appeals from orders — enumerated list of appealable interlocutory orders.",
        },
    },

    # ═══════════════════════════════════════════════════════════════
    # CONSTITUTION
    # ═══════════════════════════════════════════════════════════════
    "Constitution": {
        "full_name": "Constitution of India, 1950",
        "year": 1950,
        "replaced_by": None,
        "sections": {
            "Article 12": "Definition of 'State' — includes Government, Parliament, Legislature, local authorities, and other authorities under control of Government of India.",
            "Article 13": "Laws inconsistent with or in derogation of the fundamental rights — void to extent of inconsistency.",
            "Article 14": "Equality before the law — the State shall not deny to any person equality before the law or equal protection of the laws.",
            "Article 15": "Prohibition of discrimination on grounds of religion, race, caste, sex or place of birth.",
            "Article 19": "Protection of certain rights regarding freedom of speech and expression, assembly, association, movement, residence, and profession.",
            "Article 20": "Protection in respect of conviction for offences — no ex post facto law, no double jeopardy, no self-incrimination.",
            "Article 21": "Protection of life and personal liberty — no person shall be deprived of his life or personal liberty except according to procedure established by law.",
            "Article 21A": "Right to education — State shall provide free and compulsory education to all children aged 6-14 years.",
            "Article 22": "Protection against arrest and detention — right to be informed of grounds, right to consult lawyer, production before magistrate within 24 hours.",
            "Article 25": "Freedom of conscience and free profession, practice and propagation of religion.",
            "Article 32": "Remedies for enforcement of fundamental rights — right to move the Supreme Court by appropriate proceedings. Writs: habeas corpus, mandamus, prohibition, certiorari, quo warranto.",
            "Article 136": "Special leave to appeal by the Supreme Court — in any cause or matter from any court or tribunal.",
            "Article 141": "Law declared by Supreme Court to be binding on all courts.",
            "Article 142": "Enforcement of decrees and orders of Supreme Court — complete justice in any cause or matter.",
            "Article 226": "Power of High Courts to issue writs — for enforcement of fundamental rights and for any other purpose.",
            "Article 227": "Power of superintendence over all courts by the High Court.",
            "Article 300A": "No person shall be deprived of his property save by authority of law.",
            "Article 368": "Power of Parliament to amend the Constitution and procedure therefor.",
        },
    },

    # ═══════════════════════════════════════════════════════════════
    # FAMILY LAW
    # ═══════════════════════════════════════════════════════════════
    "Hindu Marriage Act": {
        "full_name": "Hindu Marriage Act, 1955",
        "year": 1955,
        "replaced_by": None,
        "sections": {
            "5": "Conditions for a Hindu marriage — age (21/18), monogamy, mental capacity, prohibited relationships, sapinda relationship.",
            "7": "Ceremonies for a Hindu marriage — saptapadi (seven steps around sacred fire).",
            "9": "Restitution of conjugal rights — when either spouse withdraws from other's society without reasonable excuse.",
            "11": "Void marriages — contravention of conditions in S.5(i), (iv), (v).",
            "12": "Voidable marriages — impotence, consent by fraud or force, pregnancy by another, mental disorder.",
            "13": "Divorce — on grounds of adultery, cruelty, desertion (2+ years), conversion, unsoundness of mind, leprosy, venereal disease, renunciation, not heard alive for 7 years.",
            "13B": "Divorce by mutual consent — both parties living separately for 1+ year, agreed to dissolve.",
            "15": "Divorced persons when may marry again — after appeal period or 90 days (mutual consent).",
            "24": "Maintenance pendente lite and expenses of proceedings.",
            "25": "Permanent alimony and maintenance.",
            "26": "Custody of children — in any proceeding, court may make orders for custody, maintenance and education.",
        },
    },

    # ═══════════════════════════════════════════════════════════════
    # SPECIFIC RELIEF
    # ═══════════════════════════════════════════════════════════════
    "Specific Relief Act": {
        "full_name": "Specific Relief Act, 1963",
        "year": 1963,
        "replaced_by": None,
        "sections": {
            "6": "Suit by person dispossessed of immovable property — may recover within 6 months without proving title.",
            "12": "Specific performance of contract — court shall enforce subject to provisions of S.11A, 14, 16.",
            "14": "Contracts not specifically enforceable — involving personal skill, minute/numerous details, not determinable.",
            "16": "Personal bars to relief — plaintiff must not have unfair advantage, must have performed their part, must be ready and willing.",
            "34": "Declaratory decrees — any person entitled to legal character or right may sue for declaration.",
            "36": "Preventive relief — temporary and perpetual injunctions.",
            "38": "Perpetual injunction — granted to prevent breach of obligation in plaintiff's favour.",
            "39": "Mandatory injunction — to prevent breach of obligation, court may grant requiring defendant to perform act.",
        },
    },

    # ═══════════════════════════════════════════════════════════════
    # LIMITATION
    # ═══════════════════════════════════════════════════════════════
    "Limitation Act": {
        "full_name": "Limitation Act, 1963",
        "year": 1963,
        "replaced_by": None,
        "sections": {
            "3": "Bar of limitation — every suit after prescribed period shall be dismissed even if limitation not set up as defence.",
            "5": "Extension of prescribed period in certain cases — appeal or application may be admitted after the period if sufficient cause for delay.",
            "12": "Exclusion of time in legal proceedings — time spent obtaining copies, court holidays, etc.",
            "14": "Exclusion of time of proceeding bona fide in wrong court.",
            "17": "Effect of fraud or mistake — when fraud or mistake, limitation begins from discovery.",
            "Article 54": "Suit for specific performance — 3 years from date fixed for performance, or refusal.",
            "Article 58": "Suit for declaration — 3 years from when right to sue first accrues.",
            "Article 65": "Suit for possession based on title — 12 years from when possession becomes adverse.",
            "Article 113": "Suit for which no period of limitation is provided — 3 years.",
            "Article 137": "Any other application — 3 years from when right to apply accrues.",
        },
    },

    # ═══════════════════════════════════════════════════════════════
    # COMMERCIAL / CONSUMER
    # ═══════════════════════════════════════════════════════════════
    "Arbitration Act": {
        "full_name": "Arbitration and Conciliation Act, 1996",
        "year": 1996,
        "replaced_by": None,
        "sections": {
            "7": "Arbitration agreement — shall be in writing; can be in an exchange of letters, telex, telegrams or electronic communication.",
            "8": "Power of judicial authority to refer parties to arbitration — if there is a valid arbitration agreement.",
            "9": "Interim measures by court — before or during arbitration or after award, party may apply to court.",
            "11": "Appointment of arbitrators — party may request Supreme Court / High Court to appoint.",
            "34": "Application for setting aside arbitral award — fraud, incapacity, improper composition, public policy.",
            "36": "Enforcement of arbitral award — deemed decree of court for execution.",
            "37": "Appealable orders — granting/refusing interim measures, setting aside/refusing to set aside award.",
        },
    },

    "NI Act": {
        "full_name": "Negotiable Instruments Act, 1881",
        "year": 1881,
        "replaced_by": None,
        "sections": {
            "118": "Presumptions as to negotiable instruments — consideration, date, acceptance, transfer, endorsement holder in due course.",
            "138": "Dishonour of cheque for insufficiency of funds — imprisonment up to 2 years, or fine up to twice the cheque amount, or both.",
            "139": "Presumption in favour of holder — it shall be presumed that holder received cheque for discharge of debt or liability.",
            "141": "Offences by companies — company and every person in charge responsible.",
            "142": "Cognizance of offences — complaint by payee or holder in due course, filed within 30 days of cause of action.",
            "143": "Power of court to try cases summarily.",
            "148": "Power of Appellate Court to order deposit — minimum 20% of fine or compensation.",
        },
    },

    "Consumer Protection Act": {
        "full_name": "Consumer Protection Act, 2019",
        "year": 2019,
        "replaced_by": None,
        "sections": {
            "2(7)": "Consumer — any person who buys goods or hires services for consideration (includes online/electronic transactions).",
            "2(11)": "Deficiency — any fault, imperfection, shortcoming or inadequacy in quality, nature and manner of performance of a service.",
            "34": "District Commission — jurisdiction up to ₹1 crore.",
            "47": "State Commission — jurisdiction ₹1 crore to ₹10 crore; also appellate authority for District Commission.",
            "58": "National Commission — jurisdiction above ₹10 crore; appellate for State Commission.",
            "69": "Mediation — parties may be referred to mediation at any stage.",
        },
    },

    # ═══════════════════════════════════════════════════════════════
    # SPECIAL CRIMINAL
    # ═══════════════════════════════════════════════════════════════
    "NDPS Act": {
        "full_name": "Narcotic Drugs and Psychotropic Substances Act, 1985",
        "year": 1985,
        "replaced_by": None,
        "sections": {
            "8": "Prohibition of certain operations — no person shall cultivate, produce, possess, sell, transport narcotics except as permitted.",
            "20": "Punishment for contravention in relation to cannabis plant and cannabis.",
            "21": "Punishment for contravention in relation to manufactured drugs — up to 20 years RI for commercial quantity.",
            "22": "Punishment for contravention in relation to psychotropic substances.",
            "27": "Punishment for consumption of narcotic drug or psychotropic substance — imprisonment up to 1 year or fine.",
            "35": "Presumption of culpable mental state.",
            "37": "Offences to be cognizable and non-bailable — bail restrictions for commercial quantity cases.",
            "42": "Power of entry, search, seizure and arrest without warrant.",
            "50": "Conditions under which search of persons shall be conducted — before nearest Magistrate or gazetted officer.",
            "52A": "Disposal of seized drugs — sampling and disposal by Magistrate.",
            "67": "Power to call for information — statement to officer admissible as evidence.",
        },
    },

    "POCSO Act": {
        "full_name": "Protection of Children from Sexual Offences Act, 2012",
        "year": 2012,
        "replaced_by": None,
        "sections": {
            "3": "Penetrative sexual assault — insertion of object / body part into child.",
            "4": "Punishment for penetrative sexual assault — minimum 10 years to life imprisonment.",
            "5": "Aggravated penetrative sexual assault — by police, relative, in institution, etc.",
            "6": "Punishment for aggravated penetrative sexual assault — minimum 20 years to life / death.",
            "7": "Sexual assault — touch with sexual intent without penetration.",
            "8": "Punishment for sexual assault — 3 to 5 years imprisonment.",
            "11": "Sexual harassment of child.",
            "19": "Reporting of offence — any person who has knowledge shall report.",
            "29": "Presumption of certain offences — court shall presume accused committed the offence unless proved otherwise.",
            "30": "Presumption of culpable mental state.",
            "33": "Guidelines for child's statement — recorded by woman officer, in child-friendly atmosphere.",
            "34": "Procedure for media — no media shall disclose identity of child.",
            "35": "Child not to be called repeatedly to testify.",
            "36": "Right of child to be assisted by interpreter, special educator or expert.",
        },
    },

    "SC/ST Act": {
        "full_name": "Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989",
        "year": 1989,
        "replaced_by": None,
        "sections": {
            "3": "Punishments for offences of atrocities — enumerated list of 29+ specific offences against SCs/STs.",
            "14": "Special Courts — state government to specify for each district to try offences under this Act.",
            "15A": "Rights of victims and witnesses — travel allowance, maintenance, protection.",
            "18": "Offences non-bailable — anticipatory bail not available (S.438 CrPC not applicable).",
            "18A": "No preliminary enquiry required; FIR to be registered immediately; arrest without delay. (Added 2018 amendment, but cf. Supreme Court rulings.)",
        },
    },

    "IT Act": {
        "full_name": "Information Technology Act, 2000",
        "year": 2000,
        "replaced_by": None,
        "sections": {
            "43": "Penalty and compensation for damage to computer systems — up to ₹1 crore.",
            "43A": "Compensation for failure to protect data — body corporate handling sensitive personal data.",
            "65": "Tampering with computer source documents — imprisonment up to 3 years, or fine up to ₹2 lakh.",
            "66": "Computer related offences (hacking) — imprisonment up to 3 years, or fine up to ₹5 lakh.",
            "66A": "STRUCK DOWN by Supreme Court in Shreya Singhal v. UOI (2015) — was punishment for sending offensive messages.",
            "66C": "Punishment for identity theft — imprisonment up to 3 years and fine up to ₹1 lakh.",
            "66D": "Cheating by personation using computer resource — imprisonment up to 3 years and fine up to ₹1 lakh.",
            "67": "Publishing or transmitting obscene material — first conviction up to 3 years and ₹5 lakh.",
            "69": "Power to issue directions for interception/monitoring/decryption of information.",
            "72": "Breach of confidentiality and privacy — imprisonment up to 2 years, or fine up to ₹1 lakh.",
            "79": "Exemption from liability of intermediary — not liable for third party content if guidelines followed.",
        },
    },

    # ═══════════════════════════════════════════════════════════════
    # PROPERTY / CONTRACT
    # ═══════════════════════════════════════════════════════════════
    "Indian Contract Act": {
        "full_name": "Indian Contract Act, 1872",
        "year": 1872,
        "replaced_by": None,
        "sections": {
            "2": "Definitions — proposal (offer), promise, consideration, agreement, contract, void agreement.",
            "10": "What agreements are contracts — free consent, competent parties, lawful consideration, lawful object, not expressly declared void.",
            "14": "Free consent — consent not caused by coercion, undue influence, fraud, misrepresentation, mistake.",
            "23": "What considerations and objects are lawful — not forbidden by law, not immoral, not opposed to public policy.",
            "56": "Agreement to do impossible act is void. Doctrine of frustration.",
            "73": "Compensation for loss or damage caused by breach of contract.",
            "74": "Compensation for breach where penalty stipulated — reasonable compensation not exceeding amount named.",
            "124": "Contract of indemnity — promise to save other from loss caused by promisor or third person.",
            "148": "Bailment — delivery of goods by one person to another for some purpose.",
            "172": "Pledge — bailment of goods as security for payment of a debt or performance of a promise.",
            "182": "Agent — person employed to do any act for another or represent another in dealings with third persons.",
        },
    },

    "Transfer of Property Act": {
        "full_name": "Transfer of Property Act, 1882",
        "year": 1882,
        "replaced_by": None,
        "sections": {
            "5": "Transfer of property — act by which a living person conveys property to one or more living persons.",
            "6": "What may be transferred — property of any kind may be transferred except as otherwise provided.",
            "41": "Transfer by ostensible owner — where with consent of real owner, a person makes transfer to transferee for consideration who acts in good faith.",
            "52": "Transfer of property pending suit (lis pendens) — during pendency of suit, any transfer is subject to outcome of suit.",
            "53A": "Part performance — transferee in possession in part performance of contract not to be ejected.",
            "54": "Sale — transfer of ownership for a price.",
            "58": "Mortgage — transfer of interest in specific immovable property for purpose of securing payment of money.",
            "105": "Lease — transfer of right to enjoy immovable property for a certain time in consideration of rent.",
            "106": "Duration of certain leases in absence of written contract — month-to-month / year-to-year, termination by 15 days / 6 months notice.",
        },
    },
}


def lookup_sections(section_numbers: list, acts_mentioned: list = None) -> str:
    """Look up section text for given section numbers across relevant acts.

    Returns a formatted string suitable for injection into an LLM prompt.
    If *acts_mentioned* is provided, only those acts are searched;
    otherwise all acts are checked.
    """
    results = []
    search_acts = STATUTES
    if acts_mentioned:
        search_acts = {k: v for k, v in STATUTES.items() if k in acts_mentioned}
        if not search_acts:
            search_acts = STATUTES

    for sec in section_numbers:
        sec_str = str(sec).strip()
        for act_key, act_data in search_acts.items():
            if sec_str in act_data["sections"]:
                text = act_data["sections"][sec_str]
                replaced = act_data.get("replaced_by")
                line = f"• {act_key} S.{sec_str}: {text}"
                if replaced:
                    line += f"  [⚠ Replaced by {replaced}]"
                results.append(line)

    return "\n".join(results) if results else ""


def get_old_new_mapping(act_short_name: str) -> dict:
    """Return {old_section: new_equivalent_description} for a replaced act."""
    act = STATUTES.get(act_short_name)
    if not act or not act.get("replaced_by"):
        return {}
    new_act = STATUTES.get(act["replaced_by"], {})
    if not new_act:
        return {}
    return {
        "old_act": act_short_name,
        "new_act": act["replaced_by"],
        "old_full": act["full_name"],
        "new_full": new_act["full_name"],
    }
