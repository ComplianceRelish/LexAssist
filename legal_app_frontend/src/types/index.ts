// legal_app_frontend/src/types/index.ts

export interface User {
  id: string;
  name: string;
  full_name?: string;     // ADD THIS LINE
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  avatarUrl?: string;
  phone?: string;
  // Add fields needed for legal system determination
  country?: string;
  countryCode?: string;
  mobileNumber?: string;
  userType?: string; // 'client' or 'lawyer'
  stats?: {
    briefsAnalyzed: number;
    documentsDownloaded: number;
    lastActivity: string;
  };
  subscription?: Subscription;
}

export interface Subscription {
  id: string;
  tier: string;
  features: string[];
  expiresAt: Date | string;
}

export interface LawSection {
  id: string;
  title: string;
  content: string;
  act_name: string;
  section_number: string;
  relevance_score: number;
  relevance: number; // Adding this property to match what's used in DocumentAnalysis.tsx
}

export interface CaseHistory {
  id: string;
  case_name: string;
  citation: string;
  court: string;
  date: string;
  content: string;
  summary: string;
  relevance_score: number;
  relevance: number; // Adding this property to match what's used in DocumentAnalysis.tsx
  title: string; // Adding this property to match what's used in DocumentAnalysis.tsx
  year: string; // Adding this property to match what's used in DocumentAnalysis.tsx
}

export interface Analysis {
  summary: string;
  keyIssues: Array<{title: string; content: string}> | string[];
  arguments: Array<{title: string; content: string}> | string[];
  recommendations: Array<{title: string; content: string}> | string[];
}

export interface AnalysisResults {
  lawSections: LawSection[];
  caseHistories: CaseHistory[];
  analysis: Analysis;
}

export interface AdminDashboardProps {
  user: User | null;
}

export interface LoginProps {
  onLogin: (user: User) => void;
}

export interface MobileFirstDashboardProps {
  user: User | null;
  onBriefSubmit: (briefText: string) => Promise<void>;
  isAnalyzing: boolean;
  analysisResults: AnalysisResults;
  hasAccess: (feature: string) => boolean;
}