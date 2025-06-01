/**
 * Supabase client for document storage and retrieval
 * Manages connections and operations with Supabase database
 */
const { createClient } = require('@supabase/supabase-js');

class SupabaseClient {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize connection to Supabase
   * @returns {boolean} Whether initialization succeeded
   */
  initialize() {
    try {
      if (this.initialized) {
        return true;
      }

      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        throw new Error('Missing required Supabase environment variables');
      }

      // Initialize Supabase client
      this.client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false
          }
        }
      );
      
      this.initialized = true;
      console.log('Successfully connected to Supabase');
      return true;
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Get the Supabase client instance
   * @returns {Object} Supabase client
   */
  getClient() {
    if (!this.initialized) {
      const success = this.initialize();
      if (!success) {
        throw new Error('Failed to initialize Supabase client');
      }
    }
    
    return this.client;
  }

  /**
   * Upload a file to Supabase Storage
   * @param {Object} params Upload parameters
   * @param {string} params.bucket Storage bucket name
   * @param {string} params.path File path in storage
   * @param {File|Buffer} params.file File to upload
   * @param {Object} params.options Upload options
   * @returns {Object} Upload response
   */
  async uploadFile(params) {
    const client = this.getClient();
    
    const {
      bucket = 'legal-documents',
      path,
      file,
      options = {}
    } = params;
    
    try {
      const { data, error } = await client.storage
        .from(bucket)
        .upload(path, file, options);
        
      if (error) throw error;
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`Error uploading file to ${bucket}/${path}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download a file from Supabase Storage
   * @param {Object} params Download parameters
   * @param {string} params.bucket Storage bucket name
   * @param {string} params.path File path in storage
   * @returns {Object} Download response with file data
   */
  async downloadFile(params) {
    const client = this.getClient();
    
    const {
      bucket = 'legal-documents',
      path
    } = params;
    
    try {
      const { data, error } = await client.storage
        .from(bucket)
        .download(path);
        
      if (error) throw error;
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`Error downloading file from ${bucket}/${path}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a public URL for a file
   * @param {Object} params URL parameters
   * @param {string} params.bucket Storage bucket name
   * @param {string} params.path File path in storage
   * @returns {string} Public URL
   */
  getPublicUrl(params) {
    const client = this.getClient();
    
    const {
      bucket = 'legal-documents',
      path
    } = params;
    
    try {
      const { data } = client.storage
        .from(bucket)
        .getPublicUrl(path);
        
      return data.publicUrl;
    } catch (error) {
      console.error(`Error getting public URL for ${bucket}/${path}:`, error);
      return null;
    }
  }

  /**
   * Perform a database query using the Supabase client
   * @param {string} table Table name
   * @returns {Object} Supabase query builder
   */
  from(table) {
    const client = this.getClient();
    return client.from(table);
  }

  /**
   * Get Supabase authentication module
   * @returns {Object} Auth module
   */
  get auth() {
    const client = this.getClient();
    return client.auth;
  }

  /**
   * Get Supabase storage module
   * @returns {Object} Storage module
   */
  get storage() {
    const client = this.getClient();
    return client.storage;
  }

  /**
   * Execute a Postgres function through Supabase
   * @param {string} functionName Function name
   * @param {Array} params Function parameters
   * @returns {Object} Function response
   */
  async rpc(functionName, params = {}) {
    const client = this.getClient();
    
    try {
      const { data, error } = await client.rpc(functionName, params);
      
      if (error) throw error;
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`Error executing RPC function ${functionName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const supabaseClientInstance = new SupabaseClient();

// Initialize the client
supabaseClientInstance.initialize();

// Export singleton and direct access to client for convenience
module.exports = {
  supabaseClient: supabaseClientInstance,
  supabase: supabaseClientInstance.getClient()
};
