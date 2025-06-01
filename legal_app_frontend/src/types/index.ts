// Common type definitions
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin' | 'super_admin';
  subscription?: {
    tier: 'free' | 'pro' | 'enterprise';
    expiresAt: string;
    features: string[];
  };
}

// Component prop types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface AdminDashboardProps {
  user: User;
}

export interface LoginProps {
  onLogin: (user: User) => void;
}

// Add other shared types here