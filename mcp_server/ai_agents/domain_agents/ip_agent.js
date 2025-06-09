const { BaseAgent } = require('./base_agent');
const { legalSearchService } = require('../../rag_engine/retrieval/hybrid_retriever');

/**
 * Intellectual Property Agent specializing in IP law
 */
class IntellectualPropertyAgent extends BaseAgent {
  constructor() {
    super();
    
    // Define domain-specific system prompt
    this.systemPrompt = `You are an Intellectual Property Law Agent for LexAssist, specializing in IP law.
Your expertise includes:
1. Patent law (requirements, prosecution, infringement)
2. Trademark law (registration, protection, infringement)
3. Copyright law (creation, protection, fair use)
4. Trade secrets (definition, protection, misappropriation)
5. IP licensing and transactions
6. IP litigation and enforcement
7. International IP protection

When responding:
- Explain IP protection requirements and strategies
- Analyze potential infringement scenarios with precision
- Clarify the scope and limitations of IP rights
- Reference relevant IP statutes, regulations, and cases
- Explain differences between various IP protection methods
- Consider jurisdictional differences in IP law
- Provide practical IP management guidance`;
    
    // Set domain-specific knowledge
    this.domainKnowledge = {
      core_concepts: [
        "patent eligibility",
        "novelty",
        "non-obviousness",
        "trademark distinctiveness",
        "likelihood of confusion",
        "copyright originality",
        "fair use",
        "trade secret misappropriation"
      ],
      specialized_research_areas: [
        "patent prosecution",
        "trademark dilution",
        "copyright registration",
        "IP licensing",
        "domain name disputes",
        "trade dress",
        "geographical indications",
        "software IP protection"
      ],
      international_frameworks: [
        "TRIPS Agreement",
        "Paris Convention",
        "Berne Convention",
        "Madrid Protocol",
        "PCT",
        "WIPO treaties",
        "EU IP directives"
      ]
    };
  }
  
  /**
   * Execute an IP law task
   * @param {Object} task Task to execute
   * @param {Object} context Context information
   * @returns {Object} Task execution result
   */
  async executeTask(task, context) {
    console.log('IP Agent executing task:', task.description);
    
    try {
      switch (task.type) {
        case 'legal_research':
          return await this._handleResearch(task, context);
          
        case 'case_analysis':
          return await this._handleCaseAnalysis(task, context);
          
        case 'statute_interpretation':
          return await this._handleStatuteInterpretation(task, context);
          
        case 'patent_analysis':
          return await this._handlePatentAnalysis(task, context);
          
        case 'trademark_analysis':
          return await this._handleTrademarkAnalysis(task, context);
          
        case 'copyright_analysis':
          return await this._handleCopyrightAnalysis(task, context);
          
        case 'trade_secret_analysis':
          return await this._handleTradeSecretAnalysis(task, context);
          
        default:
          return await this._handleGeneralTask(task, context);
      }
    } catch (error) {
      console.error('Error in IP Agent:', error);
      return {
        success: false,
        error: error.message,
        content: "I encountered an issue while analyzing this intellectual property law question."
      };
    }
  }
  
  /**
   * Handle IP legal research
   * @private
   * @param {Object} task Research task
   * @param {Object} context Context information
   * @returns {Object} Research results
   */
  async _handleResearch(task, context) {
    const { query } = task.data;
    
    // Enhance query with IP law context
    const enhancedQuery = `${query} intellectual property patent trademark copyright trade secret`;
    
    // Perform search with IP law focus
    const searchResults = await legalSearchService.search({
      query: enhancedQuery,
      filters: {
        legal_domain: "intellectual_property",
        document_types: ["case_law", "statute", "article"]
      },
      limit: 5
    });
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Research intellectual property law question: ${query}
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
        ipResearch: {
          query,
          results: searchResults
        }
      }
    };
  }
  
  /**
   * Handle IP case analysis
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
          legal_domain: "intellectual_property"
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
        content: `Analyze intellectual property case: ${caseReference}
${caseDetails ? `Case details: ${JSON.stringify(caseDetails)}` : ''}
Analysis points: ${analysisPoints || 'Provide a comprehensive analysis focusing on IP law principles'}` 
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
   * Handle IP statute interpretation
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
        legal_domain: "intellectual_property"
      },
      limit: 3
    });
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Interpret intellectual property statute: ${statute}
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
   * Handle patent analysis
   * @private
   * @param {Object} task Patent analysis task
   * @param {Object} context Context information
   * @returns {Object} Patent analysis results
   */
  async _handlePatentAnalysis(task, context) {
    const { patentDescription, analysisType, jurisdiction } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze the following patent matter:
Patent description: ${patentDescription}
Analysis type: ${analysisType || 'General patent analysis'}
Jurisdiction: ${jurisdiction || 'Not specified'}
Provide a comprehensive analysis addressing patentability requirements, potential issues, and relevant considerations.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.85
    };
  }
  
  /**
   * Handle trademark analysis
   * @private
   * @param {Object} task Trademark analysis task
   * @param {Object} context Context information
   * @returns {Object} Trademark analysis results
   */
  async _handleTrademarkAnalysis(task, context) {
    const { mark, goodsServices, analysisType, jurisdiction } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze the following trademark matter:
Mark: ${mark}
Goods/Services: ${goodsServices || 'Not specified'}
Analysis type: ${analysisType || 'General trademark analysis'}
Jurisdiction: ${jurisdiction || 'Not specified'}
Provide a comprehensive analysis addressing distinctiveness, potential conflicts, registration requirements, and protection strategies.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.85
    };
  }
  
  /**
   * Handle copyright analysis
   * @private
   * @param {Object} task Copyright analysis task
   * @param {Object} context Context information
   * @returns {Object} Copyright analysis results
   */
  async _handleCopyrightAnalysis(task, context) {
    const { work, analysisType, jurisdiction } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze the following copyright matter:
Work: ${work}
Analysis type: ${analysisType || 'General copyright analysis'}
Jurisdiction: ${jurisdiction || 'Not specified'}
Provide a comprehensive analysis addressing copyrightability, protection scope, potential infringement issues, and fair use considerations.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.85
    };
  }
  
  /**
   * Handle trade secret analysis
   * @private
   * @param {Object} task Trade secret analysis task
   * @param {Object} context Context information
   * @returns {Object} Trade secret analysis results
   */
  async _handleTradeSecretAnalysis(task, context) {
    const { information, analysisType, jurisdiction } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze the following trade secret matter:
Information: ${information}
Analysis type: ${analysisType || 'General trade secret analysis'}
Jurisdiction: ${jurisdiction || 'Not specified'}
Provide a comprehensive analysis addressing trade secret qualification requirements, protection strategies, and potential misappropriation issues.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.85
    };
  }
  
  /**
   * Handle general IP law task
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
Provide a response based on intellectual property law principles.` 
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
  ipAgent: new IntellectualPropertyAgent()
};
