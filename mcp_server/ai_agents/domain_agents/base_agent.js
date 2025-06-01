const { OpenAI } = require('openai');

/**
 * Base Agent class providing common functionality for all agents
 */
class BaseAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Default system prompt (to be overridden by specific agents)
    this.systemPrompt = `You are a Legal Agent for LexAssist, a sophisticated legal AI assistant.
Provide accurate legal information based on authoritative sources.`;
    
    // Default domain knowledge (to be overridden by specific agents)
    this.domainKnowledge = {};
  }
  
  /**
   * Execute a task (to be implemented by specific agents)
   * @param {Object} task Task to execute
   * @param {Object} context Context information
   * @returns {Object} Task execution result
   */
  async executeTask(task, context) {
    throw new Error('executeTask must be implemented by the agent subclass');
  }
  
  /**
   * Generate a response using the LLM
   * @protected
   * @param {Array} messages Array of message objects for LLM
   * @returns {string} Generated response
   */
  async _generateResponse(messages) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating LLM response:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
  
  /**
   * Extract legal citations from text
   * @protected
   * @param {string} text Text to extract citations from
   * @returns {Array} Extracted citations
   */
  _extractCitations(text) {
    // Simple regex pattern for citation extraction
    // Could be replaced with more sophisticated citation parser
    const citationPattern = /(\d+\s+[A-Za-z\.]+\s+\d+)|(\[\d+\]\s+[A-Za-z\.]+\s+\d+)/g;
    const matches = text.match(citationPattern) || [];
    
    return matches.map(citation => ({
      citation: citation.trim(),
      text: citation.trim()
    }));
  }
  
  /**
   * Calculate confidence score based on available information
   * @protected
   * @param {Object} result Task result object
   * @param {Array} sources Source information
   * @param {Object} context Context information
   * @returns {number} Confidence score between 0 and 1
   */
  _calculateConfidence(result, sources = [], context = {}) {
    // Base confidence starts at 0.5
    let confidence = 0.5;
    
    // Adjust based on source quality
    if (sources && sources.length > 0) {
      // More sources generally means higher confidence
      confidence += Math.min(0.2, sources.length * 0.05);
      
      // Primary sources are more authoritative
      const primarySources = sources.filter(s => 
        s.type === 'case_law' || s.type === 'statute');
      if (primarySources.length > 0) {
        confidence += 0.1;
      }
    } else {
      // Reduce confidence without sources
      confidence -= 0.1;
    }
    
    // Adjust based on query clarity
    if (context.queryClarity && typeof context.queryClarity === 'number') {
      confidence += context.queryClarity * 0.1;
    }
    
    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }
}

module.exports = {
  BaseAgent
};
