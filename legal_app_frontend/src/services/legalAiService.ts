import axios, { AxiosResponse } from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface Prediction {
  token: string;
  score: number;
  sequence: string;
}

export interface AnalysisResult {
  text_complexity: number;
  token_count: number;
  embedding_dimension: number;
}

export const legalAiService = {
  /**
   * Get text embeddings
   * @param text Legal text to analyze
   * @returns Embeddings array
   */
  getEmbeddings: async (text: string): Promise<number[]> => {
    try {
      const response: AxiosResponse<{ embeddings: number[] }> = await axios.post(
        `${API_URL}/api/legal-bert/embeddings`, 
        { text }
      );
      return response.data.embeddings;
    } catch (error) {
      console.error('Error getting embeddings:', error);
      throw error;
    }
  },
  
  /**
   * Fill masked tokens in text
   * @param text Text with [MASK] tokens
   * @param topK Number of predictions to return
   * @returns Predictions for masked tokens
   */
  fillMask: async (text: string, topK: number = 5): Promise<Prediction[]> => {
    try {
      const response: AxiosResponse<{ predictions: Prediction[] }> = await axios.post(
        `${API_URL}/api/legal-bert/fill-mask`, 
        { text, top_k: topK }
      );
      return response.data.predictions;
    } catch (error) {
      console.error('Error filling mask:', error);
      throw error;
    }
  },
  
  /**
   * Calculate similarity between two texts
   * @param text1 First text
   * @param text2 Second text
   * @returns Similarity score (0-1)
   */
  getSimilarity: async (text1: string, text2: string): Promise<number> => {
    try {
      const response: AxiosResponse<{ similarity: number }> = await axios.post(
        `${API_URL}/api/legal-bert/similarity`, 
        { text1, text2 }
      );
      return response.data.similarity;
    } catch (error) {
      console.error('Error calculating similarity:', error);
      throw error;
    }
  },
  
  /**
   * Analyze legal text
   * @param text Legal text to analyze
   * @returns Analysis results
   */
  analyzeText: async (text: string): Promise<AnalysisResult> => {
    try {
      const response: AxiosResponse<AnalysisResult> = await axios.post(
        `${API_URL}/api/legal-bert/analyze`, 
        { text }
      );
      return response.data;
    } catch (error) {
      console.error('Error analyzing text:', error);
      throw error;
    }
  }
};

export default legalAiService;
