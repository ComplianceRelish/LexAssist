interface Environment {
  production: boolean;
  apiUrl: string;
  supabaseUrl: string;
  supabaseKey: string;
  debug: boolean;
}

const environment: Environment = {
  production: import.meta.env.PROD || false,
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseKey: import.meta.env.VITE_SUPABASE_KEY || '',
  debug: import.meta.env.DEV || false,
};

export const getConfig = (): Environment => {
  if (!environment.supabaseUrl || !environment.supabaseKey) {
    throw new Error('Missing required environment variables');
  }
  return environment;
};

export const isDevelopment = (): boolean => !environment.production;

export const isDebugMode = (): boolean => environment.debug;

export default environment;
