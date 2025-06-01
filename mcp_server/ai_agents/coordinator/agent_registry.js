/**
 * Agent Registry manages the registration and retrieval of all AI agents
 */
class AgentRegistry {
  constructor() {
    // Domain agents by domain name
    this.domainAgents = {};
    
    // Utility agents by functionality
    this.utilityAgents = {};
    
    // Generic fallback agent
    this.genericAgent = null;
    
    // Initialize available agents
    this._initializeAgents();
  }
  
  /**
   * Initialize available agents in the system
   * @private
   */
  _initializeAgents() {
    // Register domain agents
    this._registerDomainAgent('constitutional', require('../domain_agents/constitutional_agent').constitutionalAgent);
    this._registerDomainAgent('criminal', require('../domain_agents/criminal_agent').criminalAgent);
    this._registerDomainAgent('civil', require('../domain_agents/civil_agent').civilAgent);
    this._registerDomainAgent('corporate', require('../domain_agents/corporate_agent').corporateAgent);
    this._registerDomainAgent('intellectual_property', require('../domain_agents/ip_agent').ipAgent);
    
    // Register utility agents
    this._registerUtilityAgent('citation', require('../utility_agents/citation_agent').citationAgent);
    this._registerUtilityAgent('source_verification', require('../utility_agents/source_verification_agent').sourceVerificationAgent);
    this._registerUtilityAgent('summarization', require('../utility_agents/summarization_agent').summarizationAgent);
    this._registerUtilityAgent('formatting', require('../utility_agents/formatting_agent').formattingAgent);
    
    // Set up generic agent
    this.genericAgent = {
      executeTask: async (task, context) => {
        console.log('Generic agent handling task:', task.description);
        return {
          success: true,
          content: `Processed task: ${task.description}`,
          confidence: 0.7
        };
      }
    };
  }
  
  /**
   * Register a domain agent
   * @private
   * @param {string} domain Legal domain name
   * @param {Object} agent Agent instance
   */
  _registerDomainAgent(domain, agent) {
    if (!agent || typeof agent.executeTask !== 'function') {
      throw new Error(`Invalid agent for domain ${domain}`);
    }
    
    this.domainAgents[domain] = agent;
    console.log(`Registered domain agent for ${domain}`);
  }
  
  /**
   * Register a utility agent
   * @private
   * @param {string} type Utility function type
   * @param {Object} agent Agent instance
   */
  _registerUtilityAgent(type, agent) {
    if (!agent || typeof agent.executeTask !== 'function') {
      throw new Error(`Invalid utility agent for ${type}`);
    }
    
    this.utilityAgents[type] = agent;
    console.log(`Registered utility agent for ${type}`);
  }
  
  /**
   * Get a domain agent by domain name
   * @param {string} domain Legal domain name
   * @returns {Object|null} Domain agent or null if not found
   */
  getDomainAgent(domain) {
    const normalizedDomain = this._normalizeDomain(domain);
    return this.domainAgents[normalizedDomain] || null;
  }
  
  /**
   * Get a utility agent by type
   * @param {string} type Utility function type
   * @returns {Object|null} Utility agent or null if not found
   */
  getUtilityAgent(type) {
    return this.utilityAgents[type] || null;
  }
  
  /**
   * Get the generic fallback agent
   * @returns {Object} Generic agent
   */
  getGenericAgent() {
    return this.genericAgent;
  }
  
  /**
   * Get all registered domain agents
   * @returns {Object} Map of domain agents
   */
  getAllDomainAgents() {
    return { ...this.domainAgents };
  }
  
  /**
   * Get all registered utility agents
   * @returns {Object} Map of utility agents
   */
  getAllUtilityAgents() {
    return { ...this.utilityAgents };
  }
  
  /**
   * Normalize domain name for consistent lookup
   * @private
   * @param {string} domain Domain name
   * @returns {string} Normalized domain name
   */
  _normalizeDomain(domain) {
    if (!domain) return '';
    
    // Convert to lowercase and remove spaces
    let normalized = domain.toLowerCase().replace(/\s+/g, '_');
    
    // Map common domain variations
    const domainMappings = {
      'constitutional_law': 'constitutional',
      'constitution': 'constitutional',
      'admin_law': 'constitutional', // Often grouped with constitutional
      'criminal_law': 'criminal',
      'civil_law': 'civil',
      'corporate_law': 'corporate',
      'business_law': 'corporate',
      'commercial_law': 'corporate',
      'ip_law': 'intellectual_property',
      'intellectual_property_law': 'intellectual_property',
      'trademark': 'intellectual_property',
      'copyright': 'intellectual_property',
      'patent': 'intellectual_property'
    };
    
    return domainMappings[normalized] || normalized;
  }
}

module.exports = {
  AgentRegistry
};
