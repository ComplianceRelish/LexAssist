const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');

/**
 * Task Planner breaks down complex legal queries into subtasks
 */
class TaskPlanner {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // System prompt for task planning
    this.systemPrompt = `You are a Task Planning Agent for LexAssist, a legal AI assistant.
Your role is to break down complex legal queries into structured tasks that can be executed by specialized legal agents.

For each task plan, provide:
1. A list of sequential tasks to complete the query
2. Dependencies between tasks
3. The legal domain for each task (constitutional, criminal, civil, corporate, intellectual_property)
4. Required data or context for each task
5. Whether each task is critical for the final response

Format your response as a JSON object with these fields:
- id: A unique identifier for the plan
- query: The original query
- tasks: An array of task objects, each with:
  - id: Task identifier
  - description: Clear description of the task
  - domain: Legal domain (if applicable)
  - type: Task type (research, analysis, citation, summary, etc.)
  - dependencies: Array of task IDs this task depends on
  - critical: Boolean indicating if task is critical
  - data: Any specific data or context needed

Example task types:
- legal_research: Finding relevant laws, cases, or regulations
- case_analysis: Analyzing specific cases or judgments
- statute_interpretation: Interpreting specific statutes or regulations
- citation_parsing: Extracting and validating legal citations
- document_summarization: Summarizing legal documents
- comparison: Comparing cases, statutes, or legal concepts
- formatting: Formatting the final response`;
  }
  
  /**
   * Create a task plan for a legal query
   * @param {string} query User's legal query
   * @param {Object} analysisResults Results from query analysis
   * @returns {Object} Task plan with subtasks
   */
  async createPlan(query, analysisResults) {
    try {
      // Prepare the input for the planning LLM
      const planningInput = {
        query,
        domains: analysisResults.domains,
        primaryDomain: analysisResults.primaryDomain,
        jurisdiction: analysisResults.jurisdiction,
        intent: analysisResults.intent,
        legalConcepts: analysisResults.legalConcepts,
        referencedDocuments: analysisResults.referencedDocuments
      };
      
      // Generate task plan using LLM
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: this.systemPrompt },
          { 
            role: "user", 
            content: `Create a task plan for this legal query. Analysis results: ${JSON.stringify(planningInput)}` 
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse the task plan from LLM output
      const planOutput = JSON.parse(completion.choices[0].message.content);
      
      // Ensure plan has a unique ID
      if (!planOutput.id) {
        planOutput.id = uuidv4();
      }
      
      // Validate and normalize the plan
      return this._validateAndNormalizePlan(planOutput, query);
    } catch (error) {
      console.error('Error in task planning:', error);
      
      // Return a minimal fallback plan
      return this._createFallbackPlan(query, analysisResults);
    }
  }
  
  /**
   * Create a fallback plan when the main planning fails
   * @private
   * @param {string} query User's query
   * @param {Object} analysisResults Results from query analysis
   * @returns {Object} Simple fallback plan
   */
  _createFallbackPlan(query, analysisResults) {
    const planId = uuidv4();
    const domain = analysisResults.primaryDomain || 'general';
    
    return {
      id: planId,
      query,
      tasks: [
        {
          id: `${planId}-task1`,
          description: `Research information related to: ${query}`,
          domain,
          type: 'legal_research',
          dependencies: [],
          critical: true,
          data: { query }
        },
        {
          id: `${planId}-task2`,
          description: 'Format response with available information',
          type: 'formatting',
          dependencies: [`${planId}-task1`],
          critical: true,
          data: {}
        }
      ]
    };
  }
  
  /**
   * Validate and normalize the task plan
   * @private
   * @param {Object} plan Task plan to validate
   * @param {string} originalQuery Original user query
   * @returns {Object} Validated and normalized plan
   */
  _validateAndNormalizePlan(plan, originalQuery) {
    // Ensure query is included
    plan.query = plan.query || originalQuery;
    
    // Ensure tasks array exists
    if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
      throw new Error('Task plan must include at least one task');
    }
    
    // Validate and normalize each task
    plan.tasks = plan.tasks.map((task, index) => {
      // Ensure task has an ID
      task.id = task.id || `${plan.id}-task${index + 1}`;
      
      // Ensure dependencies is an array
      task.dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];
      
      // Default critical to true if not specified
      task.critical = typeof task.critical === 'boolean' ? task.critical : true;
      
      // Ensure data object exists
      task.data = task.data || {};
      
      return task;
    });
    
    // Validate task dependencies
    this._validateTaskDependencies(plan.tasks);
    
    return plan;
  }
  
  /**
   * Validate task dependencies to ensure no circular dependencies
   * @private
   * @param {Array} tasks List of tasks
   */
  _validateTaskDependencies(tasks) {
    const taskIds = new Set(tasks.map(t => t.id));
    
    // Check all dependencies exist
    tasks.forEach(task => {
      task.dependencies.forEach(depId => {
        if (!taskIds.has(depId)) {
          console.warn(`Task ${task.id} depends on non-existent task ${depId}`);
          // Remove invalid dependency
          task.dependencies = task.dependencies.filter(id => id !== depId);
        }
      });
    });
    
    // Check for circular dependencies
    const visited = new Set();
    const tempVisited = new Set();
    
    const hasCycle = (taskId, tasks, taskMap) => {
      if (tempVisited.has(taskId)) {
        return true; // Cycle detected
      }
      
      if (visited.has(taskId)) {
        return false; // Already checked, no cycle
      }
      
      tempVisited.add(taskId);
      visited.add(taskId);
      
      const task = taskMap.get(taskId);
      for (const depId of task.dependencies) {
        if (hasCycle(depId, tasks, taskMap)) {
          return true;
        }
      }
      
      tempVisited.delete(taskId);
      return false;
    };
    
    // Convert tasks to map for easy lookup
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    // Check each task for cycles
    tasks.forEach(task => {
      if (hasCycle(task.id, tasks, taskMap)) {
        console.error(`Circular dependency detected in task ${task.id}`);
        // Break the cycle by removing last dependency
        task.dependencies.pop();
      }
    });
  }
}

module.exports = {
  TaskPlanner
};
