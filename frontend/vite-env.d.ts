// Type definitions for Vite environment variables
interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
