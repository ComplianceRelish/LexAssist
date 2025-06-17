/// <reference types="vite/client" />
/// <reference path="./types/speech-recognition.d.ts" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_KEY: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_INLEGALBERT_MODEL_PATH: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production';
  readonly VITE_AUTH_TOKEN_KEY: string;
  readonly VITE_REFRESH_TOKEN_KEY: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_ENABLE_API_LOGS: string;
  readonly VITE_MAX_RETRY_ATTEMPTS: string;
  readonly VITE_RETRY_DELAY: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
