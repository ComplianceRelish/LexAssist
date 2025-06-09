/**
 * Pinecone vector database client for legal document embeddings
 * Manages connections and operations with the Pinecone vector database
 */
const { Pinecone } = require('@pinecone-database/pinecone');

class PineconeClient {
  constructor() {
    this.client = null;
    this.index = null;
    this.namespace = 'legal-docs';
    this.initialized = false;
  }

  /**
   * Initialize connection to Pinecone
   * @returns {boolean} Whether initialization succeeded
   */
  async initialize() {
    try {
      if (this.initialized) {
        return true;
      }

      if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_ENVIRONMENT || !process.env.PINECONE_INDEX_NAME) {
        throw new Error('Missing required Pinecone environment variables');
      }

      // Initialize Pinecone client
      this.client = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT
      });

      // Connect to index
      this.index = this.client.Index(process.env.PINECONE_INDEX_NAME);
      
      // Verify connection with a simple stats call
      await this.index.describeIndexStats();
      
      this.initialized = true;
      console.log('Successfully connected to Pinecone index:', process.env.PINECONE_INDEX_NAME);
      return true;
    } catch (error) {
      console.error('Failed to initialize Pinecone client:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Ensure the client is initialized before operations
   * @private
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        throw new Error('Failed to initialize Pinecone client');
      }
    }
  }

  /**
   * Upsert vectors into Pinecone
   * @param {Object} params Upsert parameters
   * @param {string} params.id Vector ID
   * @param {Array} params.values Vector embedding values
   * @param {Object} params.metadata Vector metadata
   * @returns {Object} Upsert response
   */
  async upsert(params) {
    await this._ensureInitialized();
    
    const { id, values, metadata } = params;
    
    try {
      const response = await this.index.upsert({
        vectors: [{
          id,
          values,
          metadata
        }],
        namespace: this.namespace
      });
      
      return response;
    } catch (error) {
      console.error(`Error upserting vector ${id}:`, error);
      throw new Error(`Failed to upsert vector: ${error.message}`);
    }
  }

  /**
   * Batch upsert multiple vectors into Pinecone
   * @param {Array} vectors Array of vector objects with id, values, and metadata
   * @returns {Object} Batch upsert response
   */
  async batchUpsert(vectors) {
    await this._ensureInitialized();
    
    try {
      // Split into batches of 100 to avoid exceeding limits
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < vectors.length; i += batchSize) {
        batches.push(vectors.slice(i, i + batchSize));
      }
      
      const results = [];
      
      for (const batch of batches) {
        const response = await this.index.upsert({
          vectors: batch,
          namespace: this.namespace
        });
        
        results.push(response);
      }
      
      return {
        batchCount: batches.length,
        results
      };
    } catch (error) {
      console.error('Error batch upserting vectors:', error);
      throw new Error(`Failed to batch upsert vectors: ${error.message}`);
    }
  }

  /**
   * Query Pinecone for similar vectors
   * @param {Object} params Query parameters
   * @param {Array|string} params.vector Query vector or vector ID
   * @param {number} params.topK Number of results to return
   * @param {Object} params.filter Metadata filter
   * @param {boolean} params.includeMetadata Whether to include metadata in results
   * @returns {Object} Query response with matches
   */
  async query(params) {
    await this._ensureInitialized();
    
    const {
      vector,
      id,
      topK = 10,
      filter = {},
      includeMetadata = true
    } = params;
    
    try {
      let queryParams;
      
      if (vector) {
        // Query by vector
        queryParams = {
          vector,
          topK,
          includeMetadata,
          namespace: this.namespace
        };
      } else if (id) {
        // Query by ID
        queryParams = {
          id,
          topK,
          includeMetadata,
          namespace: this.namespace
        };
      } else {
        throw new Error('Either vector or id must be provided for query');
      }
      
      // Add filter if provided
      if (Object.keys(filter).length > 0) {
        queryParams.filter = filter;
      }
      
      const response = await this.index.query(queryParams);
      return response;
    } catch (error) {
      console.error('Error querying Pinecone:', error);
      throw new Error(`Failed to query Pinecone: ${error.message}`);
    }
  }

  /**
   * Delete vectors from Pinecone
   * @param {Object} params Delete parameters
   * @param {Array} params.ids Vector IDs to delete
   * @param {Object} params.filter Metadata filter for deletion
   * @returns {Object} Delete response
   */
  async delete(params) {
    await this._ensureInitialized();
    
    const { ids, filter } = params;
    
    try {
      const deleteParams = {
        namespace: this.namespace
      };
      
      if (ids && ids.length > 0) {
        deleteParams.ids = ids;
      } else if (filter && Object.keys(filter).length > 0) {
        deleteParams.filter = filter;
      } else {
        throw new Error('Either ids or filter must be provided for deletion');
      }
      
      const response = await this.index.delete(deleteParams);
      return response;
    } catch (error) {
      console.error('Error deleting vectors from Pinecone:', error);
      throw new Error(`Failed to delete vectors: ${error.message}`);
    }
  }

  /**
   * Fetch vectors by ID
   * @param {Array} ids Vector IDs to fetch
   * @returns {Object} Fetch response with vectors
   */
  async fetch(ids) {
    await this._ensureInitialized();
    
    try {
      const response = await this.index.fetch({
        ids,
        namespace: this.namespace
      });
      
      return response;
    } catch (error) {
      console.error('Error fetching vectors from Pinecone:', error);
      throw new Error(`Failed to fetch vectors: ${error.message}`);
    }
  }

  /**
   * Update metadata for vectors
   * @param {Object} params Update parameters
   * @param {string} params.id Vector ID
   * @param {Object} params.metadata New metadata
   * @returns {Object} Update response
   */
  async updateMetadata(params) {
    await this._ensureInitialized();
    
    const { id, metadata } = params;
    
    try {
      const response = await this.index.update({
        id,
        metadata,
        namespace: this.namespace
      });
      
      return response;
    } catch (error) {
      console.error(`Error updating metadata for vector ${id}:`, error);
      throw new Error(`Failed to update metadata: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = {
  pineconeClient: new PineconeClient()
};
