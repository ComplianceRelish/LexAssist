import os
import json
import logging
import re
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('case_file_drafter')

class CaseFileDrafter:
    """
    Generates legal case files based on brief analysis and user requirements.
    """
    
    def __init__(self, logo_path: Optional[str] = None):
        """
        Initialize the case file drafter.
        
        Args:
            logo_path: Path to the logo image file
        """
        self.logo_path = logo_path or '/home/ubuntu/legal_app_frontend/public/images/logo.png'
        logger.info("Case file drafter initialized")
    
    def draft_case_file(self, brief_text: str, analysis_results: Dict[str, Any], 
                       options: Dict[str, Any]) -> Dict[str, Any]:
        """
        Draft a case file based on the brief and analysis results.
        
        Args:
            brief_text: The original brief text
            analysis_results: The analysis results
            options: Options for the case file
                - document_type: Type of document (petition, reply, rejoinder, etc.)
                - court: Court for which the document is being prepared
                - include_arguments: Whether to include arguments
                - include_prayer: Whether to include prayer
            
        Returns:
            Dict containing the drafted case file
        """
        logger.info(f"Drafting case file of type: {options.get('document_type', 'petition')}")
        
        # Extract key information from the brief and analysis results
        parties = self._extract_parties(brief_text)
        facts = self._extract_facts(brief_text)
        legal_provisions = self._extract_legal_provisions(analysis_results)
        case_precedents = self._extract_case_precedents(analysis_results)
        arguments = self._extract_arguments(analysis_results)
        
        # Determine document type and generate appropriate content
        document_type = options.get('document_type', 'petition').lower()
        court = options.get('court', 'High Court')
        include_arguments = options.get('include_arguments', True)
        include_prayer = options.get('include_prayer', True)
        
        if document_type == 'petition':
            content = self._generate_petition(parties, facts, legal_provisions, case_precedents, 
                                            arguments, court, include_arguments, include_prayer)
            title = f"PETITION - {parties['petitioner']} vs. {parties['respondent']}"
        
        elif document_type == 'reply':
            content = self._generate_reply(parties, facts, legal_provisions, case_precedents, 
                                         arguments, court, include_arguments)
            title = f"REPLY - {parties['petitioner']} vs. {parties['respondent']}"
        
        elif document_type == 'rejoinder':
            content = self._generate_rejoinder(parties, facts, legal_provisions, case_precedents, 
                                             arguments, court, include_arguments)
            title = f"REJOINDER - {parties['petitioner']} vs. {parties['respondent']}"
        
        elif document_type == 'written_statement':
            content = self._generate_written_statement(parties, facts, legal_provisions, case_precedents, 
                                                     arguments, court, include_arguments)
            title = f"WRITTEN STATEMENT - {parties['petitioner']} vs. {parties['respondent']}"
        
        elif document_type == 'legal_notice':
            content = self._generate_legal_notice(parties, facts, legal_provisions, 
                                                include_arguments, include_prayer)
            title = f"LEGAL NOTICE - {parties['petitioner']} to {parties['respondent']}"
        
        elif document_type == 'affidavit':
            content = self._generate_affidavit(parties, facts, court)
            title = f"AFFIDAVIT - {parties['petitioner']}"
        
        else:
            # Default to petition if document type is not recognized
            content = self._generate_petition(parties, facts, legal_provisions, case_precedents, 
                                            arguments, court, include_arguments, include_prayer)
            title = f"PETITION - {parties['petitioner']} vs. {parties['respondent']}"
        
        return {
            "title": title,
            "content": content,
            "document_type": document_type,
            "court": court,
            "date": datetime.now().strftime("%d %B %Y"),
            "parties": parties
        }
    
    def _extract_parties(self, brief_text: str) -> Dict[str, str]:
        """
        Extract parties from the brief text.
        
        Args:
            brief_text: The brief text
            
        Returns:
            Dict containing petitioner and respondent
        """
        # Look for common patterns to identify parties
        petitioner_patterns = [
            r'(?i)petitioner[s]?[\s:]+([^\.;,\n]+)',
            r'(?i)plaintiff[s]?[\s:]+([^\.;,\n]+)',
            r'(?i)appellant[s]?[\s:]+([^\.;,\n]+)',
            r'(?i)claimant[s]?[\s:]+([^\.;,\n]+)',
            r'(?i)complainant[s]?[\s:]+([^\.;,\n]+)'
        ]
        
        respondent_patterns = [
            r'(?i)respondent[s]?[\s:]+([^\.;,\n]+)',
            r'(?i)defendant[s]?[\s:]+([^\.;,\n]+)',
            r'(?i)opposite part(?:y|ies)[\s:]+([^\.;,\n]+)',
            r'(?i)accused[\s:]+([^\.;,\n]+)'
        ]
        
        # Try to find petitioner
        petitioner = "The Petitioner"
        for pattern in petitioner_patterns:
            match = re.search(pattern, brief_text)
            if match:
                petitioner = match.group(1).strip()
                break
        
        # Try to find respondent
        respondent = "The Respondent"
        for pattern in respondent_patterns:
            match = re.search(pattern, brief_text)
            if match:
                respondent = match.group(1).strip()
                break
        
        # Look for "vs" or "versus" pattern
        vs_pattern = r'([^\.;,\n]+)\s+(?:vs\.?|versus)\s+([^\.;,\n]+)'
        match = re.search(vs_pattern, brief_text)
        if match:
            if not petitioner or petitioner == "The Petitioner":
                petitioner = match.group(1).strip()
            if not respondent or respondent == "The Respondent":
                respondent = match.group(2).strip()
        
        return {
            "petitioner": petitioner,
            "respondent": respondent
        }
    
    def _extract_facts(self, brief_text: str) -> List[str]:
        """
        Extract facts from the brief text.
        
        Args:
            brief_text: The brief text
            
        Returns:
            List of facts
        """
        # Look for facts section
        facts_section_pattern = r'(?i)(?:facts|background|factual\s+background)[:\s]+(.*?)(?=\n\s*\n|\Z)'
        match = re.search(facts_section_pattern, brief_text, re.DOTALL)
        
        if match:
            facts_text = match.group(1).strip()
            # Split into sentences and clean up
            sentences = re.split(r'(?<=[.!?])\s+', facts_text)
            facts = [s.strip() for s in sentences if s.strip()]
            return facts
        
        # If no facts section found, try to extract sentences that look like facts
        sentences = re.split(r'(?<=[.!?])\s+', brief_text)
        facts = []
        
        for sentence in sentences:
            sentence = sentence.strip()
            # Skip short sentences or those that look like legal arguments
            if (len(sentence) > 20 and 
                not re.search(r'(?i)submit|argue|contend|pray|plead', sentence) and
                not sentence.startswith('Section') and
                not sentence.startswith('Article')):
                facts.append(sentence)
        
        # Limit to a reasonable number of facts
        return facts[:10]
    
    def _extract_legal_provisions(self, analysis_results: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Extract legal provisions from the analysis results.
        
        Args:
            analysis_results: The analysis results
            
        Returns:
            List of legal provisions
        """
        legal_provisions = []
        
        if 'lawSections' in analysis_results and analysis_results['lawSections']:
            for section in analysis_results['lawSections']:
                legal_provisions.append({
                    "act": section.get('title', 'Unknown Act'),
                    "section": section.get('sectionNumber', 'N/A'),
                    "content": section.get('content', '')
                })
        
        return legal_provisions
    
    def _extract_case_precedents(self, analysis_results: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Extract case precedents from the analysis results.
        
        Args:
            analysis_results: The analysis results
            
        Returns:
            List of case precedents
        """
        case_precedents = []
        
        if 'caseHistories' in analysis_results and analysis_results['caseHistories']:
            for case in analysis_results['caseHistories']:
                case_precedents.append({
                    "citation": case.get('citation', 'Unknown Citation'),
                    "parties": case.get('parties', 'Unknown Parties'),
                    "holdings": case.get('holdings', '')
                })
        
        return case_precedents
    
    def _extract_arguments(self, analysis_results: Dict[str, Any]) -> List[str]:
        """
        Extract arguments from the analysis results.
        
        Args:
            analysis_results: The analysis results
            
        Returns:
            List of arguments
        """
        arguments = []
        
        if ('analysis' in analysis_results and 
            'arguments' in analysis_results['analysis'] and 
            analysis_results['analysis']['arguments']):
            arguments = analysis_results['analysis']['arguments']
        
        return arguments
    
    def _generate_petition(self, parties: Dict[str, str], facts: List[str], 
                         legal_provisions: List[Dict[str, str]], 
                         case_precedents: List[Dict[str, str]], 
                         arguments: List[str], court: str, 
                         include_arguments: bool, include_prayer: bool) -> str:
        """
        Generate a petition.
        
        Args:
            parties: Dict containing petitioner and respondent
            facts: List of facts
            legal_provisions: List of legal provisions
            case_precedents: List of case precedents
            arguments: List of arguments
            court: Court for which the document is being prepared
            include_arguments: Whether to include arguments
            include_prayer: Whether to include prayer
            
        Returns:
            Petition content
        """
        content = []
        
        # Add header
        content.append(f"IN THE {court.upper()}")
        content.append("")
        content.append("PETITION NO. _____ OF _____")
        content.append("")
        content.append("IN THE MATTER OF:")
        content.append("")
        content.append(f"{parties['petitioner']}")
        content.append("... PETITIONER")
        content.append("")
        content.append("VERSUS")
        content.append("")
        content.append(f"{parties['respondent']}")
        content.append("... RESPONDENT")
        content.append("")
        content.append("PETITION UNDER _____")
        content.append("")
        content.append("MOST RESPECTFULLY SHOWETH:")
        content.append("")
        
        # Add facts
        content.append("1. FACTS OF THE CASE:")
        content.append("")
        for i, fact in enumerate(facts, 1):
            content.append(f"   {i}. {fact}")
        content.append("")
        
        # Add grounds
        content.append("2. GROUNDS:")
        content.append("")
        
        # Add legal provisions
        if legal_provisions:
            content.append("   A. APPLICABLE LEGAL PROVISIONS:")
            content.append("")
            for i, provision in enumerate(legal_provisions, 1):
                content.append(f"      {i}. {provision['act']}, Section {provision['section']}:")
                content.append(f"         {provision['content']}")
                content.append("")
        
        # Add case precedents
        if case_precedents:
            content.append("   B. RELEVANT CASE LAW:")
            content.append("")
            for i, case in enumerate(case_precedents, 1):
                content.append(f"      {i}. {case['parties']} ({case['citation']}):")
                content.append(f"         {case['holdings']}")
                content.append("")
        
        # Add arguments
        if include_arguments and arguments:
            content.append("   C. ARGUMENTS:")
            content.append("")
            for i, argument in enumerate(arguments, 1):
                content.append(f"      {i}. {argument}")
            content.append("")
        
        # Add prayer
        if include_prayer:
            content.append("3. PRAYER:")
            content.append("")
            content.append("   In view of the facts and circumstances of the case and the grounds mentioned above,")
            content.append("   it is most respectfully prayed that this Hon'ble Court may be pleased to:")
            content.append("")
            content.append("   a) [SPECIFIC RELIEF SOUGHT]")
            content.append("")
            content.append("   b) Pass any other order(s) as this Hon'ble Court may deem fit and proper in the")
            content.append("      interest of justice.")
            content.append("")
        
        # Add signature block
        content.append("FILED BY:")
        content.append("")
        content.append("")
        content.append("ADVOCATE FOR THE PETITIONER")
        content.append("")
        content.append(f"PLACE: _____")
        content.append(f"DATE: {datetime.now().strftime('%d/%m/%Y')}")
        
        return "\n".join(content)
    
    def _generate_reply(self, parties: Dict[str, str], facts: List[str], 
                      legal_provisions: List[Dict[str, str]], 
                      case_precedents: List[Dict[str, str]], 
                      arguments: List[str], court: str, 
                      include_arguments: bool) -> str:
        """
        Generate a reply.
        
        Args:
            parties: Dict containing petitioner and respondent
            facts: List of facts
            legal_provisions: List of legal provisions
            case_precedents: List of case precedents
            arguments: List of arguments
            court: Court for which the document is being prepared
            include_arguments: Whether to include arguments
            
        Returns:
            Reply content
        """
        content = []
        
        # Add header
        content.append(f"IN THE {court.upper()}")
        content.append("")
        content.append("CASE NO. _____ OF _____")
        content.append("")
        content.append("IN THE MATTER OF:")
        content.append("")
        content.append(f"{parties['petitioner']}")
        content.append("... PETITIONER/PLAINTIFF")
        content.append("")
        content.append("VERSUS")
        content.append("")
        content.append(f"{parties['respondent']}")
        content.append("... RESPONDENT/DEFENDANT")
        content.append("")
        content.append("REPLY ON BEHALF OF THE RESPONDENT/DEFENDANT")
        content.append("")
        
        # Add preliminary objections
        content.append("1. PRELIMINARY OBJECTIONS:")
        content.append("")
        content.append("   The Respondent/Defendant submits the following preliminary objections:")
        content.append("")
        content.append("   a) The petition/plaint is not maintainable in law and on facts.")
        content.append("   b) The petition/plaint is barred by limitation.")
        content.append("   c) The petition/plaint does not disclose any cause of action.")
        content.append("")
        
        # Add reply to facts
        content.append("2. REPLY TO FACTS:")
        content.append("")
        for i, fact in enumerate(facts, 1):
            content.append(f"   {i}. With reference to paragraph {i} of the petition/plaint, it is submitted that")
            content.append(f"      {fact} - This is denied. The correct position is that [COUNTER FACT].")
            content.append("")
        
        # Add legal provisions
        if legal_provisions:
            content.append("3. APPLICABLE LEGAL PROVISIONS:")
            content.append("")
            for i, provision in enumerate(legal_provisions, 1):
                content.append(f"   {i}. {provision['act']}, Section {provision['section']}:")
                content.append(f"      The Petitioner/Plaintiff has misinterpreted this provision. The correct")
                content.append(f"      interpretation is that [INTERPRETATION].")
                content.append("")
        
        # Add case precedents
        if case_precedents:
            content.append("4. RELEVANT CASE LAW:")
            content.append("")
            for i, case in enumerate(case_precedents, 1):
                content.append(f"   {i}. {case['parties']} ({case['citation']}):")
                content.append(f"      This case is distinguishable on facts as [DISTINCTION].")
                content.append("")
        
        # Add arguments
        if include_arguments and arguments:
            content.append("5. COUNTER ARGUMENTS:")
            content.append("")
            for i, argument in enumerate(arguments, 1):
                content.append(f"   {i}. In response to the argument that {argument}, it is submitted that")
                content.append(f"      [COUNTER ARGUMENT].")
            content.append("")
        
        # Add prayer
        content.append("6. PRAYER:")
        content.append("")
        content.append("   In view of the above submissions, it is most respectfully prayed that this Hon'ble")
        content.append("   Court may be pleased to dismiss the petition/plaint with costs.")
        content.append("")
        
        # Add signature block
        content.append("FILED BY:")
        content.append("")
        content.append("")
        content.append("ADVOCATE FOR THE RESPONDENT/DEFENDANT")
        content.append("")
        content.append(f"PLACE: _____")
        content.append(f"DATE: {datetime.now().strftime('%d/%m/%Y')}")
        
        return "\n".join(content)
    
    def _generate_rejoinder(self, parties: Dict[str, str], facts: List[str], 
                          legal_provisions: List[Dict[str, str]], 
                          case_precedents: List[Dict[str, str]], 
                          arguments: List[str], court: str, 
                          include_arguments: bool) -> str:
        """
        Generate a rejoinder.
        
        Args:
            parties: Dict containing petitioner and respondent
            facts: List of facts
            legal_provisions: List of legal provisions
            case_precedents: List of case precedents
            arguments: List of arguments
            court: Court for which the document is being prepared
            include_arguments: Whether to include arguments
            
        Returns:
            Rejoinder content
        """
        content = []
        
        # Add header
        content.append(f"IN THE {court.upper()}")
        content.append("")
        content.append("CASE NO. _____ OF _____")
        content.append("")
        content.append("IN THE MATTER OF:")
        content.append("")
        content.append(f"{parties['petitioner']}")
        content.append("... PETITIONER/PLAINTIFF")
        content.append("")
        content.append("VERSUS")
        content.append("")
        content.append(f"{parties['respondent']}")
        content.append("... RESPONDENT/DEFENDANT")
        content.append("")
        content.append("REJOINDER ON BEHALF OF THE PETITIONER/PLAINTIFF")
        content.append("")
        
        # Add introduction
        content.append("1. INTRODUCTION:")
        content.append("")
        content.append("   The Petitioner/Plaintiff submits this rejoinder to the reply filed by the")
        content.append("   Respondent/Defendant and reiterates the submissions made in the petition/plaint.")
        content.append("   The Petitioner/Plaintiff further submits as under:")
        content.append("")
        
        # Add rejoinder to preliminary objections
        content.append("2. REJOINDER TO PRELIMINARY OBJECTIONS:")
        content.append("")
        content.append("   a) The objection that the petition/plaint is not maintainable is baseless as")
        content.append("      [REASON].")
        content.append("   b) The petition/plaint is well within the limitation period as [REASON].")
        content.append("   c) The petition/plaint clearly discloses a cause of action as [REASON].")
        content.append("")
        
        # Add rejoinder to facts
        content.append("3. REJOINDER TO REPLY ON FACTS:")
        content.append("")
        for i, fact in enumerate(facts, 1):
            content.append(f"   {i}. The Respondent/Defendant has denied the fact that {fact}.")
            content.append(f"      This denial is false and misleading. The truth is that [EXPLANATION].")
            content.append("")
        
        # Add legal provisions
        if legal_provisions:
            content.append("4. CORRECT INTERPRETATION OF LEGAL PROVISIONS:")
            content.append("")
            for i, provision in enumerate(legal_provisions, 1):
                content.append(f"   {i}. {provision['act']}, Section {provision['section']}:")
                content.append(f"      The Respondent/Defendant has misinterpreted this provision. The correct")
                content.append(f"      interpretation, as submitted in the petition/plaint, is that [INTERPRETATION].")
                content.append("")
        
        # Add case precedents
        if case_precedents:
            content.append("5. APPLICABILITY OF CASE LAW:")
            content.append("")
            for i, case in enumerate(case_precedents, 1):
                content.append(f"   {i}. {case['parties']} ({case['citation']}):")
                content.append(f"      The Respondent/Defendant's attempt to distinguish this case is misconceived.")
                content.append(f"      The ratio of this case is squarely applicable as [EXPLANATION].")
                content.append("")
        
        # Add arguments
        if include_arguments and arguments:
            content.append("6. REBUTTAL TO COUNTER ARGUMENTS:")
            content.append("")
            for i, argument in enumerate(arguments, 1):
                content.append(f"   {i}. The Respondent/Defendant's counter to the argument that {argument}")
                content.append(f"      is untenable because [REBUTTAL].")
            content.append("")
        
        # Add conclusion
        content.append("7. CONCLUSION:")
        content.append("")
        content.append("   In view of the above submissions, the Petitioner/Plaintiff reiterates the prayer")
        content.append("   made in the petition/plaint and requests this Hon'ble Court to grant the relief")
        content.append("   sought therein.")
        content.append("")
        
        # Add signature block
        content.append("FILED BY:")
        content.append("")
        content.append("")
        content.append("ADVOCATE FOR THE PETITIONER/PLAINTIFF")
        content.append("")
        content.append(f"PLACE: _____")
        content.append(f"DATE: {datetime.now().strftime('%d/%m/%Y')}")
        
        return "\n".join(content)
    
    def _generate_written_statement(self, parties: Dict[str, str], facts: List[str], 
                                  legal_provisions: List[Dict[str, str]], 
                                  case_precedents: List[Dict[str, str]], 
                                  arguments: List[str], court: str, 
                                  include_arguments: bool) -> str:
        """
        Generate a written statement.
        
        Args:
            parties: Dict containing petitioner and respondent
            facts: List of facts
            legal_provisions: List of legal provisions
            case_precedents: List of case precedents
            arguments: List of arguments
            court: Court for which the document is being prepared
            include_arguments: Whether to include arguments
            
        Returns:
            Written statement content
        """
        content = []
        
        # Add header
        content.append(f"IN THE {court.upper()}")
        content.append("")
        content.append("SUIT NO. _____ OF _____")
        content.append("")
        content.append("IN THE MATTER OF:")
        content.append("")
        content.append(f"{parties['petitioner']}")
        content.append("... PLAINTIFF")
        content.append("")
        content.append("VERSUS")
        content.append("")
        content.append(f"{parties['respondent']}")
        content.append("... DEFENDANT")
        content.append("")
        content.append("WRITTEN STATEMENT ON BEHALF OF THE DEFENDANT")
        content.append("")
        
        # Add preliminary objections
        content.append("1. PRELIMINARY OBJECTIONS:")
        content.append("")
        content.append("   The Defendant raises the following preliminary objections:")
        content.append("")
        content.append("   a) This Hon'ble Court has no jurisdiction to try and entertain the present suit.")
        content.append("   b) The suit is barred by limitation.")
        content.append("   c) The plaint does not disclose any cause of action against the Defendant.")
        content.append("   d) The suit is bad for non-joinder of necessary parties.")
        content.append("")
        
        # Add paragraph-wise reply
        content.append("2. PARAGRAPH-WISE REPLY:")
        content.append("")
        for i, fact in enumerate(facts, 1):
            content.append(f"   {i}. With reference to paragraph {i} of the plaint, it is submitted that")
            content.append(f"      {fact} - This is denied. The correct position is that [COUNTER FACT].")
            content.append("")
        
        # Add additional facts
        content.append("3. ADDITIONAL FACTS:")
        content.append("")
        content.append("   a) [ADDITIONAL FACT 1]")
        content.append("   b) [ADDITIONAL FACT 2]")
        content.append("   c) [ADDITIONAL FACT 3]")
        content.append("")
        
        # Add legal provisions
        if legal_provisions:
            content.append("4. LEGAL SUBMISSIONS:")
            content.append("")
            for i, provision in enumerate(legal_provisions, 1):
                content.append(f"   {i}. {provision['act']}, Section {provision['section']}:")
                content.append(f"      The Plaintiff has misinterpreted this provision. The correct")
                content.append(f"      interpretation is that [INTERPRETATION].")
                content.append("")
        
        # Add case precedents
        if case_precedents:
            content.append("5. CASE LAW:")
            content.append("")
            for i, case in enumerate(case_precedents, 1):
                content.append(f"   {i}. {case['parties']} ({case['citation']}):")
                content.append(f"      This case is distinguishable on facts as [DISTINCTION].")
                content.append("")
        
        # Add arguments
        if include_arguments and arguments:
            content.append("6. COUNTER ARGUMENTS:")
            content.append("")
            for i, argument in enumerate(arguments, 1):
                content.append(f"   {i}. In response to the argument that {argument}, it is submitted that")
                content.append(f"      [COUNTER ARGUMENT].")
            content.append("")
        
        # Add prayer
        content.append("7. PRAYER:")
        content.append("")
        content.append("   In view of the above submissions, it is most respectfully prayed that this Hon'ble")
        content.append("   Court may be pleased to dismiss the suit with costs.")
        content.append("")
        
        # Add verification
        content.append("VERIFICATION:")
        content.append("")
        content.append("I, [NAME], the Defendant above named, do hereby verify that the contents of")
        content.append("paragraphs 1 to 7 are true and correct to the best of my knowledge and belief")
        content.append("and nothing material has been concealed therefrom.")
        content.append("")
        content.append(f"Verified at [PLACE] on this {datetime.now().strftime('%d')} day of {datetime.now().strftime('%B %Y')}.")
        content.append("")
        content.append("DEFENDANT")
        content.append("")
        
        # Add signature block
        content.append("FILED BY:")
        content.append("")
        content.append("")
        content.append("ADVOCATE FOR THE DEFENDANT")
        content.append("")
        content.append(f"PLACE: _____")
        content.append(f"DATE: {datetime.now().strftime('%d/%m/%Y')}")
        
        return "\n".join(content)
    
    def _generate_legal_notice(self, parties: Dict[str, str], facts: List[str], 
                             legal_provisions: List[Dict[str, str]], 
                             include_arguments: bool, include_prayer: bool) -> str:
        """
        Generate a legal notice.
        
        Args:
            parties: Dict containing petitioner and respondent
            facts: List of facts
            legal_provisions: List of legal provisions
            include_arguments: Whether to include arguments
            include_prayer: Whether to include prayer
            
        Returns:
            Legal notice content
        """
        content = []
        
        # Add header
        content.append("LEGAL NOTICE")
        content.append("")
        content.append(f"Date: {datetime.now().strftime('%d/%m/%Y')}")
        content.append("")
        content.append("To,")
        content.append(f"{parties['respondent']}")
        content.append("[ADDRESS]")
        content.append("")
        content.append("From,")
        content.append(f"{parties['petitioner']}")
        content.append("[ADDRESS]")
        content.append("")
        content.append("Through,")
        content.append("[ADVOCATE NAME]")
        content.append("[ADVOCATE ADDRESS]")
        content.append("")
        content.append("Subject: Legal Notice for [SUBJECT MATTER]")
        content.append("")
        content.append("Sir/Madam,")
        content.append("")
        content.append("Under instructions from and on behalf of my client, I hereby serve upon you the following legal notice:")
        content.append("")
        
        # Add facts
        content.append("1. FACTS:")
        content.append("")
        for i, fact in enumerate(facts, 1):
            content.append(f"   {i}. {fact}")
        content.append("")
        
        # Add legal provisions
        if legal_provisions:
            content.append("2. LEGAL PROVISIONS:")
            content.append("")
            for i, provision in enumerate(legal_provisions, 1):
                content.append(f"   {i}. As per {provision['act']}, Section {provision['section']}:")
                content.append(f"      {provision['content']}")
                content.append("")
        
        # Add demand
        content.append("3. DEMAND:")
        content.append("")
        content.append("   In view of the above facts and legal provisions, my client hereby calls upon you to:")
        content.append("")
        content.append("   a) [SPECIFIC DEMAND 1]")
        content.append("   b) [SPECIFIC DEMAND 2]")
        content.append("   c) [SPECIFIC DEMAND 3]")
        content.append("")
        
        # Add time limit
        content.append("4. TIME LIMIT:")
        content.append("")
        content.append("   You are hereby called upon to comply with the above demands within [NUMBER] days")
        content.append("   from the receipt of this notice, failing which my client will be constrained to")
        content.append("   initiate appropriate legal proceedings against you, civil and/or criminal, at your")
        content.append("   risk, cost, and consequences.")
        content.append("")
        
        # Add reservation of rights
        content.append("5. RESERVATION OF RIGHTS:")
        content.append("")
        content.append("   This notice is being issued without prejudice to any other rights and remedies")
        content.append("   available to my client under law, which are expressly reserved.")
        content.append("")
        
        # Add signature block
        content.append("Yours faithfully,")
        content.append("")
        content.append("")
        content.append("[ADVOCATE NAME]")
        content.append("Advocate for the Noticee")
        
        return "\n".join(content)
    
    def _generate_affidavit(self, parties: Dict[str, str], facts: List[str], court: str) -> str:
        """
        Generate an affidavit.
        
        Args:
            parties: Dict containing petitioner and respondent
            facts: List of facts
            court: Court for which the document is being prepared
            
        Returns:
            Affidavit content
        """
        content = []
        
        # Add header
        content.append(f"IN THE {court.upper()}")
        content.append("")
        content.append("CASE NO. _____ OF _____")
        content.append("")
        content.append("IN THE MATTER OF:")
        content.append("")
        content.append(f"{parties['petitioner']}")
        content.append("... PETITIONER/PLAINTIFF")
        content.append("")
        content.append("VERSUS")
        content.append("")
        content.append(f"{parties['respondent']}")
        content.append("... RESPONDENT/DEFENDANT")
        content.append("")
        content.append("AFFIDAVIT")
        content.append("")
        
        # Add deponent details
        content.append("I, [NAME], aged about [AGE] years, [OCCUPATION], resident of [ADDRESS], do hereby")
        content.append("solemnly affirm and state on oath as under:")
        content.append("")
        
        # Add facts
        for i, fact in enumerate(facts, 1):
            content.append(f"{i}. {fact}")
        content.append("")
        
        # Add verification
        content.append("VERIFICATION:")
        content.append("")
        content.append("I, the deponent above named, do hereby verify that the contents of paragraphs 1 to")
        content.append(f"{len(facts)} are true and correct to my knowledge and belief and nothing material")
        content.append("has been concealed therefrom.")
        content.append("")
        content.append(f"Verified at [PLACE] on this {datetime.now().strftime('%d')} day of {datetime.now().strftime('%B %Y')}.")
        content.append("")
        content.append("DEPONENT")
        
        return "\n".join(content)


# Example usage
if __name__ == "__main__":
    drafter = CaseFileDrafter()
    
    # Example brief and analysis results
    brief = """
    This case involves a breach of contract under Section 73 of the Indian Contract Act. 
    The petitioner, ABC Ltd., entered into a contract with the respondent, XYZ Ltd., for the supply of goods. 
    The respondent failed to deliver the goods by the agreed date of 15 March 2023, causing significant 
    financial losses to the petitioner. The contract clearly specified a delivery date and included 
    a penalty clause for late delivery.
    """
    
    analysis = {
        "lawSections": [
            {
                "title": "Indian Contract Act",
                "sectionNumber": "73",
                "content": "When a contract has been broken, the party who suffers by such breach is entitled to receive compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it."
            }
        ],
        "caseHistories": [
            {
                "citation": "AIR 2017 SC 567",
                "parties": "Mehta vs. Patel & Others",
                "holdings": "The Court established that in cases of contractual breach, the aggrieved party must prove actual damages suffered to claim compensation under Section 73 of the Indian Contract Act."
            }
        ],
        "analysis": {
            "summary": "This case involves a breach of contract under Section 73 of the Indian Contract Act.",
            "arguments": ["The defendant's actions constitute a clear breach of contract as they failed to deliver the goods by the agreed date."],
            "challenges": ["The defense may argue force majeure due to supply chain disruptions."],
            "recommendations": ["Gather all communication records to establish the terms of the contract and subsequent breach."]
        }
    }
    
    options = {
        "document_type": "petition",
        "court": "High Court of Delhi",
        "include_arguments": True,
        "include_prayer": True
    }
    
    # Draft case file
    case_file = drafter.draft_case_file(brief, analysis, options)
    
    print(f"Title: {case_file['title']}")
    print(f"Document Type: {case_file['document_type']}")
    print(f"Court: {case_file['court']}")
    print(f"Date: {case_file['date']}")
    print("\nContent:")
    print(case_file['content'])
