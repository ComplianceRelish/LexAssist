// Common type definitions
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'free' | 'pro' | 'enterprise' | 'admin' | 'super_admin';
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

// Add other shared types here