const { BaseAgent } = require('../domain_agents/base_agent');
const { legalSearchService } = require('../../rag_engine/retrieval/hybrid_retriever');

/**
 * Citation Agent for parsing, validating, and contextualizing legal citations
 */
class CitationAgent extends BaseAgent {
  constructor() {
    super();
    
    // Define citation-specific system prompt
    this.systemPrompt = `You are a Citation Agent for LexAssist, specializing in legal citations.
Your role is to:
1. Extract citations from legal text
2. Validate and standardize citation formats
3. Retrieve cited cases or statutes
4. Provide context for citations
5. Identify the authority and relevance of cited sources
6. Recognize citation patterns and relationships
7. Correct malformed or incomplete citations

When working with citations:
- Use standard legal citation formats (Bluebook, OSCOLA, etc.)
- Distinguish between binding and persuasive authorities
- Indicate the current status of cited cases (good law, overruled, etc.)
- Link citations to the relevant legal principles they establish
- Provide pinpoint citations where possible for specific propositions
- Recognize jurisdiction-specific citation formats`;
  }
  
  /**
   * Execute a citation-related task
   * @param {Object} task Task to execute
   * @param {Object} context Context information
   * @returns {Object} Task execution result
   */
  async executeTask(task, context) {
    console.log('Citation Agent executing task:', task.description);
    
    try {
      switch (task.type) {
        case 'citation_parsing':
          return await this._handleCitationParsing(task, context);
          
        case 'citation_validation':
          return await this._handleCitationValidation(task, context);
          
        case 'citation_lookup':
          return await this._handleCitationLookup(task, context);
          
        default:
          return await this._handleGeneralTask(task, context);
      }
    } catch (error) {
      console.error('Error in Citation Agent:', error);
      return {
        success: false,
        error: error.message,
        content: "I encountered an issue while processing the citations."
      };
    }
  }
  
