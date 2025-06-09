import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  define: {
    // This fixes the "env" property error on import.meta
    'import.meta.env': JSON.stringify(process.env)
  }
});
