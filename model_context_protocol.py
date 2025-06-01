"""
Model Context Protocol for Lex Assist

This module defines the protocol for AI model interactions, providing a standardized
interface for different models including InLegalBERT. It handles context management,
prompt engineering, and response formatting for legal domain tasks.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union
from pydantic import BaseModel, Field
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data Models
class LegalContext(BaseModel):
    """Context information for legal analysis tasks"""
    jurisdiction: str = "India"
    language: str = "en"
    case_type: Optional[str] = None
    court_level: Optional[str] = None
    legal_domain: Optional[str] = None
    additional_context: Optional[Dict[str, Any]] = None

class ModelRequest(BaseModel):
    """Standardized request format for all models"""
    input_text: str
    task_type: str = Field(..., description="Type of legal task: 'statute_identification', 'case_analysis', 'judgment_prediction', etc.")
    context: LegalContext = Field(default_factory=LegalContext)
    max_length: Optional[int] = None
    temperature: float = 0.1
    model_parameters: Optional[Dict[str, Any]] = None

class LawSection(BaseModel):
    """Representation of a law section extracted from text"""
    section_id: str
    act_name: str
    section_number: str
    section_title: Optional[str] = None
    section_text: str
    relevance_score: float
    citations: Optional[List[str]] = None

class CaseReference(BaseModel):
    """Representation of a case reference extracted from text"""
    case_name: str
    citation: str
    court: str
    year: int
    judgment_summary: Optional[str] = None
    relevance_score: float
    key_points: Optional[List[str]] = None

class LegalAnalysis(BaseModel):
    """Structured legal analysis of a case brief"""
    summary: str
    key_issues: List[str]
    legal_principles: List[str]
    recommendations: Optional[List[str]] = None
    risk_assessment: Optional[Dict[str, Any]] = None

class ModelResponse(BaseModel):
    """Standardized response format for all models"""
    task_type: str
    raw_output: str
    law_sections: Optional[List[LawSection]] = None
    case_references: Optional[List[CaseReference]] = None
    analysis: Optional[LegalAnalysis] = None
    confidence_score: float
    processing_time: float
    model_version: str
    metadata: Optional[Dict[str, Any]] = None

# Abstract Model Interface
class LegalModelInterface(ABC):
    """Abstract interface for all legal AI models"""
    
    @abstractmethod
    def initialize(self, model_path: Optional[str] = None, **kwargs) -> None:
        """Initialize the model with optional custom path"""
        pass
    
    @abstractmethod
    def process(self, request: ModelRequest) -> ModelResponse:
        """Process a request and return standardized response"""
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Return model information and capabilities"""
        pass

# Prompt Engineering
class PromptTemplate:
    """Manages prompt templates for different legal tasks"""
    
    TEMPLATES = {
        "statute_identification": """
        Task: Identify relevant sections of Indian law that apply to the following case brief.
        
        Case Brief:
        {input_text}
        
        For each relevant section, provide:
        1. The Act name
        2. Section number
        3. Section text
        4. Relevance to the case (explain briefly)
        
        Format your response as a structured list of sections.
        """,
        
        "case_analysis": """
        Task: Analyze the following legal brief in the context of Indian law.
        
        Legal Brief:
        {input_text}
        
        Provide:
        1. A concise summary of the case
        2. Key legal issues identified
        3. Applicable legal principles
        4. Recommendations for proceeding with the case
        5. Potential risks and challenges
        
        Format your response in a structured manner addressing each of the above points.
        """,
        
        "judgment_prediction": """
        Task: Predict the likely judgment outcome for the following case brief based on Indian legal precedents.
        
        Case Brief:
        {input_text}
        
        Provide:
        1. Predicted outcome (favorable/unfavorable)
        2. Confidence level (percentage)
        3. Key factors influencing the prediction
        4. Similar precedent cases supporting this prediction
        5. Potential alternative outcomes and their likelihood
        
        Format your response in a structured manner addressing each of the above points.
        """,
        
        "case_history": """
        Task: Identify relevant case histories and precedents related to the following legal brief.
        
        Legal Brief:
        {input_text}
        
        For each relevant case, provide:
        1. Case name and citation
        2. Court that issued the judgment
        3. Year of judgment
        4. Brief summary of the case
        5. Key points relevant to the current brief
        6. How this precedent might influence the current case
        
        Format your response as a structured list of cases.
        """
    }
    
    @staticmethod
    def get_prompt(task_type: str, input_text: str, context: LegalContext) -> str:
        """Generate a prompt based on task type and input"""
        if task_type not in PromptTemplate.TEMPLATES:
            raise ValueError(f"Unknown task type: {task_type}")
        
        template = PromptTemplate.TEMPLATES[task_type]
        
        # Add context information
        context_str = f"\nJurisdiction: {context.jurisdiction}"
        if context.case_type:
            context_str += f"\nCase Type: {context.case_type}"
        if context.court_level:
            context_str += f"\nCourt Level: {context.court_level}"
        if context.legal_domain:
            context_str += f"\nLegal Domain: {context.legal_domain}"
        
        # Insert context before the input text placeholder
        template = template.replace("{input_text}", f"{input_text}\n\nAdditional Context:{context_str}")
        
        return template

