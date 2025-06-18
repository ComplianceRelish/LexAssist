// src/services/api.service.ts - ENHANCED VERSION
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { authService } from './auth.service';

// Add new interfaces for user-specific data and inlegalBERT services

// InLegalBERT specific interfaces
export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model_version: string;
  processing_time: number;
}

export interface TextSimilarityResponse {
  similarity: number;
  model_version: string;
  processing_time: number;
}

export interface LegalTextAnalysisResponse {
  statutes: {
    act: string;
    section: string;
    title: string;
  }[];
  legal_issues: string[];
  analysis: {
    summary: string;
    issues: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  model_version: string;
  processing_time: number;
  confidence_score: number;
  raw_output: string;
}

export interface LegalQueryRequest {
  query: string;
  query_type: string;
  context?: string;
  documents?: any[];
}

export interface EnhancedLegalQueryRequest extends LegalQueryRequest {
  use_preprocessing: boolean;
}

export interface EnhancedLegalQueryResponse {
  enhanced: boolean;
  result: any;
  timestamp: string;
  inlegalbert_available: boolean;
}

export interface UserCase {
  id: string;
  title: string;
  clientName: string;
  caseType: string;
  description?: string;
  case_type?: string; // snake_case variant for backend compatibility
  jurisdiction?: string;
  status: 'active' | 'pending' | 'closed' | 'urgent';
  court: string;
  nextHearing?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface UserDocument {
  id: string;
  title: string;
  type: string;
  size: number;
  uploadedAt: string;
  caseId?: string;
  userId: string;
  analysisStatus?: 'pending' | 'completed' | 'failed';
}

export interface CaseDiaryEntry {
  entry_text: string;
  entry_type?: string;
  entry_date?: string; // YYYY-MM-DD
}

export interface UserStats {
  activeCases: number;
  pendingDeadlines: number;
  documentsReviewed: number;
  successRate: number;
  averageTurnaroundDays: number;
  totalBriefsAnalyzed: number;
  upcomingDeadlines: Array<{
    case_id: string;
    title: string;
    due_date: string;
    type: string;
  }>;
  monthlyGrowth: {
    cases: number;
    documents: number;
  };
}

export interface CaseBriefSubmission {
  user_id: string;
  title: string;
  brief_text: string;
  court: string | null;
  case_type: string | null;
  jurisdiction?: string;
  urgency_level: 'low' | 'medium' | 'high' | 'urgent';
  speech_input?: boolean;
  case_id?: string;
  documents?: File[];
}

class ApiService {
  private static instance: ApiService;
  private axiosInstance: AxiosInstance;
  private isRefreshing: boolean = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_BACKEND_URL || 'https://lexassist-backend.onrender.com',
      timeout: 30000, // Increased for AI processing
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = authService.getAccessToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        interface ExtendedInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
          _retry?: boolean;
        }
        
        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);
        
        const extendedRequest = originalRequest as ExtendedInternalAxiosRequestConfig;
        
