const neo4j = require('neo4j-driver');

class Neo4jConnectionManager {
  constructor() {
    this.driver = null;
    this.initialized = false;
  }

  /**
   * Initialize the Neo4j connection
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const uri = process.env.NEO4J_URI;
      const username = process.env.NEO4J_USERNAME;
      const password = process.env.NEO4J_PASSWORD;

      if (!uri || !username || !password) {
        throw new Error('Neo4j connection parameters not provided');
      }

      this.driver = neo4j.driver(
        uri,
        neo4j.auth.basic(username, password),
        {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 30000,
          disableLosslessIntegers: true
        }
      );

      // Verify connection
      await this.verifyConnection();
      
      this.initialized = true;
      console.log('Neo4j connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Neo4j connection:', error);
      throw error;
    }
  }

  /**
   * Verify the Neo4j connection is working
   * @returns {Promise<void>}
   */
  async verifyConnection() {
    const session = this.getSession();
    try {
      const result = await session.run('RETURN 1 as test');
      if (result.records[0].get('test') !== 1) {
        throw new Error('Neo4j connection verification failed');
      }
    } finally {
      await session.close();
    }
  }

  /**
   * Get a Neo4j session
   * @returns {neo4j.Session}
   */
  getSession() {
    if (!this.initialized) {
      throw new Error('Neo4j connection not initialized');
    }
    return this.driver.session();
  }

  /**
   * Execute a Cypher query
   * @param {string} query Cypher query
   * @param {Object} params Query parameters
   * @returns {Promise<neo4j.Result>}
   */
  async executeQuery(query, params = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const session = this.getSession();
    try {
      return await session.run(query, params);
    } finally {
      await session.close();
    }
  }

  /**
   * Close the Neo4j connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.driver) {
      await this.driver.close();
      this.initialized = false;
      console.log('Neo4j connection closed');
    }
  }
}

const connectionManager = new Neo4jConnectionManager();

module.exports = {
  neo4jConnectionManager: connectionManager,
  getSession: () => connectionManager.getSession(),
  executeQuery: (query, params) => connectionManager.executeQuery(query, params),
  initialize: () => connectionManager.initialize(),
  close: () => connectionManager.close()
};