# Response Parser
class ResponseParser:
    """Parses and structures raw model outputs"""
    
    @staticmethod
    def parse_statute_identification(raw_output: str) -> List[LawSection]:
        """Parse raw output into structured law sections"""
        try:
            # This is a simplified implementation
            # In a real system, this would use regex or more sophisticated parsing
            sections = []
            current_section = {}
            
            lines = raw_output.strip().split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                if line.startswith("Act:") or line.startswith("Act name:"):
                    # Save previous section if exists
                    if current_section and 'act_name' in current_section:
                        sections.append(LawSection(
                            section_id=f"{current_section.get('act_name', 'Unknown')}-{current_section.get('section_number', 'Unknown')}",
                            act_name=current_section.get('act_name', 'Unknown'),
                            section_number=current_section.get('section_number', 'Unknown'),
                            section_title=current_section.get('section_title'),
                            section_text=current_section.get('section_text', ''),
                            relevance_score=current_section.get('relevance_score', 0.0),
                            citations=current_section.get('citations', [])
                        ))
                    
                    # Start new section
                    current_section = {'act_name': line.split(':', 1)[1].strip()}
                
                elif line.startswith("Section:") or line.startswith("Section number:"):
                    current_section['section_number'] = line.split(':', 1)[1].strip()
                
                elif line.startswith("Title:") or line.startswith("Section title:"):
                    current_section['section_title'] = line.split(':', 1)[1].strip()
                
                elif line.startswith("Text:") or line.startswith("Section text:"):
                    current_section['section_text'] = line.split(':', 1)[1].strip()
                
                elif line.startswith("Relevance:") or line.startswith("Relevance score:"):
                    try:
                        relevance_text = line.split(':', 1)[1].strip()
                        # Try to extract a numeric score if present
                        import re
                        score_match = re.search(r'(\d+(\.\d+)?)', relevance_text)
                        if score_match:
                            current_section['relevance_score'] = float(score_match.group(1)) / 10 if float(score_match.group(1)) > 10 else float(score_match.group(1))
                        else:
                            # Assign a score based on textual description
                            if 'high' in relevance_text.lower():
                                current_section['relevance_score'] = 0.9
                            elif 'medium' in relevance_text.lower():
                                current_section['relevance_score'] = 0.6
                            elif 'low' in relevance_text.lower():
                                current_section['relevance_score'] = 0.3
                            else:
                                current_section['relevance_score'] = 0.5
                    except:
                        current_section['relevance_score'] = 0.5
            
            # Add the last section if exists
            if current_section and 'act_name' in current_section:
                sections.append(LawSection(
                    section_id=f"{current_section.get('act_name', 'Unknown')}-{current_section.get('section_number', 'Unknown')}",
                    act_name=current_section.get('act_name', 'Unknown'),
                    section_number=current_section.get('section_number', 'Unknown'),
                    section_title=current_section.get('section_title'),
                    section_text=current_section.get('section_text', ''),
                    relevance_score=current_section.get('relevance_score', 0.0),
                    citations=current_section.get('citations', [])
                ))
            
            return sections
        
        except Exception as e:
            logger.error(f"Error parsing statute identification output: {e}")
            # Return empty list on parsing error
            return []
    
    @staticmethod
    def parse_case_history(raw_output: str) -> List[CaseReference]:
        """Parse raw output into structured case references"""
        try:
            # This is a simplified implementation
            # In a real system, this would use regex or more sophisticated parsing
            cases = []
            current_case = {}
            
            lines = raw_output.strip().split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                if line.startswith("Case:") or line.startswith("Case name:"):
                    # Save previous case if exists
                    if current_case and 'case_name' in current_case:
                        cases.append(CaseReference(
                            case_name=current_case.get('case_name', 'Unknown'),
                            citation=current_case.get('citation', 'Unknown'),
                            court=current_case.get('court', 'Unknown'),
                            year=current_case.get('year', 0),
                            judgment_summary=current_case.get('judgment_summary'),
                            relevance_score=current_case.get('relevance_score', 0.0),
                            key_points=current_case.get('key_points', [])
                        ))
                    
                    # Start new case
                    current_case = {'case_name': line.split(':', 1)[1].strip()}
                
                elif line.startswith("Citation:"):
                    current_case['citation'] = line.split(':', 1)[1].strip()
                
                elif line.startswith("Court:"):
                    current_case['court'] = line.split(':', 1)[1].strip()
                
                elif line.startswith("Year:"):
                    try:
                        current_case['year'] = int(line.split(':', 1)[1].strip())
                    except:
                        current_case['year'] = 0
                
                elif line.startswith("Summary:") or line.startswith("Judgment summary:"):
                    current_case['judgment_summary'] = line.split(':', 1)[1].strip()
                
                elif line.startswith("Relevance:") or line.startswith("Relevance score:"):
                    try:
                        relevance_text = line.split(':', 1)[1].strip()
                        # Try to extract a numeric score if present
                        import re
                        score_match = re.search(r'(\d+(\.\d+)?)', relevance_text)
                        if score_match:
                            current_case['relevance_score'] = float(score_match.group(1)) / 10 if float(score_match.group(1)) > 10 else float(score_match.group(1))
                        else:
                            # Assign a score based on textual description
                            if 'high' in relevance_text.lower():
                                current_case['relevance_score'] = 0.9
                            elif 'medium' in relevance_text.lower():
                                current_case['relevance_score'] = 0.6
                            elif 'low' in relevance_text.lower():
                                current_case['relevance_score'] = 0.3
                            else:
                                current_case['relevance_score'] = 0.5
                    except:
                        current_case['relevance_score'] = 0.5
                
                elif line.startswith("Key points:") or line.startswith("Key Points:"):
                    current_case['key_points'] = []
                    continue  # Skip this line and collect points in subsequent lines
                
                elif current_case.get('key_points') is not None and line.startswith("-"):
                    # Collect key points
                    point = line.lstrip("- ").strip()
                    if point:
                        current_case['key_points'].append(point)
            
            # Add the last case if exists
            if current_case and 'case_name' in current_case:
                cases.append(CaseReference(
                    case_name=current_case.get('case_name', 'Unknown'),
                    citation=current_case.get('citation', 'Unknown'),
                    court=current_case.get('court', 'Unknown'),
                    year=current_case.get('year', 0),
                    judgment_summary=current_case.get('judgment_summary'),
                    relevance_score=current_case.get('relevance_score', 0.0),
                    key_points=current_case.get('key_points', [])
                ))
            
            return cases
        
        except Exception as e:
            logger.error(f"Error parsing case history output: {e}")
            # Return empty list on parsing error
            return []
    
    @staticmethod
    def parse_legal_analysis(raw_output: str) -> LegalAnalysis:
(Content truncated due to size limit. Use line ranges to read in chunks)