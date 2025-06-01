// src/types.ts
export type UserRole = 'admin' | 'free' | 'pro' | 'enterprise';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  userId: string;
}

export interface LawSection {
  id: string;
  code: string;
  section: string;
  content: string;
}

export interface CaseHistory {
  id: string;
  title: string;
  citation: string;
  summary: string;
  judgment: string;
  relevance: number; // 0-100
}