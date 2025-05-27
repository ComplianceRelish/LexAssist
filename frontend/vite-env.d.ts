/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_BACKEND_URL: string
  readonly BASE_URL: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Add this module declaration
declare module './supabase' {
  export const supabase: import('@supabase/supabase-js').SupabaseClient
  export const auth: {
    signUp: (email: string, password: string, metadata: any) => Promise<any>
    // Add other auth methods if needed
  }
  // Add other exports as needed
}