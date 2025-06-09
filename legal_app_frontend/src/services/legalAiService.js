import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://lexassist-backend.onrender.com';

export const legalAiService = {
  /**
   * Get text embeddings
   * @param {string} text - Legal text to analyze
   * @returns {Promise<Array>} - Embeddings array
   */
  getEmbeddings: async (text) => {
    try {
      const response = await axios.post(`${API_URL}/api/legal-bert/embeddings`, { text });
      return response.data.embeddings;
    } catch (error) {
      console.error('Error getting embeddings:', error);
      throw error;
    }
  },
  
  /**
   * Fill masked tokens in text
   * @param {string} text - Text with [MASK] tokens
   * @param {number} topK - Number of predictions to return
   * @returns {Promise<Array>} - Predictions for masked tokens
   */
  fillMask: async (text, topK = 5) => {
    try {
      const response = await axios.post(`${API_URL}/api/legal-bert/fill-mask`, { 
        text, 
        top_k: topK 
      });
      return response.data.predictions;
    } catch (error) {
      console.error('Error filling mask:', error);
      throw error;
    }
  },
  
  /**
   * Calculate similarity between two texts
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {Promise<number>} - Similarity score (0-1)
   */
  getSimilarity: async (text1, text2) => {
    try {
      const response = await axios.post(`${API_URL}/api/legal-bert/similarity`, { 
        text1, 
        text2 
      });
      return response.data.similarity;
    } catch (error) {
      console.error('Error calculating similarity:', error);
      throw error;
    }
  },
  
  /**
   * Analyze legal text
   * @param {string} text - Legal text to analyze
   * @returns {Promise<Object>} - Analysis results
   */
  analyzeText: async (text) => {
    try {
      const response = await axios.post(`${API_URL}/api/legal-bert/analyze`, { text });
      return response.data;
    } catch (error) {
      console.error('Error analyzing text:', error);
      throw error;
    }
  }
};

export default legalAiService;
