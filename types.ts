// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin' | 'super_admin';
  subscription: Subscription;
}

// Component Props Types
export interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export interface LoginProps {
  onLogin: (user: User) => void;
}

export interface AdminDashboardProps {
  user: User;
}

export interface UserProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

export interface SubscriptionPlansProps {
  currentTier: string | null;
  onSubscribe: (tier: string) => void;
}

export interface Subscription {
  tier: 'free' | 'pro' | 'enterprise';
  features: string[];
  expiresAt: string;
}

// Legal Analysis Types
export interface LawSection {
  act: string;
  section: string;
  title: string;
  content: string;
  relevance: number;
  enhanced_relevance?: number;
}

export interface CaseHistory {
  title: string;
  citation: string;
  court: string;
  date: string;
  summary: string;
  relevance: number;
  enhanced_relevance?: number;
}

export interface Argument {
  title: string;
  content: string;
}

export interface Recommendation {
  title: string;
  content: string;
}

export interface Analysis {
  summary: string;
  keyIssues: string[];
  arguments: Argument[];
  recommendations: Recommendation[];
  challenges?: Argument[];
}

export interface AnalysisResults {
  lawSections: LawSection[];
  caseHistories: CaseHistory[];
  analysis: Analysis;
  segments?: {
    facts?: string[];
    arguments?: string[];
    reasoning?: string[];
    statute?: string[];
    precedent?: string[];
    ruling?: string[];
    other?: string[];
  };
  judgment_prediction?: {
    outcome?: string;
    confidence?: number;
    factors?: string[];
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  name: string;
  mobile: string;
}

export interface BriefFormData {
  text: string;
}
