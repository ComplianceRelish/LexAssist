import os
import json
import re
from typing import Dict, List, Any, Optional
import nltk
from nltk.tokenize import sent_tokenize
import spacy
from datetime import datetime

# Initialize NLP libraries
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

class CaseFileDraftingAgent:
    """
    Agent for drafting legal case files based on brief analysis and legal research.
    """
    
    def __init__(self):
        # Templates for different document types
        self.templates = {
            "petition": self._load_template("petition"),
            "reply": self._load_template("reply"),
            "rejoinder": self._load_template("rejoinder"),
            "affidavit": self._load_template("affidavit"),
            "legal_notice": self._load_template("legal_notice"),
            "written_statement": self._load_template("written_statement")
        }
        
        # Document structure definitions
        self.document_structures = {
            "petition": [
                "title", "jurisdiction", "parties", "facts", "grounds", 
                "legal_provisions", "prayer", "verification"
            ],
            "reply": [
                "title", "parties", "preliminary_objections", "facts_rebuttal", 
                "legal_arguments", "prayer", "verification"
            ],
            "rejoinder": [
                "title", "parties", "rebuttal_to_reply", "additional_facts", 
                "legal_arguments", "prayer", "verification"
            ],
            "affidavit": [
                "title", "deponent_details", "verification", "statements", 
                "declaration", "attestation"
            ],
            "legal_notice": [
                "sender_details", "recipient_details", "subject", "facts", 
                "legal_provisions", "demand", "timeline", "consequences"
            ],
            "written_statement": [
                "title", "parties", "preliminary_objections", "facts", 
                "defense_arguments", "legal_provisions", "prayer", "verification"
            ]
        }
    
    def _load_template(self, template_name: str) -> str:
        """
        Load a template from file or return a default template.
        
        Args:
            template_name: Name of the template to load
            
        Returns:
            Template string
        """
        try:
            with open(f"templates/{template_name}.txt", "r") as f:
                return f.read()
        except FileNotFoundError:
            # Return default templates if file not found
            if template_name == "petition":
                return """
                IN THE [COURT NAME]
                
                [JURISDICTION]
                
                [CASE NUMBER]
                
                IN THE MATTER OF:
                
                [PETITIONER NAME]                                ... PETITIONER
                
                VERSUS
                
                [RESPONDENT NAME]                               ... RESPONDENT
                
                PETITION UNDER [RELEVANT LAW/SECTION]
                
                MOST RESPECTFULLY SHOWETH:
                
                1. PARTIES:
                   [PARTIES_PLACEHOLDER]
                
                2. JURISDICTION:
                   [JURISDICTION_PLACEHOLDER]
                
                3. FACTS OF THE CASE:
                   [FACTS_PLACEHOLDER]
                
                4. GROUNDS:
                   [GROUNDS_PLACEHOLDER]
                
                5. LEGAL PROVISIONS APPLICABLE:
                   [LEGAL_PROVISIONS_PLACEHOLDER]
                
                6. PRAYER:
                   [PRAYER_PLACEHOLDER]
                
                VERIFICATION:
                
                Verified at [PLACE] on this [DATE] that the contents of the above petition are true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom.
                
                [PETITIONER/ADVOCATE NAME]
                """
            elif template_name == "reply":
                return """
                IN THE [COURT NAME]
                
                [JURISDICTION]
                
                [CASE NUMBER]
                
                IN THE MATTER OF:
                
                [PLAINTIFF/PETITIONER NAME]                     ... PLAINTIFF/PETITIONER
                
                VERSUS
                
                [DEFENDANT/RESPONDENT NAME]                     ... DEFENDANT/RESPONDENT
                
                REPLY ON BEHALF OF THE [DEFENDANT/RESPONDENT]
                
                MOST RESPECTFULLY SHOWETH:
                
                1. PARTIES:
                   [PARTIES_PLACEHOLDER]
                
                2. PRELIMINARY OBJECTIONS:
                   [PRELIMINARY_OBJECTIONS_PLACEHOLDER]
                
                3. REPLY TO FACTS:
                   [FACTS_REBUTTAL_PLACEHOLDER]
                
                4. LEGAL ARGUMENTS:
                   [LEGAL_ARGUMENTS_PLACEHOLDER]
                
                5. PRAYER:
                   [PRAYER_PLACEHOLDER]
                
                VERIFICATION:
                
                Verified at [PLACE] on this [DATE] that the contents of the above reply are true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom.
                
                [DEFENDANT/RESPONDENT/ADVOCATE NAME]
                """
            elif template_name == "affidavit":
                return """
                BEFORE THE [COURT/AUTHORITY NAME]
                
                [JURISDICTION]
                
                [CASE NUMBER]
                
                AFFIDAVIT
                
                I, [DEPONENT NAME], [AGE], [OCCUPATION], [NATIONALITY], resident of [ADDRESS], do hereby solemnly affirm and declare as under:
                
                1. [STATEMENT_1_PLACEHOLDER]
                
                2. [STATEMENT_2_PLACEHOLDER]
                
                3. [STATEMENT_3_PLACEHOLDER]
                
                VERIFICATION:
                
                I, the deponent above named, do hereby verify that the contents of this affidavit are true and correct to my knowledge, no part of it is false and nothing material has been concealed therefrom.
                
                Verified at [PLACE] on this [DATE].
                
                DEPONENT
                
                ATTESTATION:
                
                Solemnly affirmed and signed before me on this [DATE] at [PLACE].
                
                NOTARY PUBLIC/OATH COMMISSIONER
                """
            else:
                # Generic template for other document types
                return f"""
                [TITLE OF THE {template_name.upper()}]
                
                [CONTENT_PLACEHOLDER]
                
                [DATE]
                
                [SIGNATURE]
                """
    
    def draft_case_file(self, 
                       document_type: str,
                       brief_analysis: Dict[str, Any],
                       law_sections: List[Dict[str, Any]],
                       case_histories: List[Dict[str, Any]],
                       analysis: Dict[str, Any],
                       brief_content: str,
                       additional_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Draft a legal case file based on the brief analysis and legal research.
        
        Args:
            document_type: Type of document to draft (petition, reply, etc.)
            brief_analysis: Analysis of the legal brief
            law_sections: Relevant law sections
            case_histories: Relevant case histories
            analysis: Legal analysis
            brief_content: Original brief content
            additional_info: Additional information for the document
            
        Returns:
            Dictionary containing the drafted document and metadata
        """
        # Validate document type
        if document_type not in self.templates:
            raise ValueError(f"Unsupported document type: {document_type}")
        
        # Extract entities from brief
        entities = self._extract_entities(brief_content)
        
        # Generate document sections
        document_sections = self._generate_document_sections(
            document_type, brief_analysis, law_sections, 
            case_histories, analysis, entities, additional_info
        )
        
        # Fill template with generated content
        document_content = self._fill_template(document_type, document_sections)
        
        # Generate metadata
        metadata = {
            "document_type": document_type,
            "generated_at": datetime.now().isoformat(),
            "based_on_brief": brief_content[:100] + "..." if len(brief_content) > 100 else brief_content,
            "law_sections_used": [f"{section['title']} Section {section['sectionNumber']}" for section in law_sections[:3]],
            "case_histories_used": [f"{case['parties']} ({case['citation']})" for case in case_histories[:3]]
        }
        
        return {
            "content": document_content,
            "metadata": metadata,
            "sections": document_sections
        }
    
    def _extract_entities(self, brief_content: str) -> Dict[str, Any]:
        """
        Extract named entities from the brief content.
        
        Args:
            brief_content: The text of the legal brief
            
        Returns:
            Dictionary of extracted entities
        """
        doc = nlp(brief_content)
        
        entities = {
            "persons": [],
            "organizations": [],
            "dates": [],
            "locations": [],
            "monetary_values": []
        }
        
        # Extract entities using spaCy
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                entities["persons"].append(ent.text)
            elif ent.label_ == "ORG":
                entities["organizations"].append(ent.text)
            elif ent.label_ == "DATE":
                entities["dates"].append(ent.text)
            elif ent.label_ == "GPE" or ent.label_ == "LOC":
                entities["locations"].append(ent.text)
            elif ent.label_ == "MONEY":
                entities["monetary_values"].append(ent.text)
        
        # Remove duplicates while preserving order
        for key in entities:
            entities[key] = list(dict.fromkeys(entities[key]))
        
        # Extract potential parties (plaintiff/defendant, petitioner/respondent)
        entities["potential_parties"] = self._extract_potential_parties(brief_content)
        
        # Extract monetary amounts using regex
        money_pattern = re.compile(r'(?:Rs\.?|INR|₹)\s?(\d+(?:,\d+)*(?:\.\d+)?)|(\d+(?:,\d+)*(?:\.\d+)?)\s?(?:rupees|Rs\.?|INR|₹)')
        money_matches = money_pattern.findall(brief_content)
        for match in money_matches:
            amount = match[0] if match[0] else match[1]
            if amount and amount not in entities["monetary_values"]:
                entities["monetary_values"].append(f"Rs. {amount}")
        
        return entities
    
    def _extract_potential_parties(self, brief_content: str) -> Dict[str, List[str]]:
        """
        Extract potential parties from the brief content.
        
        Args:
            brief_content: The text of the legal brief
            
        Returns:
            Dictionary with potential parties
        """
        parties = {
            "petitioners": [],
            "respondents": [],
            "plaintiffs": [],
            "defendants": []
        }
        
        # Look for common patterns indicating parties
        petitioner_patterns = [
            r'(?:petitioner|plaintiff|appellant|applicant)s?(?:\s+is|\s+are|\s*,|\s*:)?\s+([A-Z][A-Za-z\s]+)(?:,|\.|\band\b|$)',
            r'([A-Z][A-Za-z\s]+)(?:\s+is|\s+are)?\s+the\s+(?:petitioner|plaintiff|appellant|applicant)s?'
        ]
        
        respondent_patterns = [
            r'(?:respondent|defendant|opposite party)s?(?:\s+is|\s+are|\s*,|\s*:)?\s+([A-Z][A-Za-z\s]+)(?:,|\.|\band\b|$)',
            r'([A-Z][A-Za-z\s]+)(?:\s+is|\s+are)?\s+the\s+(?:respondent|defendant|opposite party)s?'
        ]
        
        # Extract using patterns
        for pattern in petitioner_patterns:
            matches = re.findall(pattern, brief_content)
            for match in matches:
                match = match.strip()
                if match and len(match) > 3:  # Avoid short matches
                    if "plaintiff" in pattern:
                        parties["plaintiffs"].append(match)
                    else:
                        parties["petitioners"].append(match)
        
        for pattern in respondent_patterns:
            matches = re.findall(pattern, brief_content)
            for match in matches:
                match = match.strip()
                if match and len(match) > 3:  # Avoid short matches
                    if "defendant" in pattern:
                        parties["defendants"].append(match)
                    else:
                        parties["respondents"].append(match)
        
        # Look for "versus" or "vs" pattern
        versus_pattern = re.compile(r'([A-Z][A-Za-z\s]+)\s+(?:versus|vs\.?|v\.)\s+([A-Z][A-Za-z\s]+)')
        versus_matches = versus_pattern.findall(brief_content)
        
        for match in versus_matches:
            first_party = match[0].strip()
            second_party = match[1].strip()
            
            if first_party and len(first_party) > 3:
                if not parties["petitioners"] and not parties["plaintiffs"]:
                    parties["petitioners"].append(first_party)
            
            if second_party and len(second_party) > 3:
                if not parties["respondents"] and not parties["defendants"]:
                    parties["respondents"].append(second_party)
        
        # Remove duplicates
        for key in parties:
            parties[key] = list(dict.fromkeys(parties[key]))
        
        return parties
    
    def _generate_document_sections(self, 
                                  document_type: str,
                                  brief_analysis: Dict[str, Any],
                                  law_sections: List[Dict[str, Any]],
                                  case_histories: List[Dict[str, Any]],
                                  analysis: Dict[str, Any],
                                  entities: Dict[str, Any],
                                  additional_info: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
        """
        Generate content for each section of the document.
        
        Args:
            document_type: Type of document to draft
            brief_analysis: Analysis of the legal brief
            law_sections: Relevant law sections
            case_histories: Relevant case histories
            analysis: Legal analysis
            entities: Extracted entities
            additional_info: Additional information for the document
            
        Returns:
            Dictionary with content for each section
        """
        # Initialize with empty sections
        sections = {section: "" for section in self.document_structures.get(document_type, [])}
        
        # Get additional info or initialize empty dict
        info = additional_info or {}
        
        # Common sections across multiple document types
        if "title" in sections:
            sections["title"] = self._generate_title(document_type, brief_analysis, entities, info)
        
        if "parties" in sections:
            sections["parties"] = self._generate_parties_section(document_type, entities, info)
        
        if "facts" in sections:
            sections["facts"] = self._generate_facts_section(document_type, brief_analysis, entities, info)
        
        if "legal_provisions" in sections:
            sections["legal_provisions"] = self._generate_legal_provisions_section(law_sections, info)
        
        if "prayer" in sections:
            sections["prayer"] = self._generate_prayer_section(document_type, analysis, brief_analysis, info)
        
        if "verification" in sections:
            sections["verification"] = self._generate_verification_section(document_type, entities, info)
        
        # Document-specific sections
        if document_type == "petition":
            if "jurisdiction" in sections:
                sections["jurisdiction"] = self._generate_jurisdiction_section(brief_analysis, entities, info)
            
            if "grounds" in sections:
                sections["grounds"] = self._generate_grounds_section(analysis, law_sections, case_histories, info)
        
        elif document_type == "reply" or document_type == "written_statement":
            if "preliminary_objections" in sections:
                sections["preliminary_objections"] = self._generate_preliminary_objections(analysis, info)
            
            if "facts_rebuttal" in sections:
                sections["facts_rebuttal"] = self._generate_facts_rebuttal(brief_analysis, info)
            
            if "legal_arguments" in sections:
                sections["legal_arguments"] = self._generate_legal_arguments(analysis, law_sections, case_histories, info)
        
        elif document_type == "rejoinder":
            if "rebuttal_to_reply" in sections:
                sections["rebuttal_to_reply"] = self._generate_rebuttal_to_reply(analysis, info)
            
            if "additional_facts" in sections:
                sections["additional_facts"] = self._generate_additional_facts(brief_analysis, info)
            
            if "legal_arguments" in sections:
                sections["legal_arguments"] = self._generate_legal_arguments(analysis, law_sections, case_histories, info)
        
        elif document_type == "affidavit":
            if "deponent_details" in sections:
                sections["deponent_details"] = self._generate_deponent_details(entities, info)
            
            if "statements" in sections:
                sections["statements"] = self._generate_affidavit_statements(brief_analysis, info)
            
            if "declaration" in sections:
                sections["declaration"] = self._generate_affidavit_declaration(info)
            
            if "attestation" in sections:
                sections["attestation"] = self._generate_attestation(info)
        
        elif document_type == "legal_notice":
            if "sender_details" in sections:
                sections["sender_details"] = self._generate_sender_details(entities, info)
            
            if "recipient_details" in sections:
                sections["recipient_details"] = self._generate_recipient_details(entities, info)
            
            if "subject" in sections:
                sections["subject"] = self._generate_notice_subject(brief_analysis, info)
            
            if "demand" in sections:
                sections["demand"] = self._generate_notice_demand(analysis, info)
            
            if "timeline" in sections:
                sections["timeline"] = self._generate_notice_timeline(info)
            
            if "consequences" in sections:
                sections["consequences"] = self._generate_notice_consequences(law_sections, info)
        
        return sections
    
    def _fill_template(self, document_type: str, sections: Dict[str, str]) -> str:
        """
        Fill the template with generated content.
        
        Args:
            document_type: Type of document
            sections: Dictionary with content for each section
            
        Returns:
            Filled template as a string
        """
        template = self.templates.get(document_type, "")
        
        # Replace placeholders with content
        for section, content in sections.items():
            placeholder = f"[{section.upper()}_PLACEHOLDER]"
            template = template.replace(placeholder, content)
        
        # Replace any remaining placeholders with empty strings
        template = re.sub(r'\[\w+_PLACEHOLDER\]', '', template)
        
        # Add current date if [DATE] is in the template
        today = datetime.now().strftime("%d/%m/%Y")
        template = template.replace("[DATE]", today)
        
        # Clean up extra whitespace and newlines
        template = re.sub(r'\n{3,}', '\n\n', template)
        template = re.sub(r' {2,}', ' ', template)
        
        return template.strip()
    
    # Section generators
    
    def _generate_title(self, document_type: str, brief_analysis: Dict[str, Any], 
                      entities: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate the title section."""
        if info.get("title"):
            return info["title"]
        
        court = info.get("court", "APPROPRIATE COURT")
        
        # Determine case type based on legal domains
        domains = brief_analysis.get("domains", ["general"])
        case_type = ""
        
        if "criminal" in domains:
            case_type = "CRIMINAL CASE"
        elif "civil" in domains:
            case_type = "CIVIL SUIT"
        elif "constitutional" in domains:
            case_type = "WRIT PETITION"
        elif "corporate" in domains:
            case_type = "COMPANY PETITION"
        elif "tax" in domains:
            case_type = "TAX APPEAL"
        else:
            case_type = "PETITION"
        
        # Get parties
        potential_parties = entities.get("potential_parties", {})
        petitioners = potential_parties.get("petitioners", []) or potential_parties.get("plaintiffs", [])
        respondents = potential_parties.get("respondents", []) or potential_parties.get("defendants", [])
        
        petitioner = petitioners[0] if petitioners else "PETITIONER NAME"
        respondent = respondents[0] if respondents else "RESPONDENT NAME"
        
        if document_type == "petition":
            return f"IN THE {court}\n\n{case_type}\n\nIN THE MATTER OF:\n{petitioner} ... PETITIONER\n\nVERSUS\n\n{respondent} ... RESPONDENT"
        elif document_type == "reply" or document_type == "written_statement":
            return f"IN THE {court}\n\n{case_type}\n\nIN THE MATTER OF:\n{petitioner} ... PETITIONER/PLAINTIFF\n\nVERSUS\n\n{respondent} ... RESPONDENT/DEFENDANT"
        elif document_type == "rejoinder":
            return f"IN THE {court}\n\n{case_type}\n\nIN THE MATTER OF:\n{petitioner} ... PETITIONER/PLAINTIFF\n\nVERSUS\n\n{respondent} ... RESPONDENT/DEFENDANT\n\nREJOINDER ON BEHALF OF THE PETITIONER/PLAINTIFF"
        else:
            return f"IN THE MATTER OF:\n{petitioner} ... PETITIONER\n\nVERSUS\n\n{respondent} ... RESPONDENT"
    
    def _generate_parties_section(self, document_type: str, entities: Dict[str, Any], 
                               info: Dict[str, Any]) -> str:
        """Generate the parties section."""
        if info.get("parties"):
            return info["parties"]
        
        potential_parties = entities.get("potential_parties", {})
        petitioners = potential_parties.get("petitioners", []) or potential_parties.get("plaintiffs", [])
        respondents = potential_parties.get("respondents", []) or potential_parties.get("defendants", [])
        
        organizations = entities.get("organizations", [])
        
        parties_text = ""
        
        # Add petitioner/plaintiff details
        if petitioners:
            petitioner = petitioners[0]
            # Check if petitioner is an organization
            is_org = any(org in petitioner for org in organizations)
            
            if document_type in ["petition", "rejoinder"]:
                parties_text += "1. The Petitioner is "
            else:
                parties_text += "1. The Plaintiff is "
            
            if is_org:
                parties_text += f"{petitioner}, a company/organization registered under the laws of India, having its registered office at [ADDRESS]."
            else:
                parties_text += f"{petitioner}, aged about [AGE] years, resident of [ADDRESS]."
            
            parties_text += "\n\n"
        else:
            parties_text += "1. The Petitioner/Plaintiff details: [TO BE FILLED]\n\n"
        
        # Add respondent/defendant details
        if respondents:
            respondent = respondents[0]
            # Check if respondent is an organization
            is_org = any(org in respondent for org in organizations)
            
            if document_type in ["petition", "rejoinder"]:
                parties_text += "2. The Respondent is "
            else:
                parties_text += "2. The Defendant is "
            
            if is_org:
                parties_text += f"{respondent}, a company/organization registered under the laws of India, having its registered office at [ADDRESS]."
            else:
                parties_text += f"{respondent}, aged about [AGE] years, resident of [ADDRESS]."
        else:
            parties_text += "2. The Respondent/Defendant details: [TO BE FILLED]"
        
        return parties_text
    
    def _generate_jurisdiction_section(self, brief_analysis: Dict[str, Any], 
                                    entities: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate the jurisdiction section."""
        if info.get("jurisdiction"):
            return info["jurisdiction"]
        
        # Extract locations
        locations = entities.get("locations", [])
        location = locations[0] if locations else "[LOCATION]"
        
        # Determine jurisdiction based on legal domains
        domains = brief_analysis.get("domains", ["general"])
        jurisdiction_text = ""
        
        if "criminal" in domains:
            jurisdiction_text = f"This Hon'ble Court has jurisdiction to try and entertain this petition as the alleged offence occurred within the territorial jurisdiction of this Court at {location}."
        elif "civil" in domains:
            jurisdiction_text = f"This Hon'ble Court has jurisdiction to try and entertain this suit as the subject matter of the dispute is situated within the territorial jurisdiction of this Court at {location}, and the cause of action arose within the jurisdiction of this Court."
        elif "constitutional" in domains:
            jurisdiction_text = "This Hon'ble Court has jurisdiction to entertain this petition under Article 226 of the Constitution of India as the cause of action arose within the territorial jurisdiction of this Court."
        else:
            jurisdiction_text = f"This Hon'ble Court has jurisdiction to try and entertain this matter as the cause of action arose within the territorial jurisdiction of this Court at {location}."
        
        return jurisdiction_text
    
    def _generate_facts_section(self, document_type: str, brief_analysis: Dict[str, Any], 
                             entities: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate the facts section."""
        if info.get("facts"):
            return info["facts"]
        
        # Extract dates and monetary values
        dates = entities.get("dates", [])
        monetary_values = entities.get("monetary_values", [])
        
        # Generate facts based on brief summary
        summary = brief_analysis.get("summary", "")
        if not summary:
            return "The facts of the case are as follows: [FACTS TO BE FILLED]"
        
        # Split summary into sentences
        sentences = sent_tokenize(summary)
        
        facts_text = "The facts of the case are as follows:\n\n"
        
        # Add numbered facts
        for i, sentence in enumerate(sentences, 1):
            facts_text += f"{i}. {sentence}\n\n"
        
        # Add dates if available
        if dates:
            facts_text += f"{len(sentences) + 1}. The relevant dates in this matter are: "
            facts_text += ", ".join(dates[:3])
            facts_text += ".\n\n"
        
        # Add monetary values if available
        if monetary_values and ("civil" in brief_analysis.get("domains", []) or "contract" in summary.lower()):
            facts_text += f"{len(sentences) + (1 if dates else 0) + 1}. The monetary value involved in this dispute is approximately "
            facts_text += " and ".join(monetary_values[:2])
            facts_text += ".\n\n"
        
        return facts_text
    
    def _generate_legal_provisions_section(self, law_sections: List[Dict[str, Any]], 
                                        info: Dict[str, Any]) -> str:
        """Generate the legal provisions section."""
        if info.get("legal_provisions"):
            return info["legal_provisions"]
        
        if not law_sections:
            return "The following legal provisions are applicable to this case: [TO BE FILLED]"
        
        legal_provisions_text = "The following legal provisions are applicable to this case:\n\n"
        
        for i, section in enumerate(law_sections, 1):
            legal_provisions_text += f"{i}. {section['title']} - Section {section['sectionNumber']}:\n"
            legal_provisions_text += f"   {section['content']}\n\n"
        
        return legal_provisions_text
    
    def _generate_grounds_section(self, analysis: Dict[str, Any], 
                               law_sections: List[Dict[str, Any]], 
                               case_histories: List[Dict[str, Any]], 
                               info: Dict[str, Any]) -> str:
        """Generate the grounds section."""
        if info.get("grounds"):
            return info["grounds"]
        
        grounds_text = "The petition is filed on the following grounds:\n\n"
        
        # Add arguments from analysis
        arguments = analysis.get("arguments", [])
        for i, argument in enumerate(arguments, 1):
            grounds_text += f"{i}. {argument}\n\n"
        
        # Add grounds based on law sections
        for i, section in enumerate(law_sections[:2], len(arguments) + 1):
            grounds_text += f"{i}. As per {section['title']} Section {section['sectionNumber']}, "
            
            # Extract key phrases from section content
            content = section['content']
            if len(content) > 150:
                content = content[:150] + "..."
            
            grounds_text += f"which states that '{content}', the petitioner has a valid claim.\n\n"
        
        # Add grounds based on case histories
        for i, case in enumerate(case_histories[:2], len(arguments) + len(law_sections[:2]) + 1):
            grounds_text += f"{i}. The Hon'ble Court in the case of {case['parties']} ({case['citation']}) has held that {case['holdings']} This precedent directly applies to the present case.\n\n"
        
        return grounds_text
    
    def _generate_prayer_section(self, document_type: str, analysis: Dict[str, Any], 
                              brief_analysis: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate the prayer section."""
        if info.get("prayer"):
            return info["prayer"]
        
        # Determine prayer based on document type and legal domains
        domains = brief_analysis.get("domains", ["general"])
        recommendations = analysis.get("recommendations", [])
        
        prayer_text = "In light of the facts and circumstances of the case, it is most respectfully prayed that this Hon'ble Court may be pleased to:\n\n"
        
        if "criminal" in domains:
            if document_type == "petition":
                prayer_text += "1. Direct the respondent to register an FIR and conduct a fair investigation into the matter;\n\n"
                prayer_text += "2. Grant compensation to the petitioner for the losses suffered;\n\n"
            elif document_type in ["reply", "written_statement"]:
                prayer_text += "1. Dismiss the petition/complaint as it is devoid of merits;\n\n"
                prayer_text += "2. Exonerate the respondent/defendant from all charges;\n\n"
        elif "civil" in domains:
            if document_type == "petition":
                prayer_text += "1. Declare that the petitioner is entitled to the reliefs claimed;\n\n"
                prayer_text += "2. Direct the respondent to pay damages/compensation as deemed fit by this Hon'ble Court;\n\n"
            elif document_type in ["reply", "written_statement"]:
                prayer_text += "1. Dismiss the suit with costs as it is devoid of merits;\n\n"
                prayer_text += "2. Declare that the plaintiff is not entitled to any of the reliefs claimed;\n\n"
        elif "constitutional" in domains:
            if document_type == "petition":
                prayer_text += "1. Issue a writ of mandamus or any other appropriate writ directing the respondent to perform its statutory duties;\n\n"
                prayer_text += "2. Declare the actions of the respondent as illegal, arbitrary, and violative of the petitioner's fundamental rights;\n\n"
            elif document_type in ["reply", "written_statement"]:
                prayer_text += "1. Dismiss the writ petition as it is not maintainable;\n\n"
                prayer_text += "2. Declare that the respondent has acted within the framework of law;\n\n"
        else:
            if document_type == "petition":
                prayer_text += "1. Grant the reliefs as prayed for in the petition;\n\n"
                prayer_text += "2. Award costs of the proceedings to the petitioner;\n\n"
            elif document_type in ["reply", "written_statement"]:
                prayer_text += "1. Dismiss the petition/suit with costs;\n\n"
                prayer_text += "2. Grant such other relief as deemed fit in favor of the respondent/defendant;\n\n"
        
        # Add recommendations from analysis if available
        if recommendations and len(recommendations) > 0:
            rec_index = 3
            for rec in recommendations[:2]:
                if "prayer" in rec.lower() or "relief" in rec.lower():
                    prayer_text += f"{rec_index}. {rec}\n\n"
                    rec_index += 1
        
        # Add standard closing
        prayer_text += f"{prayer_text.count(';\n\n') + 1}. Pass any other order or direction as this Hon'ble Court may deem fit and proper in the interest of justice."
        
        return prayer_text
    
    def _generate_verification_section(self, document_type: str, entities: Dict[str, Any], 
                                    info: Dict[str, Any]) -> str:
        """Generate the verification section."""
        if info.get("verification"):
            return info["verification"]
        
        # Get location
        locations = entities.get("locations", [])
        location = locations[0] if locations else "[PLACE]"
        
        # Get date
        today = datetime.now().strftime("%d/%m/%Y")
        
        # Get verifier
        potential_parties = entities.get("potential_parties", {})
        
        if document_type in ["petition", "rejoinder"]:
            verifier = potential_parties.get("petitioners", ["[PETITIONER NAME]"])[0]
            verification_text = f"Verified at {location} on this {today} that the contents of the above petition are true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom.\n\n{verifier}\nPETITIONER"
        elif document_type in ["reply", "written_statement"]:
            verifier = potential_parties.get("respondents", ["[RESPONDENT NAME]"])[0]
            verification_text = f"Verified at {location} on this {today} that the contents of the above reply are true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom.\n\n{verifier}\nRESPONDENT"
        else:
            verification_text = f"Verified at {location} on this {today} that the contents of the above document are true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom.\n\n[NAME]\n[DESIGNATION]"
        
        return verification_text
    
    def _generate_preliminary_objections(self, analysis: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate preliminary objections for reply/written statement."""
        if info.get("preliminary_objections"):
            return info["preliminary_objections"]
        
        challenges = analysis.get("challenges", [])
        
        objections_text = "The respondent/defendant raises the following preliminary objections:\n\n"
        
        if challenges and len(challenges) > 0:
            for i, challenge in enumerate(challenges, 1):
                objections_text += f"{i}. {challenge}\n\n"
        else:
            objections_text += "1. The petition/plaint is not maintainable in law and on facts.\n\n"
            objections_text += "2. The petition/plaint is barred by limitation.\n\n"
            objections_text += "3. The petitioner/plaintiff has no locus standi to file the present petition/suit.\n\n"
            objections_text += "4. The petition/plaint does not disclose any cause of action against the respondent/defendant.\n\n"
        
        return objections_text
    
    def _generate_facts_rebuttal(self, brief_analysis: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate facts rebuttal for reply/written statement."""
        if info.get("facts_rebuttal"):
            return info["facts_rebuttal"]
        
        rebuttal_text = "The respondent/defendant submits the following in response to the alleged facts:\n\n"
        
        # Generate generic rebuttals
        rebuttal_text += "1. The facts stated in the petition/plaint are denied as incorrect and misleading, except those that are specifically admitted herein.\n\n"
        rebuttal_text += "2. The respondent/defendant denies all allegations of wrongdoing or liability as alleged in the petition/plaint.\n\n"
        
        # Add domain-specific rebuttals
        domains = brief_analysis.get("domains", ["general"])
        
        if "criminal" in domains:
            rebuttal_text += "3. The allegations of criminal conduct are vehemently denied as false and baseless. The respondent/defendant has not committed any offense as alleged.\n\n"
            rebuttal_text += "4. The complaint is filed with malafide intentions to harass and pressurize the respondent/defendant.\n\n"
        elif "civil" in domains:
            rebuttal_text += "3. The alleged breach of contract/agreement is denied. The respondent/defendant has fulfilled all obligations as per the terms of the agreement.\n\n"
            rebuttal_text += "4. The petitioner/plaintiff has failed to disclose material facts and has approached this Hon'ble Court with unclean hands.\n\n"
        elif "constitutional" in domains:
            rebuttal_text += "3. The respondent has acted within the framework of law and constitutional provisions. No fundamental right of the petitioner has been violated.\n\n"
            rebuttal_text += "4. The petitioner has alternative remedies available which have not been exhausted before approaching this Hon'ble Court.\n\n"
        
        return rebuttal_text
    
    def _generate_legal_arguments(self, analysis: Dict[str, Any], 
                               law_sections: List[Dict[str, Any]], 
                               case_histories: List[Dict[str, Any]], 
                               info: Dict[str, Any]) -> str:
        """Generate legal arguments section."""
        if info.get("legal_arguments"):
            return info["legal_arguments"]
        
        arguments_text = "The following legal arguments are submitted for consideration:\n\n"
        
        # Add arguments from analysis
        counter_arguments = []
        for arg in analysis.get("arguments", []):
            # Create counter-arguments by negating or challenging the original arguments
            counter_arg = arg.replace("establishes", "fails to establish")
            counter_arg = counter_arg.replace("clearly", "allegedly")
            counter_arg = counter_arg.replace("proves", "attempts to prove")
            counter_arg = counter_arg.replace("demonstrates", "claims to demonstrate")
            counter_arguments.append(counter_arg)
        
        for i, argument in enumerate(counter_arguments[:3], 1):
            arguments_text += f"{i}. {argument}\n\n"
        
        # Add arguments based on law sections
        for i, section in enumerate(law_sections[:2], len(counter_arguments[:3]) + 1):
            arguments_text += f"{i}. With respect to {section['title']} Section {section['sectionNumber']}, "
            arguments_text += f"the correct interpretation does not support the petitioner's/plaintiff's claim because [SPECIFIC LEGAL REASONING].\n\n"
        
        # Add arguments based on case histories
        for i, case in enumerate(case_histories[:2], len(counter_arguments[:3]) + len(law_sections[:2]) + 1):
            arguments_text += f"{i}. The case of {case['parties']} ({case['citation']}) cited by the petitioner/plaintiff is distinguishable from the present case because the facts and circumstances are materially different.\n\n"
        
        return arguments_text
    
    def _generate_rebuttal_to_reply(self, analysis: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate rebuttal to reply for rejoinder."""
        if info.get("rebuttal_to_reply"):
            return info["rebuttal_to_reply"]
        
        rebuttal_text = "The petitioner/plaintiff submits the following in response to the reply/written statement:\n\n"
        
        # Generate generic rebuttals
        rebuttal_text += "1. The preliminary objections raised in the reply/written statement are misconceived and liable to be rejected.\n\n"
        rebuttal_text += "2. The respondent/defendant has failed to specifically deny the material allegations in the petition/plaint, which amounts to admission of those facts.\n\n"
        
        # Add specific rebuttals based on analysis
        challenges = analysis.get("challenges", [])
        for i, challenge in enumerate(challenges[:2], 3):
            rebuttal_text += f"{i}. The respondent's/defendant's contention that {challenge} is incorrect and misleading because [SPECIFIC REBUTTAL].\n\n"
        
        return rebuttal_text
    
    def _generate_additional_facts(self, brief_analysis: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate additional facts for rejoinder."""
        if info.get("additional_facts"):
            return info["additional_facts"]
        
        additional_facts_text = "The petitioner/plaintiff submits the following additional facts that have come to light:\n\n"
        
        # Generate generic additional facts
        additional_facts_text += "1. After filing the petition/plaint, the petitioner/plaintiff has discovered additional evidence that further strengthens the case.\n\n"
        additional_facts_text += "2. The respondent/defendant has continued with the alleged illegal activities even after notice of this proceeding.\n\n"
        
        # Add domain-specific facts
        domains = brief_analysis.get("domains", ["general"])
        
        if "criminal" in domains:
            additional_facts_text += "3. New witnesses have come forward who can testify to the respondent's/defendant's involvement in the alleged offense.\n\n"
        elif "civil" in domains:
            additional_facts_text += "3. Additional documents have been discovered that conclusively prove the breach of contract/agreement by the respondent/defendant.\n\n"
        elif "constitutional" in domains:
            additional_facts_text += "3. Recent actions by the respondent further demonstrate the pattern of constitutional violations alleged in the petition.\n\n"
        
        return additional_facts_text
    
    def _generate_deponent_details(self, entities: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate deponent details for affidavit."""
        if info.get("deponent_details"):
            return info["deponent_details"]
        
        # Get potential deponent
        potential_parties = entities.get("potential_parties", {})
        persons = entities.get("persons", [])
        
        deponent = ""
        if potential_parties.get("petitioners") and len(potential_parties["petitioners"]) > 0:
            deponent = potential_parties["petitioners"][0]
        elif potential_parties.get("plaintiffs") and len(potential_parties["plaintiffs"]) > 0:
            deponent = potential_parties["plaintiffs"][0]
        elif persons and len(persons) > 0:
            deponent = persons[0]
        else:
            deponent = "[DEPONENT NAME]"
        
        # Get location
        locations = entities.get("locations", [])
        location = locations[0] if locations else "[ADDRESS]"
        
        deponent_text = f"I, {deponent}, aged about [AGE] years, [OCCUPATION], [NATIONALITY], resident of {location}, do hereby solemnly affirm and declare as under:"
        
        return deponent_text
    
    def _generate_affidavit_statements(self, brief_analysis: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate statements for affidavit."""
        if info.get("statements"):
            return info["statements"]
        
        # Extract summary
        summary = brief_analysis.get("summary", "")
        
        # Split summary into sentences
        sentences = sent_tokenize(summary)
        
        statements_text = ""
        
        # Add statements
        for i, sentence in enumerate(sentences, 1):
            statements_text += f"{i}. {sentence}\n\n"
        
        # Add standard statements
        statements_text += f"{len(sentences) + 1}. I am well conversant with the facts and circumstances of the case and am competent to swear this affidavit.\n\n"
        statements_text += f"{len(sentences) + 2}. I have read and understood the contents of the accompanying petition/application and the same are true and correct to my knowledge.\n\n"
        statements_text += f"{len(sentences) + 3}. The annexures attached to the petition/application are true copies of their respective originals.\n\n"
        
        return statements_text
    
    def _generate_affidavit_declaration(self, info: Dict[str, Any]) -> str:
        """Generate declaration for affidavit."""
        if info.get("declaration"):
            return info["declaration"]
        
        declaration_text = "I, the deponent above named, do hereby verify that the contents of this affidavit are true and correct to my knowledge, no part of it is false and nothing material has been concealed therefrom."
        
        return declaration_text
    
    def _generate_attestation(self, info: Dict[str, Any]) -> str:
        """Generate attestation for affidavit."""
        if info.get("attestation"):
            return info["attestation"]
        
        # Get date
        today = datetime.now().strftime("%d/%m/%Y")
        
        attestation_text = f"Solemnly affirmed and signed before me on this {today} at [PLACE].\n\nNOTARY PUBLIC/OATH COMMISSIONER"
        
        return attestation_text
    
    def _generate_sender_details(self, entities: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate sender details for legal notice."""
        if info.get("sender_details"):
            return info["sender_details"]
        
        # Get potential sender
        potential_parties = entities.get("potential_parties", {})
        persons = entities.get("persons", [])
        
        sender = ""
        if potential_parties.get("petitioners") and len(potential_parties["petitioners"]) > 0:
            sender = potential_parties["petitioners"][0]
        elif potential_parties.get("plaintiffs") and len(potential_parties["plaintiffs"]) > 0:
            sender = potential_parties["plaintiffs"][0]
        elif persons and len(persons) > 0:
            sender = persons[0]
        else:
            sender = "[SENDER NAME]"
        
        sender_text = f"FROM:\n{sender}\n[ADDRESS]\n[CONTACT DETAILS]\n\nTHROUGH:\n[ADVOCATE NAME]\n[ADVOCATE ADDRESS]\n[ADVOCATE CONTACT DETAILS]"
        
        return sender_text
    
    def _generate_recipient_details(self, entities: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate recipient details for legal notice."""
        if info.get("recipient_details"):
            return info["recipient_details"]
        
        # Get potential recipient
        potential_parties = entities.get("potential_parties", {})
        
        recipient = ""
        if potential_parties.get("respondents") and len(potential_parties["respondents"]) > 0:
            recipient = potential_parties["respondents"][0]
        elif potential_parties.get("defendants") and len(potential_parties["defendants"]) > 0:
            recipient = potential_parties["defendants"][0]
        else:
            recipient = "[RECIPIENT NAME]"
        
        recipient_text = f"TO:\n{recipient}\n[ADDRESS]\n[CONTACT DETAILS]"
        
        return recipient_text
    
    def _generate_notice_subject(self, brief_analysis: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate subject for legal notice."""
        if info.get("subject"):
            return info["subject"]
        
        # Determine subject based on legal domains
        domains = brief_analysis.get("domains", ["general"])
        acts = brief_analysis.get("acts", [])
        
        subject_text = "SUBJECT: "
        
        if "criminal" in domains:
            subject_text += "LEGAL NOTICE FOR FILING CRIMINAL COMPLAINT"
        elif "civil" in domains:
            if "contract" in " ".join(domains).lower():
                subject_text += "LEGAL NOTICE FOR BREACH OF CONTRACT AND RECOVERY OF DAMAGES"
            else:
                subject_text += "LEGAL NOTICE FOR CIVIL DISPUTE"
        elif "corporate" in domains:
            subject_text += "LEGAL NOTICE FOR CORPORATE DISPUTE"
        else:
            subject_text += "LEGAL NOTICE"
        
        # Add act reference if available
        if acts and len(acts) > 0:
            subject_text += f" UNDER {acts[0]}"
        
        return subject_text
    
    def _generate_notice_demand(self, analysis: Dict[str, Any], info: Dict[str, Any]) -> str:
        """Generate demand section for legal notice."""
        if info.get("demand"):
            return info["demand"]
        
        recommendations = analysis.get("recommendations", [])
        
        demand_text = "In view of the above facts and circumstances, you are hereby called upon to:\n\n"
        
        if recommendations and len(recommendations) > 0:
            for i, rec in enumerate(recommendations[:3], 1):
                demand_text += f"{i}. {rec}\n\n"
        else:
            demand_text += "1. [SPECIFIC DEMAND 1]\n\n"
            demand_text += "2. [SPECIFIC DEMAND 2]\n\n"
            demand_text += "3. Pay the legal costs of this notice.\n\n"
        
        return demand_text
    
    def _generate_notice_timeline(self, info: Dict[str, Any]) -> str:
        """Generate timeline section for legal notice."""
        if info.get("timeline"):
            return info["timeline"]
        
        timeline_text = "You are hereby given [NUMBER] days from the receipt of this notice to comply with the above demands, failing which my client will be constrained to initiate appropriate legal proceedings against you, both civil and criminal, in the appropriate forum, at your risk and cost."
        
        return timeline_text
    
    def _generate_notice_consequences(self, law_sections: List[Dict[str, Any]], info: Dict[str, Any]) -> str:
        """Generate consequences section for legal notice."""
        if info.get("consequences"):
            return info["consequences"]
        
        consequences_text = "Please note that if you fail to comply with the above demands within the stipulated time, you will be liable for the following consequences:\n\n"
        
        if law_sections and len(law_sections) > 0:
            for i, section in enumerate(law_sections[:2], 1):
                consequences_text += f"{i}. Legal action under {section['title']} Section {section['sectionNumber']}.\n\n"
        
        consequences_text += f"{len(law_sections[:2]) + 1}. Payment of damages, compensation, and legal costs.\n\n"
        consequences_text += f"{len(law_sections[:2]) + 2}. Any other legal remedy available under the law.\n\n"
        
        return consequences_text


# Example usage
if __name__ == "__main__":
    # Create the agent
    drafting_agent = CaseFileDraftingAgent()
    
    # Example brief analysis
    brief_analysis = {
        "acts": ["Indian Contract Act, 1872", "Specific Relief Act, 1963"],
        "sections": ["73", "10"],
        "citations": ["AIR 2019 SC 1234"],
        "keywords": ["contract", "breach", "damages", "specific", "performance"],
        "domains": ["civil", "contract"],
        "summary": "This case involves a breach of contract by XYZ Ltd who failed to deliver equipment worth Rs. 50 lakhs by the agreed date and has refused to honor the penalty clause."
    }
    
    # Example law sections
    law_sections = [
        {
            "title": "Indian Contract Act",
            "sectionNumber": "73",
            "content": "When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it.",
            "relevance": 9
        },
        {
            "title": "Specific Relief Act",
            "sectionNumber": "10",
            "content": "Cases in which specific performance of contract enforceable.—Except as otherwise provided in this Chapter, the specific performance of any contract may, in the discretion of the court, be enforced—(a) when there exists no standard for ascertaining actual damage caused by the non-performance of the act agreed to be done; or (b) when the act agreed to be done is such that compensation in money for its non-performance would not afford adequate relief.",
            "relevance": 7
        }
    ]
    
    # Example case histories
    case_histories = [
        {
            "citation": "AIR 2019 SC 1234",
            "parties": "Sharma vs. State of Maharashtra",
            "holdings": "The Supreme Court held that for an offense under Section 420 of IPC, the intention to deceive should be present from the beginning of the transaction.",
            "relevance": 8,
            "date": "12 Mar 2019"
        },
        {
            "citation": "AIR 2017 SC 567",
            "parties": "Mehta vs. Patel & Others",
            "holdings": "The Court established that in cases of contractual breach, the aggrieved party must prove actual damages suffered to claim compensation under Section 73 of the Indian Contract Act.",
            "relevance": 9,
            "date": "05 Aug 2017"
        }
    ]
    
    # Example analysis
    analysis = {
        "summary": "This case involves a breach of contract under Section 73 of the Indian Contract Act, with potential for specific performance under Section 10 of the Specific Relief Act. There are strong precedents from the Supreme Court that support your position, particularly regarding the requirement to prove actual damages suffered.",
        "arguments": [
            "The defendant's actions constitute a clear breach of contract as they failed to deliver the equipment by the agreed date.",
            "The penalty clause in the contract is valid and enforceable under Section 73 of the Indian Contract Act.",
            "The documented communications clearly establish prior intent to honor the contract, which was subsequently breached."
        ],
        "challenges": [
            "The defense may argue force majeure due to supply chain disruptions.",
            "Establishing the exact quantum of damages may be challenging without detailed financial records.",
            "The defendant may claim that the penalty clause is unreasonable and amounts to a penalty rather than liquidated damages."
        ],
        "recommendations": [
            "Gather all communication records to establish the terms of the contract and subsequent breach.",
            "Obtain expert testimony to quantify the financial damages suffered due to the delay.",
            "Consider seeking specific performance of the contract under Section 10 of the Specific Relief Act as an alternative remedy.",
            "Prepare for potential settlement discussions, as breach of contract cases often resolve before trial."
        ]
    }
    
    # Example brief content
    brief_content = """
    This case involves a dispute between ABC Corporation and XYZ Ltd regarding a breach of contract. 
    On January 15, 2024, ABC Corporation entered into an agreement with XYZ Ltd for the supply of 
    manufacturing equipment worth Rs. 50 lakhs. According to the terms, delivery was to be completed 
    by March 30, 2024, with a penalty clause for late delivery.
    
    XYZ Ltd failed to deliver the equipment by the agreed date and has now refused to honor the penalty 
    clause, citing force majeure due to supply chain disruptions. However, our investigation reveals that 
    XYZ Ltd had actually diverted the equipment to another buyer who offered a higher price.
    
    We are seeking remedies under Section 73 of the Indian Contract Act, 1872 for breach of contract and 
    also considering action under Section 10 of the Specific Relief Act, 1963 for specific performance.
    
    Previous similar cases include Mehta vs. Patel & Others (AIR 2017 SC 567) where the court 
    held that the aggrieved party must prove actual damages suffered to claim compensation.
    """
    
    # Additional information
    additional_info = {
        "court": "HIGH COURT OF DELHI AT NEW DELHI",
        "case_number": "CS (COMM) XXX/2024"
    }
    
    # Draft a petition
    petition = drafting_agent.draft_case_file(
        document_type="petition",
        brief_analysis=brief_analysis,
        law_sections=law_sections,
        case_histories=case_histories,
        analysis=analysis,
        brief_content=brief_content,
        additional_info=additional_info
    )
    
    # Print the drafted petition
    print("DRAFTED PETITION:")
    print("=================")
    print(petition["content"])
    
    # Print metadata
    print("\nMETADATA:")
    print("=========")
    for key, value in petition["metadata"].items():
        print(f"{key}: {value}")
