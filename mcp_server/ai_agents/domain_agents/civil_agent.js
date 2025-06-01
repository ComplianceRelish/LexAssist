const { BaseAgent } = require('./base_agent');
const { legalSearchService } = require('../../rag_engine/retrieval/hybrid_retriever');

/**
 * Civil Law Agent specializing in civil law matters
 */
class CivilAgent extends BaseAgent {
  constructor() {
    super();
    
    // Define domain-specific system prompt
    this.systemPrompt = `You are a Civil Law Agent for LexAssist, specializing in civil law matters.
Your expertise includes:
1. Contract law (formation, performance, breach, remedies)
2. Tort law (negligence, intentional torts, strict liability)
3. Property law (real and personal property)
4. Family law (marriage, divorce, child custody)
5. Civil procedure (litigation process, discovery, motions)
6. Remedies (damages, specific performance, injunctions)
7. Alternative dispute resolution (mediation, arbitration)

When responding:
- Identify the elements of civil causes of action
- Explain standards of proof in civil litigation
- Clarify legal duties and obligations between parties
- Distinguish between different types of damages
- Reference relevant precedents and their application
- Note jurisdictional differences in civil law principles
- Explain procedural requirements for civil actions`;
    
    // Set domain-specific knowledge
    this.domainKnowledge = {
      core_concepts: [
        "breach of contract",
        "duty of care",
        "negligence",
        "damages",
        "causation",
        "property rights",
        "civil procedure",
        "standard of proof"
      ],
      specialized_research_areas: [
        "contract formation",
        "promissory estoppel",
        "fiduciary duties",
        "product liability",
        "medical malpractice",
        "defamation",
        "adverse possession"
      ],
      civil_procedure_aspects: [
        "jurisdiction",
        "standing",
        "pleadings",
        "discovery",
        "summary judgment",
        "trial procedure",
        "appeals"
      ]
    };
  }
  
  /**
   * Execute a civil law task
   * @param {Object} task Task to execute
   * @param {Object} context Context information
   * @returns {Object} Task execution result
   */
  async executeTask(task, context) {
    console.log('Civil Agent executing task:', task.description);
    
    try {
      switch (task.type) {
        case 'legal_research':
          return await this._handleResearch(task, context);
          
        case 'case_analysis':
          return await this._handleCaseAnalysis(task, context);
          
        case 'statute_interpretation':
          return await this._handleStatuteInterpretation(task, context);
          
        case 'contract_analysis':
          return await this._handleContractAnalysis(task, context);
          
        case 'tort_analysis':
          return await this._handleTortAnalysis(task, context);
          
        case 'property_law_analysis':
          return await this._handlePropertyLawAnalysis(task, context);
          
        default:
          return await this._handleGeneralTask(task, context);
      }
    } catch (error) {
      console.error('Error in Civil Agent:', error);
      return {
        success: false,
        error: error.message,
        content: "I encountered an issue while analyzing this civil law question."
      };
    }
  }
  
  /**
   * Handle civil legal research
   * @private
   * @param {Object} task Research task
   * @param {Object} context Context information
   * @returns {Object} Research results
   */
  async _handleResearch(task, context) {
    const { query } = task.data;
    
    // Enhance query with civil law context
    const enhancedQuery = `${query} civil law contract tort property`;
    
    // Perform search with civil law focus
    const searchResults = await legalSearchService.search({
      query: enhancedQuery,
      filters: {
        legal_domain: "civil",
        document_types: ["case_law", "statute", "article"]
      },
      limit: 5
    });
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Research civil law question: ${query}
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
        civilResearch: {
          query,
          results: searchResults
        }
      }
    };
  }
  
  /**
   * Handle civil case analysis
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
          legal_domain: "civil"
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
        content: `Analyze civil law case: ${caseReference}
${caseDetails ? `Case details: ${JSON.stringify(caseDetails)}` : ''}
Analysis points: ${analysisPoints || 'Provide a comprehensive analysis focusing on civil law principles'}` 
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
   * Handle civil statute interpretation
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
        legal_domain: "civil"
      },
      limit: 3
    });
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Interpret civil statute: ${statute}
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
   * Handle contract analysis
   * @private
   * @param {Object} task Contract analysis task
   * @param {Object} context Context information
   * @returns {Object} Contract analysis results
   */
  async _handleContractAnalysis(task, context) {
    const { contractText, analysisPoints } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze the following contract from a legal perspective:
${contractText ? `Contract text: ${contractText}` : 'Contract text not provided'}
Analysis points: ${analysisPoints || 'Provide a comprehensive analysis of the contract provisions, enforceability, and potential issues'}` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: contractText ? 0.85 : 0.6
    };
  }
  
  /**
   * Handle tort analysis
   * @private
   * @param {Object} task Tort analysis task
   * @param {Object} context Context information
   * @returns {Object} Tort analysis results
   */
  async _handleTortAnalysis(task, context) {
    const { scenario, tortType } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze the following scenario from a tort law perspective:
Scenario: ${scenario}
Tort type (if specified): ${tortType || 'Not specified'}
Provide a comprehensive analysis of potential tort claims, elements, defenses, and likely outcomes.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.8
    };
  }
  
  /**
   * Handle property law analysis
   * @private
   * @param {Object} task Property law analysis task
   * @param {Object} context Context information
   * @returns {Object} Property law analysis results
   */
  async _handlePropertyLawAnalysis(task, context) {
    const { scenario, propertyType } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze the following property law scenario:
Scenario: ${scenario}
Property type: ${propertyType || 'Not specified'}
Provide a comprehensive analysis of property rights, claims, obligations, and potential resolutions.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.8
    };
  }
  
  /**
   * Handle general civil law task
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
Provide a response based on civil law principles.` 
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
  civilAgent: new CivilAgent()
};