  /**
   * Handle citation parsing
   * @private
   * @param {Object} task Citation parsing task
   * @param {Object} context Context information
   * @returns {Object} Parsing results
   */
  async _handleCitationParsing(task, context) {
    const { text } = task.data;
    
    if (!text) {
      return {
        success: false,
        error: 'No text provided for citation parsing',
        content: 'No text was provided to parse for citations.'
      };
    }
    
    // Use the LLM to extract and parse citations
    const prompt = `Extract and parse all legal citations from the following text. 
For each citation, provide:
1. The full citation
2. Type of source (case law, statute, regulation, etc.)
3. Jurisdiction
4. Year (if available)
5. Parties or title (if available)

Format the response as a JSON array of citation objects.

Text:
${text}`;
    
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: prompt }
    ]);
    
    // Try to parse the JSON response
    let citations = [];
    try {
      // Extract JSON from the response (it might be wrapped in text)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        citations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (error) {
      console.error('Error parsing citations JSON:', error);
      
      // Fallback to regex extraction
      citations = this._extractCitations(text).map(c => ({
        citation: c.citation,
        type: 'unknown',
        jurisdiction: 'unknown',
        year: 'unknown',
        title: 'unknown'
      }));
    }
    
    return {
      success: true,
      content: `Extracted ${citations.length} citations from the provided text.`,
      citations: citations,
      confidence: citations.length > 0 ? 0.85 : 0.5
    };
  }
  
  /**
   * Handle citation validation
   * @private
   * @param {Object} task Citation validation task
   * @param {Object} context Context information
   * @returns {Object} Validation results
   */
  async _handleCitationValidation(task, context) {
    const { citations } = task.data;
    
    if (!citations || !Array.isArray(citations) || citations.length === 0) {
      return {
        success: false,
        error: 'No citations provided for validation',
        content: 'No citations were provided to validate.'
      };
    }
    
    // Validate each citation
    const validatedCitations = [];
    
    for (const citation of citations) {
      // Check if citation exists in database
      const searchResults = await legalSearchService.search({
        query: citation.citation || citation,
        filters: {
          document_types: ["case_law", "statute", "regulation"]
        },
        limit: 1
      });
      
      // Create validation result
      const validatedCitation = {
        original: citation.citation || citation,
        found: searchResults.length > 0,
        valid: searchResults.length > 0,
        standardized: searchResults.length > 0 ? 
          searchResults[0].document.citation : 
          citation.citation || citation,
        metadata: searchResults.length > 0 ? {
          title: searchResults[0].document.title,
          type: searchResults[0].document.document_type,
          jurisdiction: searchResults[0].document.jurisdiction,
          year: searchResults[0].document.published_date
        } : null
      };
      
      validatedCitations.push(validatedCitation);
    }
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Validate the following citations:
Citations: ${JSON.stringify(citations)}
Validation results: ${JSON.stringify(validatedCitations)}
Provide a summary of the validation results, correction suggestions for invalid citations, and any other relevant information.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      validatedCitations: validatedCitations,
      confidence: 0.8
    };
  }
  
  /**
   * Handle citation lookup
   * @private
   * @param {Object} task Citation lookup task
   * @param {Object} context Context information
   * @returns {Object} Lookup results
   */
  async _handleCitationLookup(task, context) {
    const { citation } = task.data;
    
    if (!citation) {
      return {
        success: false,
        error: 'No citation provided for lookup',
        content: 'No citation was provided to look up.'
      };
    }
    
    // Search for the citation
    const searchResults = await legalSearchService.search({
      query: citation,
      filters: {
        document_types: ["case_law", "statute", "regulation"]
      },
      limit: 3
    });
    
    if (searchResults.length === 0) {
      return {
        success: false,
        error: 'Citation not found',
        content: `The citation "${citation}" could not be found in our database. Please check the format and try again.`
      };
    }
    
    // Get details of the primary result
    const primaryResult = searchResults[0];
    
    // Generate response using the LLM
    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { 
        role: "user", 
        content: `Provide information about the following citation:
Citation: ${citation}
Search results: ${JSON.stringify(primaryResult)}
Additional matches: ${searchResults.length - 1}
Provide a comprehensive summary of the cited source, its significance, current status, and how it's typically used in legal arguments.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      citation: primaryResult.document,
      additionalMatches: searchResults.slice(1).map(r => ({
        title: r.document.title,
        citation: r.document.citation
      })),
      confidence: 0.9
    };
  }
  
  /**
   * Handle general citation task
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
Provide a response focused on legal citations and their proper use.` 
      }
    ]);
    
    return {
      success: true,
      content: response,
      confidence: 0.7
    };
  }
  
  /**
   * Analyze a query to extract and identify potential citations
   * @param {string} query User's legal query
   * @param {Object} options Analysis options
   * @returns {Object} Analysis result with identified citations
   */
  async analyzeQuery(query, options = {}) {
    try {
      // Use the LLM to analyze the query for potential citations
      const analysisPrompt = `Analyze this legal query to identify:
1. Any explicit legal citations
2. References to cases or statutes that could be citations
3. Legal concepts that might need citation support

Query: ${query}`;

      const analysisResponse = await this._generateResponse([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: analysisPrompt }
      ]);

      // Extract structured information
      const citationAnalysis = {
        explicitCitations: this._extractCitations(query),
        implicitReferences: [],
        legalConcepts: [],
        detectedJurisdiction: options.providedJurisdictionId || null,
        detectedDomain: options.providedLegalDomainId || null
      };
      
      // Use regex to extract potential case references
      const caseReferencePattern = /([A-Z][a-z]+)\s+v\.?\s+([A-Z][a-z]+)/g;
      const caseMatches = query.match(caseReferencePattern) || [];
      citationAnalysis.implicitReferences = caseMatches.map(ref => ({
        reference: ref.trim(),
        type: 'case_reference'
      }));
      
      return {
        query,
        citationAnalysis,
        analysisText: analysisResponse
      };
    } catch (error) {
      console.error('Error in query analysis:', error);
      return {
        query,
        citationAnalysis: {
          explicitCitations: [],
          implicitReferences: [],
          legalConcepts: []
        },
        error: error.message
      };
    }
  }
}

module.exports = {
  citationAgent: new CitationAgent()
};
