/**
 * Legal response generator that transforms retrieved legal content into
 * coherent, well-structured answers with proper citations
 */
const { OpenAI } = require('openai');
const { formatCitations } = require('../../utils/citation_utils/citation_formatter');
const { extractLegalReasoning } = require('../../utils/legal_domain/reasoning_extractor');

class LegalResponseGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate a comprehensive legal response from retrieved documents
   * 
   * @param {string} query User's legal query
   * @param {Array} retrievedDocuments Documents retrieved by the RAG engine
   * @param {Object} options Generation options
   * @returns {Object} Generated response with citations and reasoning
   */
  async generateResponse(query, retrievedDocuments, options = {}) {
    try {
      const {
        jurisdiction,
        legalDomain,
        responseFormat = 'detailed',
        maxLength = 1500,
        includeReferences = true,
        includeCitationText = true
      } = options;

      // 1. Prepare context from retrieved documents
      const context = this._prepareContext(retrievedDocuments);

      // 2. Extract legal principles and precedents from context
      const { principles, precedents } = await extractLegalReasoning(context, query);

      // 3. Format document citations
      const formattedCitations = formatCitations(retrievedDocuments);

      // 4. Generate response using LLM
      const response = await this._generateLLMResponse(
        query,
        context,
        principles,
        precedents,
        {
          jurisdiction,
          legalDomain,
          responseFormat,
          maxLength,
          includeReferences
        }
      );

      // 5. Post-process response to ensure citation formatting
      const processedResponse = this._postProcessResponse(response, formattedCitations);

      // 6. Build final response object
      return {
        query,
        response: processedResponse,
        references: includeReferences ? this._prepareReferences(retrievedDocuments, includeCitationText) : [],
        metadata: {
          generationModel: 'gpt-4',
          jurisdiction: jurisdiction || 'unknown',
          legalDomain: legalDomain || 'general',
          retrievedDocumentCount: retrievedDocuments.length,
          principles: principles.length
        }
      };
    } catch (error) {
      console.error('Legal response generation error:', error);
      throw new Error(`Failed to generate legal response: ${error.message}`);
    }
  }

  /**
   * Prepare context from retrieved documents
   * @private
   * @param {Array} documents Retrieved documents
   * @returns {string} Formatted context
   */
  _prepareContext(documents) {
    let context = '';

    // Sort documents by relevance score
    const sortedDocs = [...documents].sort((a, b) => b.score - a.score);

    // Build context string with document chunks
    for (const doc of sortedDocs) {
      const { document, chunk } = doc;
      
      context += `DOCUMENT: ${document.title}\n`;
      context += `CITATION: ${document.citation || 'N/A'}\n`;
      context += `TYPE: ${document.documentType}\n`;
      context += `CONTENT:\n${chunk.chunkText}\n\n`;
    }

    return context;
  }

  /**
   * Generate response using OpenAI LLM
   * @private
   * @param {string} query User query
   * @param {string} context Document context
   * @param {Array} principles Extracted legal principles
   * @param {Array} precedents Extracted precedents
   * @param {Object} options Generation options
   * @returns {string} LLM generated response
   */
  async _generateLLMResponse(query, context, principles, precedents, options) {
    const {
      jurisdiction,
      legalDomain,
      responseFormat,
      maxLength
    } = options;

    // Format principles and precedents for the prompt
    const principlesText = principles.length > 0
      ? `Relevant legal principles:\n${principles.map(p => `- ${p}`).join('\n')}`
      : 'No specific legal principles identified.';

    const precedentsText = precedents.length > 0
      ? `Relevant precedents:\n${precedents.map(p => `- ${p}`).join('\n')}`
      : 'No specific precedents identified.';

    // Build prompt with instructions
    const prompt = `You are a legal expert assistant specializing in ${jurisdiction || 'various'} law, 
particularly in ${legalDomain || 'general legal'} matters. 
Please provide a ${responseFormat} response to the following legal query:

QUERY: ${query}

Use the following information from legal sources to inform your answer:

${context}

${principlesText}

${precedentsText}

INSTRUCTIONS:
1. Provide a clear, concise, and accurate legal analysis.
2. Cite relevant legal sources using proper citation format.
3. Identify applicable legal principles and their application.
4. Be objective and consider different perspectives where appropriate.
5. Clearly state if there are limitations to your analysis.
6. Keep your response under ${maxLength} characters.
7. Structure your response with clear sections.
8. Use plain language while maintaining legal accuracy.
9. Format citations as [Document Title, Year] in your response.

YOUR RESPONSE:`;

    // Call OpenAI API
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a legal expert assistant providing precise, well-reasoned legal information with proper citations." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: Math.min(Math.floor(maxLength / 4), 1500),
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    return completion.choices[0].message.content;
  }

  /**
   * Post-process response to ensure proper citation formatting
   * @private
   * @param {string} response Generated response
   * @param {Object} citations Formatted citations
   * @returns {string} Processed response
   */
  _postProcessResponse(response, citations) {
    let processedResponse = response;

    // Replace citation placeholders with properly formatted citations
    for (const [key, citation] of Object.entries(citations)) {
      const placeholder = `[${key}]`;
      const formattedCitation = `[${citation}]`;
      processedResponse = processedResponse.replace(new RegExp(placeholder, 'g'), formattedCitation);
    }

    return processedResponse;
  }

  /**
   * Prepare references for inclusion in the response
   * @private
   * @param {Array} documents Retrieved documents
   * @param {boolean} includeCitationText Whether to include citation text
   * @returns {Array} Formatted references
   */
  _prepareReferences(documents, includeCitationText) {
    const uniqueDocs = new Map();

    // Deduplicate documents
    for (const item of documents) {
      const doc = item.document;
      if (!uniqueDocs.has(doc.id)) {
        uniqueDocs.set(doc.id, doc);
      }
    }

    // Format references
    return Array.from(uniqueDocs.values()).map(doc => ({
      id: doc.id,
      title: doc.title,
      citation: doc.citation,
      documentType: doc.documentType,
      jurisdiction: doc.jurisdiction?.name || 'Unknown',
      year: this._extractYearFromCitation(doc.citation),
      citationText: includeCitationText ? doc.citationText : undefined
    }));
  }

  /**
   * Extract year from citation text
   * @private
   * @param {string} citation Citation text
   * @returns {string} Extracted year or unknown
   */
  _extractYearFromCitation(citation) {
    if (!citation) return 'Unknown';
    
    // Try to extract a year (4 digits) from the citation
    const yearMatch = citation.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : 'Unknown';
  }
}

module.exports = {
  legalResponseGenerator: new LegalResponseGenerator()
};