        if (error.response?.status === 401 && !extendedRequest._retry) {
          if (this.isRefreshing) {
            return new Promise(resolve => {
              this.refreshSubscribers.push((token: string) => {
                if (extendedRequest.headers) {
                  extendedRequest.headers.Authorization = 'Bearer ' + token;
                }
                resolve(this.axiosInstance(extendedRequest));
              });
            });
          }

          extendedRequest._retry = true;
          this.isRefreshing = true;

          try {
            await authService.refreshToken();
            const token = authService.getAccessToken();
            
            if (token) {
              this.onRefreshSuccess(token);
              if (extendedRequest.headers) {
                extendedRequest.headers.Authorization = 'Bearer ' + token;
              }
              return this.axiosInstance(extendedRequest);
            }
            
            throw new Error('No token after refresh');
          } catch (refreshError) {
            this.onRefreshFailure(refreshError as Error);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private onRefreshSuccess(token: string): void {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  private onRefreshFailure(error: Error): void {
    this.refreshSubscribers = [];
    authService.logout();
  }

  // ENHANCED: User-specific data methods
  public async getUserCases(userId: string): Promise<UserCase[]> {
  // Tries user-scoped route first, falls back to generic filter query

    try {
      const response = await this.get<{ cases: UserCase[] }>(`/api/users/${userId}/cases`);
      return response.data.cases || [];
    } catch (error) {
      console.error('Error fetching user cases:', error);
      return [];
    }
  }

  public async getUserDocuments(userId: string): Promise<UserDocument[]> {
  // Tries user-scoped route first, falls back to generic filter query

    try {
      const response = await this.get<{ documents: UserDocument[] }>(`/api/users/${userId}/documents`);
      return response.data.documents || [];
    } catch (error) {
      console.error('Error fetching user documents:', error);
      return [];
    }
  }

  public async getUserStats(userId: string): Promise<UserStats> {
    try {
      const response = await this.get<UserStats>(`/api/users/${userId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        activeCases: 0,
        pendingDeadlines: 0,
        upcomingDeadlines: [],
        documentsReviewed: 0,
        successRate: 0,
        averageTurnaroundDays: 0,
        totalBriefsAnalyzed: 0,
        monthlyGrowth: { cases: 0, documents: 0 }
      };
    }
  }

  // ENHANCED: Case Brief Analysis with InLegalBERT
  public async submitCaseBrief(briefData: any): Promise<any> {
    try {
      // Transform the input data to match the backend's expected field names
      const transformedData = {
        user_id: briefData.user_id || briefData.userId,
        title: briefData.title || briefData.caseTitle,
        brief_text: briefData.brief_text || briefData.briefDescription,
        court: briefData.court,
        case_type: briefData.case_type || briefData.caseType,
        jurisdiction: briefData.jurisdiction || 'IN',
        urgency_level: briefData.urgency_level || briefData.urgencyLevel || 'medium',
        speech_input: briefData.speech_input || briefData.speechInput || false,
        case_id: briefData.case_id || briefData.caseId,
        document_id: briefData.document_id || null
      };
      
      console.log('Transformed case brief data:', transformedData);
      
      const response = await this.post('/api/legal/analyze-brief', transformedData);
      return response.data;
    } catch (error) {
      console.error('Error submitting case brief:', error);
      throw error;
    }
  }

  // ENHANCED: Create new case
  public async createCase(caseData: Partial<UserCase>): Promise<UserCase> {
    try {
      const response = await this.post<UserCase>('/api/cases', caseData);
      return response.data;
    } catch (error) {
      console.error('Error creating case:', error);
      throw error;
    }
  }

  // ENHANCED: Create diary entry for a case
  public async createCaseDiaryEntry(caseId: string, entryData: CaseDiaryEntry): Promise<any> {
    try {
      const response = await this.post(`/api/cases/${caseId}/entries`, entryData);
      return response.data;
    } catch (error) {
      console.error('Error creating diary entry:', error);
      throw error;
    }
  }

  // NEW: Upload document
  public async uploadDocument(formData: FormData): Promise<any> {
    try {
      const response = await this.post('/api/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  // ENHANCED: Get analysis results
  public async getAnalysisResults(analysisId: string): Promise<any> {
    try {
      const response = await this.get(`/api/legal/analysis/${analysisId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching analysis results:', error);
      throw error;
    }
  }

  /**
   * Process a legal query with inlegalBERT preprocessing enhancement
   * This enhances the query with legal entity extraction before sending to LLMs
   * @param query The legal query with preprocessing toggle
   * @returns Enhanced response with preprocessing metadata
   */
  public async processEnhancedLegalQuery(query: EnhancedLegalQueryRequest): Promise<EnhancedLegalQueryResponse> {
    try {
      const response = await this.post<EnhancedLegalQueryResponse>('/api/enhanced-legal-query', query);
      console.log('Enhanced query processed with inlegalBERT preprocessing:', response.data.enhanced);
      return response.data;
    } catch (error) {
      console.error('Enhanced legal query failed:', error);
      throw error;
    }
  }

  // InLegalBERT specific methods
  public async getTextEmbeddings(text: string): Promise<EmbeddingResponse> {
    try {
      const response = await this.post('/api/inlegalbert/embeddings', { text });
      return response.data;
    } catch (error) {
      console.error('Error getting text embeddings:', error);
      throw error;
    }
  }

  public async getTextSimilarity(text1: string, text2: string): Promise<TextSimilarityResponse> {
    try {
      const response = await this.post('/api/inlegalbert/similarity', { text1, text2 });
      return response.data;
    } catch (error) {
      console.error('Error calculating text similarity:', error);
      throw error;
    }
  }

  public async analyzeStatutes(text: string, jurisdiction: string = 'IN'): Promise<LegalTextAnalysisResponse> {
    try {
      const response = await this.post('/api/inlegalbert/analyze', { 
        text, 
        jurisdiction,
        task_type: 'statute_identification'
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing statutes:', error);
      throw error;
    }
  }

  public async analyzeLegalText(text: string, jurisdiction: string = 'IN', taskType: string = 'general_analysis'): Promise<LegalTextAnalysisResponse> {
    try {
      const response = await this.post('/api/inlegalbert/analyze', { 
        text, 
        jurisdiction,
        task_type: taskType
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing legal text:', error);
      throw error;
    }
  }

  public async checkInLegalBERTStatus(): Promise<{status: string, model_version: string}> {
    try {
      const response = await this.get('/api/inlegalbert/health');
      return response.data;
    } catch (error) {
      console.error('Error checking InLegalBERT status:', error);
      return { status: 'unavailable', model_version: 'unknown' };
    }
  }

  // Original methods
  public get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

export const apiService = ApiService.getInstance();