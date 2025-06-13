// src/types/dashboard.ts - CORRECTED VERSION
import { LawSection, CaseHistory } from './index'; // Import from main types file

export interface UserCase {
  id: string;
  title: string;
  clientName: string;
  caseType: string;
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

export interface UserStats {
  activeCases: number;
  pendingDeadlines: number;
  documentsReviewed: number;
  successRate: number;
  totalBriefsAnalyzed: number;
  monthlyGrowth: {
    cases: number;
    documents: number;
  };
}

export interface CaseBriefSubmission {
  clientName: string;
  caseTitle: string;
  caseType: string;
  briefDescription: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  courtLevel: string;
  userId: string;
  documents?: File[];
}

export interface AnalysisResult {
  id: string;
  summary: string;
  lawSections: LawSection[]; // Now properly imported
  precedents: CaseHistory[]; // Now properly imported
  recommendations: string[];
  confidence: number;
  processingTime: number;
  status: 'processing' | 'completed' | 'failed';
}