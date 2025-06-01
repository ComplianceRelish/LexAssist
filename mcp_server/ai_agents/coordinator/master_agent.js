const { OpenAI } = require('openai');
const { AgentRegistry } = require('./agent_registry');
const { TaskPlanner } = require('./task_planner');
const { queryAnalyzer } = require('../../utils/legal_domain/domain_classifier');
const { jurisdictionDetector } = require('../../utils/jurisdiction/jurisdiction_detector');

/**
 * Master Agent that coordinates the AI agent ecosystem
 * Responsible for:
 * - Analyzing incoming queries
 * - Routing to appropriate domain agents
 * - Orchestrating complex tasks
 * - Ensuring consistent responses
 */
class MasterAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.agentRegistry = new AgentRegistry();
    this.taskPlanner = new TaskPlanner();
    
    // System prompt for the master agent
    this.systemPrompt = `You are the Master Agent for LexAssist, a sophisticated legal AI assistant.
Your role is to:
1. Analyze legal queries to understand intent, domain, and jurisdiction
2. Break down complex tasks into manageable sub-tasks
3. Coordinate with specialized legal domain agents and utility agents
4. Synthesize information from multiple sources into coherent responses
5. Ensure legal accuracy and proper citation in all responses

You have access to domain specialists in Constitutional Law, Criminal Law, Civil Law, Corporate Law, and Intellectual Property Law.
You also have utility agents for citation parsing, document analysis, and response formatting.

When responding:
- Always maintain a professional legal tone
- Cite authoritative legal sources when available
- Acknowledge jurisdictional limits of legal advice
- Indicate levels of confidence in analyses
- Prioritize accuracy over comprehensiveness`;
  }

  /**
   * Process a user query and coordinate the appropriate agents
   * @param {string} query User's legal query
   * @param {Object} context Additional context (user, case, etc.)
   * @returns {Object} Processed response with appropriate legal information
   */
  async processQuery(query, context = {}) {
    try {
      console.log('Master Agent processing query:', query);
      
      // 1. Analyze the query to determine domain, intent, and jurisdiction
      const analysisResults = await this._analyzeQuery(query, context);
      
      // 2. Create a task plan based on the analysis
      const taskPlan = await this.taskPlanner.createPlan(query, analysisResults);
      
      // 3. Execute the task plan using appropriate agents
      const executionResults = await this._executePlan(taskPlan, context);
      
      // 4. Synthesize the results into a coherent response
      const finalResponse = await this._synthesizeResponse(executionResults, analysisResults, query);
      
      return finalResponse;
    } catch (error) {
      console.error('Error in Master Agent processing:', error);
      return {
        response: "I encountered an issue processing your legal query. Please try rephrasing or provide more specific information.",
        error: error.message
      };
    }
  }
  
  /**
   * Analyze the query for domain, intent, and jurisdiction
   * @private
   * @param {string} query User's query
   * @param {Object} context Additional context
   * @returns {Object} Analysis results
   */
  async _analyzeQuery(query, context) {
    // Use domain classifier to identify legal domains
    const domainAnalysis = await queryAnalyzer.classifyQuery(query);
    
    // Use jurisdiction detector to identify relevant jurisdictions
    const jurisdictionAnalysis = await jurisdictionDetector.detectJurisdiction(query);
    
    // Use the LLM to analyze intent and extract key elements
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the legal query to extract:
1. Primary intent (research, advice, document analysis, case comparison)
2. Key legal concepts mentioned
3. Specific documents or cases referenced
4. Time sensitivity or constraints
5. Required level of detail (brief overview vs detailed analysis)

Provide the analysis in JSON format with these fields.`
        },
        { role: "user", content: query }
      ],
      response_format: { type: "json_object" }
    });
    
    const intentAnalysis = JSON.parse(completion.choices[0].message.content);
    
    return {
      query,
      domains: domainAnalysis.domains,
      primaryDomain: domainAnalysis.primaryDomain,
      jurisdiction: jurisdictionAnalysis.jurisdiction,
      jurisdictionLevel: jurisdictionAnalysis.level,
      intent: intentAnalysis.intent,
      legalConcepts: intentAnalysis.keyLegalConcepts,
      referencedDocuments: intentAnalysis.documentsReferenced,
      timeSensitivity: intentAnalysis.timeSensitivity,
      detailLevel: intentAnalysis.requiredDetailLevel,
      confidence: {
        domain: domainAnalysis.confidence,
        jurisdiction: jurisdictionAnalysis.confidence
      }
    };
  }
  
  /**
   * Execute the task plan by delegating to appropriate agents
   * @private
   * @param {Object} plan Task plan with subtasks
   * @param {Object} context Additional context
   * @returns {Object} Results from executed tasks
   */
  async _executePlan(plan, context) {
    const results = {};
    
    // Execute each task in the plan
    for (const task of plan.tasks) {
      // Determine which agent should handle this task
      const agent = this._selectAgentForTask(task);
      
      // Execute the task with the selected agent
      const taskResult = await agent.executeTask(task, context);
      
      // Store the result
      results[task.id] = taskResult;
      
      // If task failed and is critical, abort the plan
      if (!taskResult.success && task.critical) {
        console.error(`Critical task ${task.id} failed:`, taskResult.error);
        throw new Error(`Failed to complete critical task: ${task.description}`);
      }
      
      // Update the context with the new information
      if (taskResult.contextUpdates) {
        Object.assign(context, taskResult.contextUpdates);
      }
    }
    
    return {
      planId: plan.id,
      results,
      completedTasks: plan.tasks.filter(t => results[t.id] && results[t.id].success).length,
      totalTasks: plan.tasks.length
    };
  }
  
  /**
   * Select the appropriate agent for a specific task
   * @private
   * @param {Object} task Task to be executed
   * @returns {Object} Selected agent
   */
  _selectAgentForTask(task) {
    // Try to get a specialized domain agent first
    if (task.domain) {
      const domainAgent = this.agentRegistry.getDomainAgent(task.domain);
      if (domainAgent) {
        return domainAgent;
      }
    }
    
    // Try to get a utility agent based on task type
    if (task.type) {
      const utilityAgent = this.agentRegistry.getUtilityAgent(task.type);
      if (utilityAgent) {
        return utilityAgent;
      }
    }
    
    // Fall back to a generic agent
    return this.agentRegistry.getGenericAgent();
  }
  
  /**
   * Synthesize the execution results into a coherent response
   * @private
   * @param {Object} executionResults Results from executed tasks
   * @param {Object} analysisResults Original query analysis
   * @param {string} originalQuery User's original query
   * @returns {Object} Final synthesized response
   */
  async _synthesizeResponse(executionResults, analysisResults, originalQuery) {
    // Prepare context for the synthesis
    const synthesisContext = {
      originalQuery,
      analysisResults,
      executionResults: executionResults.results,
      completedTasks: executionResults.completedTasks,
      totalTasks: executionResults.totalTasks
    };
    
    // Use a formatting agent to create the final response
    const formattingAgent = this.agentRegistry.getUtilityAgent('formatting');
    const formattedResponse = await formattingAgent.executeTask({
      type: 'formatting',
      description: 'Format final response',
      data: synthesisContext
    });
    
    // Add metadata to the response
    return {
      response: formattedResponse.content,
      metadata: {
        domains: analysisResults.domains,
        primaryDomain: analysisResults.primaryDomain,
        jurisdiction: analysisResults.jurisdiction,
        confidence: {
          domain: analysisResults.confidence.domain,
          jurisdiction: analysisResults.confidence.jurisdiction,
          response: formattedResponse.confidence || 0.8
        },
        sources: formattedResponse.sources || [],
        relatedConcepts: formattedResponse.relatedConcepts || []
      }
    };
  }
}

module.exports = {
  masterAgent: new MasterAgent()
};
