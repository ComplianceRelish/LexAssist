// Environment Variable Checker Utility
// This file helps verify that environment variables are properly loaded

export const checkEnvironmentVariables = () => {
  const envVars = {
    // Backend URL
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
    
    // Supabase Configuration
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    
    // InLegalBERT Configuration
    VITE_INLEGALBERT_MODEL_PATH: import.meta.env.VITE_INLEGALBERT_MODEL_PATH,
    
    // API Configuration
    VITE_API_TIMEOUT: import.meta.env.VITE_API_TIMEOUT,
    VITE_ENABLE_API_LOGS: import.meta.env.VITE_ENABLE_API_LOGS,
    VITE_MAX_RETRY_ATTEMPTS: import.meta.env.VITE_MAX_RETRY_ATTEMPTS,
    VITE_RETRY_DELAY: import.meta.env.VITE_RETRY_DELAY,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
  };

  // Log the environment variables
  console.log('Environment Variables Check:');
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`${key}: ${value ? (key.includes('KEY') ? '[PRESENT]' : value) : '[MISSING]'}`);
  });

  // Check for critical missing variables
  const criticalVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_BACKEND_URL'];
  const missingCriticalVars = criticalVars.filter(key => !import.meta.env[key]);
  
  if (missingCriticalVars.length > 0) {
    console.error('CRITICAL ERROR: Missing required environment variables:', missingCriticalVars);
    return false;
  }
  
  return true;
};

export default checkEnvironmentVariables;
