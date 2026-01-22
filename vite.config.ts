import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Allow the API port to be configured via environment variable, defaulting to 3000
const API_PORT = process.env.PORT || 3000;
const API_TARGET = `http://localhost:${API_PORT}`;

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // rollupOptions.input is removed because Vite automatically uses index.html in the root by default
  },
  server: {
    proxy: {
      // Proxy API endpoints to the Express server
      '/upload': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/status': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/download': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/zip': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/health': {
        target: API_TARGET,
        changeOrigin: true,
      }
    }
  }
});