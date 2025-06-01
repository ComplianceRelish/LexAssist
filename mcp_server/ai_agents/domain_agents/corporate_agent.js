const { BaseAgent } = require('./base_agent');
const { legalSearchService } = require('../../rag_engine/retrieval/hybrid_retriever');

/**
 * Corporate Law Agent specializing in corporate and business law
 */
class CorporateAgent extends BaseAgent {
  constructor() {
    super();
    
    // Define domain-specific system prompt
    this.systemPrompt = `You are a Corporate Law Agent for LexAssist, specializing in corporate and business law.
Your expertise includes:
1. Company formation and corporate structures
2. Corporate governance and compliance
3. Securities law and regulations
4. Mergers and acquisitions
5. Banking and finance law
6. Corporate taxation
7. Business contracts and transactions
8. Director and officer liability
9. Shareholder rights and disputes

When responding:
- Provide guidance on corporate legal structures and their implications
- Explain regulatory compliance requirements for different business activities
- Analyze corporate transactions from a legal perspective
- Clarify corporate governance principles and best practices
- Reference relevant corporate legislation and case law
- Distinguish between different business entities and their legal attributes
- Consider jurisdictional differences in corporate law requirements`;
    
    // Set domain-specific knowledge
    this.domainKnowledge = {
      core_concepts: [
        "corporate veil",
        "fiduciary duty",
        "articles of incorporation",
        "bylaws",
        "shareholder rights",
        "corporate governance",
        "business judgment rule",
        "securities regulation"
      ],
      specialized_research_areas: [
        "mergers and acquisitions",
        "hostile takeovers",
        "proxy contests",
        "insider trading",
        "corporate bonds",
        "venture capital",
        "corporate restructuring"
      ],
      corporate_entity_types: [
        "corporation",
        "limited liability company (LLC)",
        "partnership",
        "limited partnership (LP)",
        "sole proprietorship",
        "joint venture",
        "holding company"
      ]
    };
  }
  
  /**
   * Execute a corporate law task
   * @param {Object} task Task to execute
   * @param {Object} context Context information
   * @returns {Object} Task execution result
   */
  async executeTask(task, context) {
    console.log('Corporate Agent executing task:', task.description);
    
    try {
      switch (task.type) {
        case 'legal_research':
          return await this._handleResearch(task, context);
          
        case 'case_analysis':
          return await this._handleCaseAnalysis(task, context);
          
        case 'statute_interpretation':
          return await this._handleStatuteInterpretation(task, context);
          
        case 'corporate_formation':
          return await this._handleCorporateFormation(task, context);
          
        case 'corporate_governance':
          return await this._handleCorporateGovernance(task, context);
          
        case 'securities_analysis':
          return await this._handleSecuritiesAnalysis(task, context);
          
        case 'merger_analysis':
          return await this._handleMergerAnalysis(task, context);
          
        default:
          return await this._handleGeneralTask(task, context);
      }
    } catch (error) {
      console.error('Error in Corporate Agent:', error);
      return {
        success: false,
        error: error.message,
        content: "I encountered an issue while analyzing this corporate law question."
      };
    }
  }
  
  /**
   * Handle corporate legal research
   * @private
   * @param {Object} task Research task
   * @param {Object} context Context information
   * @returns {Object} Research results
   */
  async _handleResearch(task, context) {
    const { query } = task.data;
    
    // Enhance query with corporate law context
    const enhancedQuery = `${query} corporate business securities company`;
    
    // Perform search with corporate law focus
    const searchResults = await legalSearchService.search({
      query: enhancedQuery,
      filters: {
        legal_domain: "corporate",
        document_types: ["case_law", "statute", "article"]
      },
      limit: 5
    });
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Research corporate law question: ${query}
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
        corporateResearch: {
          query,
          results: searchResults
        }
      }
    };
  }
  
  /**
   * Handle corporate case analysis
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
          legal_domain: "corporate"
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
        content: `Analyze corporate law case: ${caseReference}
${caseDetails ? `Case details: ${JSON.stringify(caseDetails)}` : ''}
Analysis points: ${analysisPoints || 'Provide a comprehensive analysis focusing on corporate law principles'}` 
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
   * Handle corporate statute interpretation
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
        legal_domain: "corporate"
      },
      limit: 3
    });
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Interpret corporate statute: ${statute}
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
   * Handle corporate formation advice
   * @private
   * @param {Object} task Corporate formation task
   * @param {Object} context Context information
   * @returns {Object} Corporate formation results
   */
  async _handleCorporateFormation(task, context) {
    const { businessType, jurisdiction, requirements } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Provide information about forming a business entity:
Business type: ${businessType || 'Not specified'}
Jurisdiction: ${jurisdiction || 'Not specified'}
Requirements: ${requirements || 'General formation requirements and considerations'}
Provide comprehensive guidance on the legal requirements, process, advantages, disadvantages, and considerations for this business formation.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.85
    };
  }
  
  /**
   * Handle corporate governance advice
   * @private
   * @param {Object} task Corporate governance task
   * @param {Object} context Context information
   * @returns {Object} Corporate governance results
   */
  async _handleCorporateGovernance(task, context) {
    const { companyType, governanceIssue, jurisdiction } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Provide analysis on corporate governance issues:
Company type: ${companyType || 'Not specified'}
Governance issue: ${governanceIssue || 'General corporate governance principles'}
Jurisdiction: ${jurisdiction || 'Not specified'}
Provide comprehensive guidance on corporate governance requirements, best practices, fiduciary duties, and legal compliance considerations.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.85
    };
  }
  
  /**
   * Handle securities law analysis
   * @private
   * @param {Object} task Securities analysis task
   * @param {Object} context Context information
   * @returns {Object} Securities analysis results
   */
  async _handleSecuritiesAnalysis(task, context) {
    const { securitiesIssue, jurisdiction } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze securities law issue:
Securities issue: ${securitiesIssue}
Jurisdiction: ${jurisdiction || 'Not specified'}
Provide analysis of securities regulations, compliance requirements, potential violations, and risk mitigation strategies.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.85
    };
  }
  
  /**
   * Handle merger and acquisition analysis
   * @private
   * @param {Object} task M&A analysis task
   * @param {Object} context Context information
   * @returns {Object} M&A analysis results
   */
  async _handleMergerAnalysis(task, context) {
    const { dealStructure, concerns, jurisdiction } = task.data;
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Analyze merger/acquisition scenario:
Deal structure: ${dealStructure || 'Not specified'}
Concerns/questions: ${concerns || 'General M&A considerations'}
Jurisdiction: ${jurisdiction || 'Not specified'}
Provide comprehensive analysis of legal considerations, regulatory approvals, due diligence requirements, and potential issues.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.85
    };
  }
  
  /**
   * Handle general corporate law task
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
Provide a response based on corporate and business law principles.` 
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
  corporateAgent: new CorporateAgent()
};
