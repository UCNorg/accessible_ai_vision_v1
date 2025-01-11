import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true, // Optional: Enable source maps for debugging
  },
  server: {
    hmr: {
      overlay: false, // Disable HMR overlay to avoid build errors
    },
  },
});
