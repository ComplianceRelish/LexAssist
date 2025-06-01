import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '5173-iwqwb3sqgkpzpygjuvalj-73eca477.manusvm.computer',
      '.manusvm.computer'
    ]
  }
});
