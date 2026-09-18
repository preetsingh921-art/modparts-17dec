import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Capture git info at build time with safe fallbacks and strict ISO-8601 (%cI)
let commitHash = 'dev';
let commitDate = new Date().toISOString();
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  const gitDate = execSync('git log -1 --format=%cI').toString().trim();
  if (gitDate && !isNaN(new Date(gitDate).getTime())) {
    commitDate = gitDate;
  }
} catch (e) {
  // Fallback to build time if git command fails
  commitDate = new Date().toISOString();
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __COMMIT_DATE__: JSON.stringify(commitDate),
  },
  base: '/', // Use absolute paths
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../public', // Output directly to the public directory
    emptyOutDir: true,   // Empty the output directory before building
    target: 'es2015',    // Target older browsers for better compatibility
    minify: 'esbuild',   // Use esbuild for minification (faster and more reliable)
    rollupOptions: {
      output: {
        format: 'es',    // Use ES modules format for better compatibility with modern browsers
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        inlineDynamicImports: false // Allow code splitting for better performance
      }
    }
  }
})
