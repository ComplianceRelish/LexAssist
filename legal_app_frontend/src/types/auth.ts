export interface LoginProps {
  onLogin: (user: any) => void;
}

export interface RegisterPageProps {
  onRegister?: (user: any) => void;
}

// User type definition
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  userType?: 'client' | 'lawyer' | 'admin';
  // Add other user properties as needed
}
