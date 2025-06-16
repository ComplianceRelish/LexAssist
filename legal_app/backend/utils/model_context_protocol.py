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
import re

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
            sections = []
            current_section = {}
            
            lines = raw_output.strip().split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                if line.startswith("Act:") or line.startswith("Act name:"):
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
                        score_match = re.search(r'(\d+(\.\d+)?)', relevance_text)
                        if score_match:
                            current_section['relevance_score'] = float(score_match.group(1)) / 10 if float(score_match.group(1)) > 10 else float(score_match.group(1))
                        else:
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
            return []
    
    @staticmethod
    def parse_case_history(raw_output: str) -> List[CaseReference]:
        """Parse raw output into structured case references"""
        try:
            cases = []
            current_case = {}
            
            lines = raw_output.strip().split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                if line.startswith("Case:") or line.startswith("Case name:"):
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
                        score_match = re.search(r'(\d+(\.\d+)?)', relevance_text)
                        if score_match:
                            current_case['relevance_score'] = float(score_match.group(1)) / 10 if float(score_match.group(1)) > 10 else float(score_match.group(1))
                        else:
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
                    continue
                
                elif current_case.get('key_points') is not None and line.startswith("-"):
                    point = line.lstrip("- ").strip()
                    if point:
                        current_case['key_points'].append(point)
            
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
            return []
    
    @staticmethod
    def parse_legal_analysis(raw_output: str) -> LegalAnalysis:
        """Parse raw output into structured legal analysis"""
        try:
            analysis_data = {
                'summary': '',
                'key_issues': [],
                'legal_principles': [],
                'recommendations': [],
                'risk_assessment': {}
            }
            
            current_section = None
            lines = raw_output.strip().split('\n')
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                if line.lower().startswith("summary:"):
                    current_section = 'summary'
                    analysis_data['summary'] = line.split(':', 1)[1].strip()
                
                elif line.lower().startswith("key issues:") or line.lower().startswith("key legal issues:"):
                    current_section = 'key_issues'
                    continue
                
                elif line.lower().startswith("legal principles:") or line.lower().startswith("applicable legal principles:"):
                    current_section = 'legal_principles'
                    continue
                
                elif line.lower().startswith("recommendations:"):
                    current_section = 'recommendations'
                    continue
                
                elif line.lower().startswith("risks:") or line.lower().startswith("risk assessment:"):
                    current_section = 'risk_assessment'
                    continue
                
                elif line.startswith("-") or line.startswith("•") or line.startswith("*"):
                    item = line.lstrip("-•* ").strip()
                    if item and current_section in ['key_issues', 'legal_principles', 'recommendations']:
                        analysis_data[current_section].append(item)
                
                elif current_section == 'summary' and not analysis_data['summary']:
                    analysis_data['summary'] = line
                
                elif current_section == 'risk_assessment':
                    if ':' in line:
                        key, value = line.split(':', 1)
                        analysis_data['risk_assessment'][key.strip()] = value.strip()
            
            if not analysis_data['summary']:
                analysis_data['summary'] = "No summary available"
            
            return LegalAnalysis(
                summary=analysis_data['summary'],
                key_issues=analysis_data['key_issues'],
                legal_principles=analysis_data['legal_principles'],
                recommendations=analysis_data['recommendations'] if analysis_data['recommendations'] else None,
                risk_assessment=analysis_data['risk_assessment'] if analysis_data['risk_assessment'] else None
            )
        
        except Exception as e:
            logger.error(f"Error parsing legal analysis output: {e}")
            return LegalAnalysis(
                summary="Error parsing analysis",
                key_issues=[],
                legal_principles=[]
            )

# Context Manager
class LegalContextManager:
    """Manages legal context for model interactions"""
    
    def __init__(self):
        self.context_stack = []
    
    def push_context(self, context: LegalContext):
        """Push a new context onto the stack"""
        self.context_stack.append(context)
    
    def pop_context(self) -> Optional[LegalContext]:
        """Pop the most recent context from the stack"""
        if self.context_stack:
            return self.context_stack.pop()
        return None
    
    def get_current_context(self) -> Optional[LegalContext]:
        """Get the current context without removing it"""
        if self.context_stack:
            return self.context_stack[-1]
        return None
    
    def merge_contexts(self, base_context: LegalContext, override_context: LegalContext) -> LegalContext:
        """Merge two contexts, with override taking precedence"""
        merged_data = base_context.dict()
        
        for key, value in override_context.dict().items():
            if value is not None:
                merged_data[key] = value
        
        return LegalContext(**merged_data)

# Model Registry
class ModelRegistry:
    """Registry for managing multiple legal models"""
    
    def __init__(self):
        self.models: Dict[str, LegalModelInterface] = {}
    
    def register_model(self, name: str, model: LegalModelInterface):
        """Register a model with the registry"""
        self.models[name] = model
        logger.info(f"Registered model: {name}")
    
    def get_model(self, name: str) -> Optional[LegalModelInterface]:
        """Get a model by name"""
        return self.models.get(name)
    
    def list_models(self) -> List[str]:
        """List all registered model names"""
        return list(self.models.keys())
    
    def get_model_info(self, name: str) -> Optional[Dict[str, Any]]:
        """Get information about a model"""
        model = self.get_model(name)
        if model:
            return model.get_model_info()
        return None

# Singleton instances for global use
context_manager = LegalContextManager()
model_registry = ModelRegistry()