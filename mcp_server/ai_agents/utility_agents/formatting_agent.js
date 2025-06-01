const { BaseAgent } = require('../domain_agents/base_agent');

/**
 * Formatting Agent for creating well-structured legal responses
 */
class FormattingAgent extends BaseAgent {
  constructor() {
    super();
    
    // Define formatting-specific system prompt
    this.systemPrompt = `You are a Formatting Agent for LexAssist, specializing in legal content presentation.
Your role is to:
1. Create well-structured, professional legal responses
2. Format citations properly according to legal standards
3. Organize complex legal information in a clear, accessible manner
4. Ensure appropriate headings and sections for legal content
5. Maintain consistent legal terminology and phrasing
6. Highlight key legal principles and important points
7. Format references and footnotes according to legal standards

When formatting legal content:
- Use clear headings and subheadings to organize information
- Present legal arguments in a logical, structured manner
- Format citations consistently using appropriate legal style guides
- Use numbered or bullet points for multi-part tests or elements
- Bold or italicize key legal principles when appropriate
- Include appropriate disclaimers when necessary
- Balance technical legal accuracy with accessibility for the intended audience`;
  }
  
  /**
   * Execute a formatting task
   * @param {Object} task Task to execute
   * @param {Object} context Context information
   * @returns {Object} Task execution result
   */
  async executeTask(task, context) {
    console.log('Formatting Agent executing task:', task.description);
    
    try {
      // For formatting tasks, we primarily use the general handler
      return await this._handleFormatting(task.data);
    } catch (error) {
      console.error('Error in Formatting Agent:', error);
      return {
        success: false,
        error: error.message,
        content: "I encountered an issue while formatting the response."
      };
    }
  }
  
  /**
   * Handle formatting of legal content
   * @private
   * @param {Object} data Formatting data
   * @returns {Object} Formatted results
   */
  async _handleFormatting(data) {
    const { originalQuery, analysisResults, executionResults } = data;
    
    if (!originalQuery) {
      return {
        success: false,
        error: 'No query provided for formatting',
        content: 'No query was provided to format a response for.'
      };
    }
    
    // Collect results from execution
    let resultContent = '';
    const sources = [];
    
    // Extract content from execution results
    for (const taskId in executionResults) {
      const result = executionResults[taskId];
      
      if (result.success) {
        // Add content if available
        if (result.content) {
          resultContent += result.content + '\n\n';
        }
        
        // Collect sources if available
        if (result.sources) {
          sources.push(...result.sources);
        }
      }
    }
    
    // Deduplicate sources
    const uniqueSources = Array.from(new Map(
      sources.map(s => [s.citation || s.title, s])
    ).values());
    
    // Generate formatted response using the LLM
    const formattingPrompt = `Format a comprehensive legal response to the following query:
Query: ${originalQuery}

Available information:
${resultContent}

Legal domain: ${analysisResults.primaryDomain || 'General legal'}
Jurisdiction: ${analysisResults.jurisdiction || 'Not specified'}

Format the response professionally with:
1. A clear answer to the query
2. Proper legal reasoning and analysis
3. Well-formatted citations to relevant authorities
4. Organized structure with appropriate headings
5. Disclaimers where appropriate

Sources to cite: ${JSON.stringify(uniqueSources)}`;

    const response = await this._generateResponse([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: formattingPrompt }
    ]);
    
    return {
      success: true,
      content: response,
      sources: uniqueSources,
      confidence: 0.9
    };
  }
}

module.exports = {
  formattingAgent: new FormattingAgent()
};
