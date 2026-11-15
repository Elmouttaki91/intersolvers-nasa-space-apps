import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' => works on GitHub Pages, Netlify, Vercel and from any sub-folder.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 900 },
});
