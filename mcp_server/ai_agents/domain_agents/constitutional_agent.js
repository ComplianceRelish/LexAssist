const { BaseAgent } = require('./base_agent');
const { legalSearchService } = require('../../rag_engine/retrieval/hybrid_retriever');

/**
 * Constitutional Law Agent specializing in constitutional and administrative law
 */
class ConstitutionalAgent extends BaseAgent {
  constructor() {
    super();
    
    // Define domain-specific system prompt
    this.systemPrompt = `You are a Constitutional Law Agent for LexAssist, specializing in constitutional and administrative law.
Your expertise includes:
1. Constitutional interpretation and principles
2. Fundamental rights and freedoms
3. Administrative law and procedures
4. Judicial review of administrative actions
5. Federal and state government powers
6. Constitutional amendments and their interpretation
7. Landmark constitutional cases and precedents

When responding:
- Always provide accurate citations to constitutional provisions
- Reference landmark judgments and their effect on constitutional interpretation
- Explain constitutional principles in clear, accessible language
- Consider historical context of constitutional provisions when relevant
- Distinguish between majority opinions, concurrences, and dissents in key cases
- Note jurisdictional differences in constitutional interpretation
- Acknowledge the evolving nature of constitutional doctrines`;
    
    // Set domain-specific knowledge
    this.domainKnowledge = {
      core_concepts: [
        "separation of powers",
        "federalism",
        "fundamental rights",
        "judicial review",
        "administrative procedures",
        "constitutional amendments",
        "due process",
        "equal protection"
      ],
      specialized_research_areas: [
        "religious freedom",
        "freedom of speech",
        "search and seizure",
        "federalism disputes",
        "administrative procedures act",
        "executive powers",
        "legislative powers"
      ],
      key_legal_tests: [
        "strict scrutiny",
        "intermediate scrutiny",
        "rational basis review",
        "undue burden test",
        "lemon test"
      ]
    };
  }
  
  /**
   * Execute a constitutional law task
   * @param {Object} task Task to execute
   * @param {Object} context Context information
   * @returns {Object} Task execution result
   */
  async executeTask(task, context) {
    console.log('Constitutional Agent executing task:', task.description);
    
    try {
      switch (task.type) {
        case 'legal_research':
          return await this._handleResearch(task, context);
          
        case 'case_analysis':
          return await this._handleCaseAnalysis(task, context);
          
        case 'statute_interpretation':
          return await this._handleStatuteInterpretation(task, context);
          
        case 'constitutional_test':
          return await this._handleConstitutionalTest(task, context);
          
        default:
          return await this._handleGeneralTask(task, context);
      }
    } catch (error) {
      console.error('Error in Constitutional Agent:', error);
      return {
        success: false,
        error: error.message,
        content: "I encountered an issue while analyzing this constitutional law question."
      };
    }
  }
  
  /**
   * Handle constitutional legal research
   * @private
   * @param {Object} task Research task
   * @param {Object} context Context information
   * @returns {Object} Research results
   */
  async _handleResearch(task, context) {
    const { query } = task.data;
    
    // Enhance query with constitutional law context
    const enhancedQuery = `${query} constitutional law interpretation fundamental rights`;
    
    // Perform search with constitutional law focus
    const searchResults = await legalSearchService.search({
      query: enhancedQuery,
      filters: {
        legal_domain: "constitutional",
        document_types: ["case_law", "statute", "article"]
      },
      limit: 5
    });
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Research constitutional law question: ${query}
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
        constitutionalResearch: {
          query,
          results: searchResults
        }
      }
    };
  }
  
  /**
   * Handle constitutional case analysis
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
          document_types: ["case_law"]
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
        content: `Analyze constitutional law case: ${caseReference}
${caseDetails ? `Case details: ${JSON.stringify(caseDetails)}` : ''}
Analysis points: ${analysisPoints || 'Provide a comprehensive analysis'}` 
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
   * Handle constitutional statute interpretation
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
        document_types: ["statute", "regulation"]
      },
      limit: 3
    });
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Interpret constitutional statute: ${statute}
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
      confidence: 0.8
    };
  }
  
  /**
   * Handle constitutional test analysis
   * @private
   * @param {Object} task Constitutional test task
   * @param {Object} context Context information
   * @returns {Object} Test analysis results
   */
  async _handleConstitutionalTest(task, context) {
    const { test, scenario } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Apply constitutional test: ${test}
Scenario: ${scenario}
Provide a step-by-step analysis applying this constitutional test to the given scenario.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.85
    };
  }
  
  /**
   * Handle general constitutional law task
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
Provide a response based on constitutional law principles.` 
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
  constitutionalAgent: new ConstitutionalAgent()
};
