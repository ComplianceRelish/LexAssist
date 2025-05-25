import os
import json
import re
from typing import Dict, List, Any, Optional, Tuple
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
import spacy
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize NLP libraries
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

class LegalBriefAnalyzer:
    """
    Analyzes legal briefs to extract key information and prepare for database queries.
    """
    
    def __init__(self):
        self.stop_words = set(stopwords.words('english'))
        # Add legal stopwords
        self.legal_stop_words = {
            'plaintiff', 'defendant', 'petitioner', 'respondent', 'appellant', 'versus', 'vs',
            'court', 'judge', 'justice', 'honorable', 'case', 'matter', 'petition', 'appeal'
        }
        self.stop_words.update(self.legal_stop_words)
        
        # Legal entity patterns
        self.legal_act_pattern = re.compile(r'([A-Z][a-z]+(?: [A-Z][a-z]+)* Act,? (?:of )?\d{4})')
        self.section_pattern = re.compile(r'[Ss]ection (\d+[A-Za-z]*)(?:\([a-z0-9]+\))?')
        self.case_citation_pattern = re.compile(r'(\(\d{4}\) \d+ SCC \d+|AIR \d{4} SC \d+)')
    
    def analyze_brief(self, brief_text: str) -> Dict[str, Any]:
        """
        Analyze the legal brief and extract key information.
        
        Args:
            brief_text: The text of the legal brief
            
        Returns:
            Dictionary containing extracted information
        """
        # Preprocess text
        clean_text = self._preprocess_text(brief_text)
        
        # Extract key information
        acts = self._extract_acts(clean_text)
        sections = self._extract_sections(clean_text)
        citations = self._extract_citations(clean_text)
        legal_entities = self._extract_legal_entities(clean_text)
        keywords = self._extract_keywords(clean_text)
        
        # Identify legal domains
        domains = self._identify_legal_domains(clean_text, acts, keywords)
        
        return {
            "acts": acts,
            "sections": sections,
            "citations": citations,
            "legal_entities": legal_entities,
            "keywords": keywords,
            "domains": domains,
            "summary": self._generate_summary(clean_text)
        }
    
    def _preprocess_text(self, text: str) -> str:
        """Clean and normalize the text."""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        # Normalize quotes
        text = re.sub(r'["""]', '"', text)
        # Normalize apostrophes
        text = re.sub(r'[''']', "'", text)
        return text
    
    def _extract_acts(self, text: str) -> List[str]:
        """Extract mentions of legal acts."""
        acts = self.legal_act_pattern.findall(text)
        # Remove duplicates while preserving order
        return list(dict.fromkeys(acts))
    
    def _extract_sections(self, text: str) -> List[str]:
        """Extract section numbers mentioned in the text."""
        sections = self.section_pattern.findall(text)
        return list(dict.fromkeys(sections))
    
    def _extract_citations(self, text: str) -> List[str]:
        """Extract case citations from the text."""
        citations = self.case_citation_pattern.findall(text)
        return list(dict.fromkeys(citations))
    
    def _extract_legal_entities(self, text: str) -> List[Dict[str, str]]:
        """Extract named entities related to legal cases."""
        doc = nlp(text)
        entities = []
        
        for ent in doc.ents:
            if ent.label_ in ['PERSON', 'ORG', 'GPE', 'DATE']:
                entities.append({
                    "text": ent.text,
                    "type": ent.label_
                })
        
        # Remove duplicates while preserving order
        unique_entities = []
        seen = set()
        for entity in entities:
            entity_tuple = (entity['text'], entity['type'])
            if entity_tuple not in seen:
                seen.add(entity_tuple)
                unique_entities.append(entity)
        
        return unique_entities
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract important keywords from the text."""
        # Tokenize and remove stopwords
        words = word_tokenize(text.lower())
        filtered_words = [word for word in words if word.isalpha() and word not in self.stop_words]
        
        # Get frequency distribution
        freq_dist = nltk.FreqDist(filtered_words)
        
        # Get top keywords
        keywords = [word for word, _ in freq_dist.most_common(20)]
        return keywords
    
    def _identify_legal_domains(self, text: str, acts: List[str], keywords: List[str]) -> List[str]:
        """Identify the legal domains relevant to the brief."""
        # Map of keywords to domains
        domain_keywords = {
            "criminal": ["murder", "theft", "robbery", "assault", "criminal", "ipc", "bail", "arrest"],
            "civil": ["contract", "property", "damages", "breach", "agreement", "specific", "performance"],
            "constitutional": ["fundamental", "rights", "constitution", "article", "writ", "petition"],
            "corporate": ["company", "director", "shareholder", "board", "corporate", "sebi"],
            "tax": ["income", "tax", "gst", "evasion", "assessment", "return"],
            "family": ["divorce", "custody", "maintenance", "marriage", "adoption"],
            "intellectual_property": ["patent", "copyright", "trademark", "infringement", "design"],
            "labor": ["employee", "employer", "dismissal", "compensation", "industrial", "dispute"]
        }
        
        # Count domain keyword occurrences
        domain_scores = {domain: 0 for domain in domain_keywords}
        
        # Check text for domain keywords
        text_lower = text.lower()
        for domain, kw_list in domain_keywords.items():
            for kw in kw_list:
                if kw in text_lower:
                    domain_scores[domain] += text_lower.count(kw)
        
        # Check acts for domain hints
        for act in acts:
            act_lower = act.lower()
            if "penal" in act_lower or "criminal" in act_lower:
                domain_scores["criminal"] += 3
            elif "contract" in act_lower or "civil" in act_lower:
                domain_scores["civil"] += 3
            elif "constitution" in act_lower:
                domain_scores["constitutional"] += 3
            elif "companies" in act_lower:
                domain_scores["corporate"] += 3
            elif "income tax" in act_lower or "goods and services" in act_lower:
                domain_scores["tax"] += 3
            elif "marriage" in act_lower or "family" in act_lower:
                domain_scores["family"] += 3
            elif "patent" in act_lower or "copyright" in act_lower or "trademark" in act_lower:
                domain_scores["intellectual_property"] += 3
            elif "industrial" in act_lower or "labor" in act_lower or "factory" in act_lower:
                domain_scores["labor"] += 3
        
        # Get domains with non-zero scores, sorted by score
        relevant_domains = [domain for domain, score in sorted(
            domain_scores.items(), key=lambda x: x[1], reverse=True) if score > 0]
        
        # If no domains identified, return "general"
        if not relevant_domains:
            return ["general"]
        
        return relevant_domains[:3]  # Return top 3 domains
    
    def _generate_summary(self, text: str) -> str:
        """Generate a brief summary of the legal brief."""
        # Simple extractive summarization
        sentences = sent_tokenize(text)
        
        if len(sentences) <= 3:
            return text
        
        # Use first 2 sentences and last sentence as summary
        summary = ' '.join(sentences[:2] + [sentences[-1]])
        return summary


class LegalDatabaseConnector:
    """
    Base class for connecting to legal databases and retrieving information.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
    
    def search_law_sections(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Search for relevant law sections based on query parameters.
        
        Args:
            query_params: Parameters for the search
            
        Returns:
            List of law sections
        """
        raise NotImplementedError("Subclasses must implement this method")
    
    def search_case_history(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Search for relevant case histories based on query parameters.
        
        Args:
            query_params: Parameters for the search
            
        Returns:
            List of case histories
        """
        raise NotImplementedError("Subclasses must implement this method")


class ManupatraConnector(LegalDatabaseConnector):
    """
    Connector for Manupatra legal database.
    """
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.base_url = "https://api.manupatrafast.com/v1"  # Example URL, would need to be updated
    
    def search_law_sections(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Search for relevant law sections in Manupatra.
        
        Args:
            query_params: Parameters for the search
            
        Returns:
            List of law sections
        """
        # In a real implementation, this would make API calls to Manupatra
        # For now, we'll simulate the response
        
        # Example implementation with actual API:
        # endpoint = f"{self.base_url}/laws/search"
        # headers = {"Authorization": f"Bearer {self.api_key}"}
        # response = requests.get(endpoint, headers=headers, params=query_params)
        # if response.status_code == 200:
        #     return response.json()["results"]
        # else:
        #     raise Exception(f"API request failed: {response.status_code}")
        
        # Simulated response
        return self._simulate_law_section_results(query_params)
    
    def search_case_history(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Search for relevant case histories in Manupatra.
        
        Args:
            query_params: Parameters for the search
            
        Returns:
            List of case histories
        """
        # In a real implementation, this would make API calls to Manupatra
        # For now, we'll simulate the response
        
        # Example implementation with actual API:
        # endpoint = f"{self.base_url}/cases/search"
        # headers = {"Authorization": f"Bearer {self.api_key}"}
        # response = requests.get(endpoint, headers=headers, params=query_params)
        # if response.status_code == 200:
        #     return response.json()["results"]
        # else:
        #     raise Exception(f"API request failed: {response.status_code}")
        
        # Simulated response
        return self._simulate_case_history_results(query_params)
    
    def _simulate_law_section_results(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Simulate law section search results for development purposes."""
        # Load mock data from file
        try:
            with open("mock_law_sections.json", "r") as f:
                all_sections = json.load(f)
        except FileNotFoundError:
            # Create some basic mock data if file doesn't exist
            all_sections = [
                {
                    "title": "Indian Penal Code",
                    "sectionNumber": "420",
                    "content": "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.",
                    "relevance": 9
                },
                {
                    "title": "Indian Contract Act",
                    "sectionNumber": "73",
                    "content": "When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it.",
                    "relevance": 7
                }
            ]
        
        # Filter based on query parameters
        results = []
        keywords = query_params.get("keywords", [])
        acts = query_params.get("acts", [])
        
        for section in all_sections:
            # Simple relevance scoring
            relevance = 0
            
            # Check if section matches any specified acts
            if acts and any(act.lower() in section["title"].lower() for act in acts):
                relevance += 5
            
            # Check for keyword matches in content
            for keyword in keywords:
                if keyword.lower() in section["content"].lower():
                    relevance += 1
            
            # Include if relevant
            if relevance > 0:
                section_copy = section.copy()
                section_copy["relevance"] = min(10, relevance)
                results.append(section_copy)
        
        # Sort by relevance
        results.sort(key=lambda x: x["relevance"], reverse=True)
        
        return results[:5]  # Return top 5 results
    
    def _simulate_case_history_results(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Simulate case history search results for development purposes."""
        # Load mock data from file
        try:
            with open("mock_case_histories.json", "r") as f:
                all_cases = json.load(f)
        except FileNotFoundError:
            # Create some basic mock data if file doesn't exist
            all_cases = [
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
                    "relevance": 6,
                    "date": "05 Aug 2017"
                }
            ]
        
        # Filter based on query parameters
        results = []
        keywords = query_params.get("keywords", [])
        sections = query_params.get("sections", [])
        
        for case in all_cases:
            # Simple relevance scoring
            relevance = 0
            
            # Check if case mentions any specified sections
            for section in sections:
                if f"Section {section}" in case["holdings"]:
                    relevance += 5
            
            # Check for keyword matches in holdings
            for keyword in keywords:
                if keyword.lower() in case["holdings"].lower():
                    relevance += 1
            
            # Include if relevant
            if relevance > 0:
                case_copy = case.copy()
                case_copy["relevance"] = min(10, relevance)
                results.append(case_copy)
        
        # Sort by relevance
        results.sort(key=lambda x: x["relevance"], reverse=True)
        
        return results[:5]  # Return top 5 results


class IndianKanoonConnector(LegalDatabaseConnector):
    """
    Connector for Indian Kanoon legal database.
    """
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.base_url = "https://api.indiankanoon.org/v1"  # Example URL, would need to be updated
    
    def search_law_sections(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Search for relevant law sections in Indian Kanoon.
        
        Args:
            query_params: Parameters for the search
            
        Returns:
            List of law sections
        """
        # Implementation would be similar to ManupatraConnector
        # For now, we'll use the same simulation
        return self._simulate_law_section_results(query_params)
    
    def search_case_history(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Search for relevant case histories in Indian Kanoon.
        
        Args:
            query_params: Parameters for the search
            
        Returns:
            List of case histories
        """
        # Implementation would be similar to ManupatraConnector
        # For now, we'll use the same simulation
        return self._simulate_case_history_results(query_params)
    
    def _simulate_law_section_results(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Simulate law section search results for development purposes."""
        # Similar implementation as in ManupatraConnector
        # In a real implementation, this would be tailored to Indian Kanoon's response format
        connector = ManupatraConnector("")
        return connector._simulate_law_section_results(query_params)
    
    def _simulate_case_history_results(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Simulate case history search results for development purposes."""
        # Similar implementation as in ManupatraConnector
        # In a real implementation, this would be tailored to Indian Kanoon's response format
        connector = ManupatraConnector("")
        return connector._simulate_case_history_results(query_params)


class LegalDataAggregator:
    """
    Aggregates results from multiple legal database connectors.
    """
    
    def __init__(self, connectors: List[LegalDatabaseConnector]):
        self.connectors = connectors
    
    def search_law_sections(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Search for relevant law sections across all connected databases.
        
        Args:
            query_params: Parameters for the search
            
        Returns:
            Aggregated and deduplicated list of law sections
        """
        all_results = []
        
        # Query each connector
        for connector in self.connectors:
            try:
                results = connector.search_law_sections(query_params)
                all_results.extend(results)
            except Exception as e:
                print(f"Error querying connector {connector.__class__.__name__}: {e}")
        
        # Deduplicate results based on title and section number
        deduplicated = {}
        for result in all_results:
            key = (result["title"], result["sectionNumber"])
            if key not in deduplicated or result["relevance"] > deduplicated[key]["relevance"]:
                deduplicated[key] = result
        
        # Sort by relevance
        sorted_results = sorted(deduplicated.values(), key=lambda x: x["relevance"], reverse=True)
        
        return sorted_results
    
    def search_case_history(self, query_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Search for relevant case histories across all connected databases.
        
        Args:
            query_params: Parameters for the search
            
        Returns:
            Aggregated and deduplicated list of case histories
        """
        all_results = []
        
        # Query each connector
        for connector in self.connectors:
            try:
                results = connector.search_case_history(query_params)
                all_results.extend(results)
            except Exception as e:
                print(f"Error querying connector {connector.__class__.__name__}: {e}")
        
        # Deduplicate results based on citation
        deduplicated = {}
        for result in all_results:
            key = result["citation"]
            if key not in deduplicated or result["relevance"] > deduplicated[key]["relevance"]:
                deduplicated[key] = result
        
        # Sort by relevance
        sorted_results = sorted(deduplicated.values(), key=lambda x: x["relevance"], reverse=True)
        
        return sorted_results


class LegalAnalysisGenerator:
    """
    Generates legal analysis based on brief and search results.
    """
    
    def generate_analysis(self, brief_analysis: Dict[str, Any], 
                         law_sections: List[Dict[str, Any]], 
                         case_histories: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate legal analysis based on the brief and search results.
        
        Args:
            brief_analysis: Analysis of the legal brief
            law_sections: Relevant law sections
            case_histories: Relevant case histories
            
        Returns:
            Dictionary containing the analysis
        """
        # In a real implementation, this would use more sophisticated NLP or LLM techniques
        # For now, we'll create a template-based analysis
        
        # Generate summary
        summary = self._generate_summary(brief_analysis, law_sections, case_histories)
        
        # Generate arguments
        arguments = self._generate_arguments(brief_analysis, law_sections, case_histories)
        
        # Generate challenges
        challenges = self._generate_challenges(brief_analysis, law_sections, case_histories)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(brief_analysis, law_sections, case_histories)
        
        return {
            "summary": summary,
            "arguments": arguments,
            "challenges": challenges,
            "recommendations": recommendations
        }
    
    def _generate_summary(self, brief_analysis: Dict[str, Any], 
                         law_sections: List[Dict[str, Any]], 
                         case_histories: List[Dict[str, Any]]) -> str:
        """Generate a summary of the legal analysis."""
        domains = brief_analysis.get("domains", ["general"])
        acts = brief_analysis.get("acts", [])
        
        summary_parts = []
        
        # Add domain information
        if domains and domains[0] != "general":
            domain_str = ", ".join(domains)
            summary_parts.append(f"This case involves {domain_str} law issues.")
        
        # Add act information
        if acts:
            acts_str = ", ".join(acts[:2])
            if len(acts) > 2:
                acts_str += f", and {len(acts) - 2} other acts"
            summary_parts.append(f"The relevant legislation includes {acts_str}.")
        
        # Add law section information
        if law_sections:
            top_sections = [f"{section['title']} Section {section['sectionNumber']}" 
                           for section in law_sections[:2]]
            sections_str = ", ".join(top_sections)
            if len(law_sections) > 2:
                sections_str += f", and {len(law_sections) - 2} other sections"
            summary_parts.append(f"Key applicable provisions include {sections_str}.")
        
        # Add case history information
        if case_histories:
            top_cases = [f"{case['parties']} ({case['citation']})" 
                        for case in case_histories[:1]]
            cases_str = ", ".join(top_cases)
            if len(case_histories) > 1:
                cases_str += f", and {len(case_histories) - 1} other relevant precedents"
            summary_parts.append(f"Relevant case law includes {cases_str}.")
        
        # Combine parts
        summary = " ".join(summary_parts)
        
        # Add a generic conclusion if summary is too short
        if len(summary) < 100:
            summary += " Based on the analysis of applicable laws and precedents, there are several legal strategies that could be pursued in this matter."
        
        return summary
    
    def _generate_arguments(self, brief_analysis: Dict[str, Any], 
                           law_sections: List[Dict[str, Any]], 
                           case_histories: List[Dict[str, Any]]) -> List[str]:
        """Generate potential legal arguments."""
        arguments = []
        
        # Arguments based on law sections
        for section in law_sections[:3]:
            # Extract key phrases from section content
            content = section["content"]
            if len(content) > 100:
                content = content[:100] + "..."
            
            argument = f"Under {section['title']} Section {section['sectionNumber']}, you can argue that {content}"
            arguments.append(argument)
        
        # Arguments based on case histories
        for case in case_histories[:2]:
            argument = f"The precedent established in {case['parties']} ({case['citation']}) supports the position that {case['holdings']}"
            arguments.append(argument)
        
        # Add generic arguments if needed
        if len(arguments) < 3:
            generic_arguments = [
                "The facts presented establish a prima facie case that meets all statutory requirements.",
                "The opposing party's actions constitute a clear violation of established legal principles.",
                "Procedural irregularities in the opposing party's approach undermine their position."
            ]
            arguments.extend(generic_arguments[:3 - len(arguments)])
        
        return arguments[:5]  # Return up to 5 arguments
    
    def _generate_challenges(self, brief_analysis: Dict[str, Any], 
                            law_sections: List[Dict[str, Any]], 
                            case_histories: List[Dict[str, Any]]) -> List[str]:
        """Generate potential legal challenges."""
        challenges = []
        
        # Add generic challenges
        generic_challenges = [
            "Establishing sufficient evidence to meet the burden of proof may be challenging.",
            "The opposing party may argue that the statute of limitations has expired.",
            "Jurisdictional issues could arise if the matter crosses state boundaries.",
            "Proving the requisite intent element may be difficult without direct evidence.",
            "Quantifying damages precisely could be challenging without expert testimony."
        ]
        
        # Add specific challenges based on domains
        domains = brief_analysis.get("domains", ["general"])
        
        if "criminal" in domains:
            challenges.append("Proving criminal intent beyond reasonable doubt will require substantial evidence.")
        
        if "civil" in domains:
            challenges.append("Establishing causation between the breach and claimed damages may be difficult.")
        
        if "constitutional" in domains:
            challenges.append("Constitutional challenges face a high standard of review from the courts.")
        
        # Ensure we have enough challenges
        if len(challenges) < 3:
            challenges.extend(generic_challenges[:3 - len(challenges)])
        
        return challenges[:4]  # Return up to 4 challenges
    
    def _generate_recommendations(self, brief_analysis: Dict[str, Any], 
                                 law_sections: List[Dict[str, Any]], 
                                 case_histories: List[Dict[str, Any]]) -> List[str]:
        """Generate strategic recommendations."""
        recommendations = []
        
        # Add generic recommendations
        generic_recommendations = [
            "Gather all documentary evidence to support factual assertions in the case.",
            "Consider engaging expert witnesses to strengthen technical aspects of the case.",
            "Prepare detailed affidavits from all relevant witnesses.",
            "Explore alternative dispute resolution options before proceeding to trial.",
            "Conduct thorough research on the presiding judge's previous rulings in similar cases."
        ]
        
        # Add specific recommendations based on domains
        domains = brief_analysis.get("domains", ["general"])
        
        if "criminal" in domains:
            recommendations.append("Scrutinize the investigation procedure for any procedural lapses that could be challenged.")
        
        if "civil" in domains:
            recommendations.append("Quantify damages precisely with supporting documentation and expert opinions.")
        
        if "corporate" in domains:
            recommendations.append("Review all corporate governance documents and board resolutions relevant to the matter.")
        
        # Add recommendations based on case histories
        if case_histories:
            top_case = case_histories[0]
            recommendations.append(f"Cite {top_case['parties']} prominently in submissions as it establishes favorable precedent.")
        
        # Ensure we have enough recommendations
        if len(recommendations) < 4:
            recommendations.extend(generic_recommendations[:4 - len(recommendations)])
        
        return recommendations[:5]  # Return up to 5 recommendations


class LegalBackendService:
    """
    Main service class that coordinates the legal backend operations.
    """
    
    def __init__(self):
        # Initialize components
        self.brief_analyzer = LegalBriefAnalyzer()
        
        # Initialize database connectors
        # In a real implementation, API keys would be loaded from environment variables
        manupatra_api_key = os.getenv("MANUPATRA_API_KEY", "")
        indiankanoon_api_key = os.getenv("INDIANKANOON_API_KEY", "")
        
        connectors = []
        if manupatra_api_key:
            connectors.append(ManupatraConnector(manupatra_api_key))
        if indiankanoon_api_key:
            connectors.append(IndianKanoonConnector(indiankanoon_api_key))
        
        # If no API keys are available, use mock connectors
        if not connectors:
            connectors = [ManupatraConnector(""), IndianKanoonConnector("")]
        
        self.data_aggregator = LegalDataAggregator(connectors)
        self.analysis_generator = LegalAnalysisGenerator()
    
    def process_brief(self, brief_text: str) -> Dict[str, Any]:
        """
        Process a legal brief and return relevant information.
        
        Args:
            brief_text: The text of the legal brief
            
        Returns:
            Dictionary containing law sections, case histories, and analysis
        """
        # Analyze the brief
        brief_analysis = self.brief_analyzer.analyze_brief(brief_text)
        
        # Prepare search parameters
        search_params = {
            "keywords": brief_analysis["keywords"],
            "acts": brief_analysis["acts"],
            "sections": brief_analysis["sections"],
            "domains": brief_analysis["domains"]
        }
        
        # Search for relevant law sections
        law_sections = self.data_aggregator.search_law_sections(search_params)
        
        # Search for relevant case histories
        case_histories = self.data_aggregator.search_case_history(search_params)
        
        # Generate analysis
        analysis = self.analysis_generator.generate_analysis(
            brief_analysis, law_sections, case_histories)
        
        return {
            "brief_analysis": brief_analysis,
            "law_sections": law_sections,
            "case_histories": case_histories,
            "analysis": analysis
        }


# Example usage
if __name__ == "__main__":
    # Create the service
    legal_service = LegalBackendService()
    
    # Example brief
    example_brief = """
    This case involves a dispute between ABC Corporation and XYZ Ltd regarding a breach of contract. 
    On January 15, 2024, ABC Corporation entered into an agreement with XYZ Ltd for the supply of 
    manufacturing equipment worth Rs. 50 lakhs. According to the terms, delivery was to be completed 
    by March 30, 2024, with a penalty clause for late delivery.
    
    XYZ Ltd failed to deliver the equipment by the agreed date and has now refused to honor the penalty 
    clause, citing force majeure due to supply chain disruptions. However, our investigation reveals that 
    XYZ Ltd had actually diverted the equipment to another buyer who offered a higher price.
    
    We are seeking remedies under Section 73 of the Indian Contract Act, 1872 for breach of contract and 
    also considering action under Section 420 of the Indian Penal Code for cheating.
    
    Previous similar cases include Sharma vs. State of Maharashtra (AIR 2019 SC 1234) where the court 
    held that diversion of goods to another buyer constitutes cheating.
    """
    
    # Process the brief
    results = legal_service.process_brief(example_brief)
    
    # Print results (in a real application, this would be returned as an API response)
    print("Brief Analysis:")
    print(f"Acts: {results['brief_analysis']['acts']}")
    print(f"Sections: {results['brief_analysis']['sections']}")
    print(f"Citations: {results['brief_analysis']['citations']}")
    print(f"Keywords: {results['brief_analysis']['keywords'][:10]}")
    print(f"Domains: {results['brief_analysis']['domains']}")
    print("\nLaw Sections:")
    for section in results['law_sections']:
        print(f"- {section['title']} Section {section['sectionNumber']} (Relevance: {section['relevance']})")
    print("\nCase Histories:")
    for case in results['case_histories']:
        print(f"- {case['parties']} ({case['citation']}) - Relevance: {case['relevance']}")
    print("\nAnalysis:")
    print(f"Summary: {results['analysis']['summary']}")
    print("Arguments:")
    for arg in results['analysis']['arguments']:
        print(f"- {arg}")
    print("Challenges:")
    for challenge in results['analysis']['challenges']:
        print(f"- {challenge}")
    print("Recommendations:")
    for rec in results['analysis']['recommendations']:
        print(f"- {rec}")
