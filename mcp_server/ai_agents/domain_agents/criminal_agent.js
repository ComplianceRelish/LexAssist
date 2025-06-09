const { BaseAgent } = require('./base_agent');
const { legalSearchService } = require('../../rag_engine/retrieval/hybrid_retriever');

/**
 * Criminal Law Agent specializing in criminal law and procedure
 */
class CriminalAgent extends BaseAgent {
  constructor() {
    super();
    
    // Define domain-specific system prompt
    this.systemPrompt = `You are a Criminal Law Agent for LexAssist, specializing in criminal law and procedure.
Your expertise includes:
1. Substantive criminal law (offenses and defenses)
2. Criminal procedure (investigation, trial, sentencing)
3. Evidence law in criminal cases
4. Constitutional protections for defendants
5. Sentencing guidelines and principles
6. Appellate criminal procedure
7. Juvenile criminal law

When responding:
- Cite specific penal code sections when applicable
- Reference relevant case precedents that establish legal principles
- Distinguish between elements of crimes and available defenses
- Explain procedural safeguards and their application
- Clarify burden of proof standards for different elements
- Consider jurisdictional differences in criminal statutes
- Note recent developments or amendments in criminal law`;
    
    // Set domain-specific knowledge
    this.domainKnowledge = {
      core_concepts: [
        "mens rea",
        "actus reus",
        "burden of proof",
        "beyond reasonable doubt",
        "criminal procedure",
        "mitigating factors",
        "aggravating factors",
        "defenses",
        "sentencing"
      ],
      specialized_research_areas: [
        "search and seizure",
        "interrogation law",
        "bail provisions",
        "plea bargaining",
        "double jeopardy",
        "right to counsel",
        "self-incrimination"
      ],
      offence_categories: [
        "violent offenses",
        "property crimes",
        "white collar crimes",
        "drug offenses",
        "inchoate crimes",
        "sexual offenses",
        "cyber crimes"
      ]
    };
  }
  
  /**
   * Execute a criminal law task
   * @param {Object} task Task to execute
   * @param {Object} context Context information
   * @returns {Object} Task execution result
   */
  async executeTask(task, context) {
    console.log('Criminal Agent executing task:', task.description);
    
    try {
      switch (task.type) {
        case 'legal_research':
          return await this._handleResearch(task, context);
          
        case 'case_analysis':
          return await this._handleCaseAnalysis(task, context);
          
        case 'statute_interpretation':
          return await this._handleStatuteInterpretation(task, context);
          
        case 'criminal_defense':
          return await this._handleDefenseAnalysis(task, context);
          
        case 'sentencing_analysis':
          return await this._handleSentencingAnalysis(task, context);
        
        default:
          return await this._handleGeneralTask(task, context);
      }
    } catch (error) {
      console.error('Error in Criminal Agent:', error);
      return {
        success: false,
        error: error.message,
        content: "I encountered an issue while analyzing this criminal law question."
      };
    }
  }
  
  /**
   * Handle criminal legal research
   * @private
   * @param {Object} task Research task
   * @param {Object} context Context information
   * @returns {Object} Research results
   */
  async _handleResearch(task, context) {
    const { query } = task.data;
    
    // Enhance query with criminal law context
    const enhancedQuery = `${query} criminal law procedure penal code`;
    
    // Perform search with criminal law focus
    const searchResults = await legalSearchService.search({
      query: enhancedQuery,
      filters: {
        legal_domain: "criminal",
        document_types: ["case_law", "statute", "article"]
      },
      limit: 5
    });
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Research criminal law question: ${query}
Research results: ${JSON.stringify(searchResults)}` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      sources: searchResults.map(r => ({
        title: r.document.title,
        citation: r.document.citation,
        relevance: r.score
      })),
      confidence: 0.85,
      contextUpdates: {
        criminalResearch: {
          query,
          results: searchResults
        }
      }
    };
  }
  
  /**
   * Handle criminal case analysis
   * @private
   * @param {Object} task Case analysis task
   * @param {Object} context Context information
   * @returns {Object} Analysis results
   */
  async _handleCaseAnalysis(task, context) {
    const { caseReference, analysisPoints } = task.data;
    
    // Get case details if available
    let caseDetails;
    if (caseReference) {
      const caseSearchResults = await legalSearchService.search({
        query: caseReference,
        filters: {
          document_types: ["case_law"],
          legal_domain: "criminal"
        },
        limit: 1
      });
      
      if (caseSearchResults.length > 0) {
        caseDetails = caseSearchResults[0];
      }
    }
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze criminal law case: ${caseReference}
${caseDetails ? `Case details: ${JSON.stringify(caseDetails)}` : ''}
Analysis points: ${analysisPoints || 'Provide a comprehensive analysis focusing on the criminal law principles'}` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      sources: caseDetails ? [{ 
        title: caseDetails.document.title,
        citation: caseDetails.document.citation 
      }] : [],
      confidence: caseDetails ? 0.9 : 0.7
    };
  }
  
  /**
   * Handle criminal statute interpretation
   * @private
   * @param {Object} task Statute interpretation task
   * @param {Object} context Context information
   * @returns {Object} Interpretation results
   */
  async _handleStatuteInterpretation(task, context) {
    const { statute, interpretationQuestion } = task.data;
    
    // Search for relevant statute information
    const statuteSearchResults = await legalSearchService.search({
      query: statute,
      filters: {
        document_types: ["statute", "regulation"],
        legal_domain: "criminal"
      },
      limit: 3
    });
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Interpret criminal statute: ${statute}
Interpretation question: ${interpretationQuestion}
${statuteSearchResults.length > 0 ? `Statute information: ${JSON.stringify(statuteSearchResults)}` : ''}` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      sources: statuteSearchResults.map(r => ({
        title: r.document.title,
        citation: r.document.citation,
        relevance: r.score
      })),
      confidence: 0.85
    };
  }
  
  /**
   * Handle criminal defense analysis
   * @private
   * @param {Object} task Defense analysis task
   * @param {Object} context Context information
   * @returns {Object} Defense analysis results
   */
  async _handleDefenseAnalysis(task, context) {
    const { scenario, charges } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze potential criminal defenses for the following scenario:
Scenario: ${scenario}
Charges: ${charges}
Provide analysis of available defenses, their elements, and likelihood of success.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.8
    };
  }
  
  /**
   * Handle sentencing analysis
   * @private
   * @param {Object} task Sentencing analysis task
   * @param {Object} context Context information
   * @returns {Object} Sentencing analysis results
   */
  async _handleSentencingAnalysis(task, context) {
    const { offense, jurisdiction, criminalHistory, factors } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze potential sentencing for the following:
Offense: ${offense}
Jurisdiction: ${jurisdiction || 'Not specified'}
Criminal History: ${criminalHistory || 'Not specified'}
Aggravating/Mitigating Factors: ${factors || 'Not specified'}
Provide an analysis of the sentencing guidelines, ranges, and factors that may influence sentencing.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.85
    };
  }
  
  /**
   * Handle general criminal law task
   * @private
   * @param {Object} task General task
   * @param {Object} context Context information
   * @returns {Object} Task results
   */
  async _handleGeneralTask(task, context) {
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Task: ${task.description}
${task.data ? `Data: ${JSON.stringify(task.data)}` : ''}
Provide a response based on criminal law principles and procedures.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.75
    };
  }
}

module.exports = {
  criminalAgent: new CriminalAgent()
};
