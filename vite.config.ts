import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from '@vitejs/plugin-compression';
import { visualizer } from 'vite-plugin-visualizer';
import { fileURLToPath, URL } from 'node:url';

const isAnalyze = process.env.MODE === 'analyze';

export default defineConfig({
  plugins: [
    react(),
    // Gzip and Brotli compression for production
    compression({
      algorithm: 'brotli',
      ext: '.br',
    }),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Bundle visualization for performance analysis
    isAnalyze && visualizer({ open: true }),
  ].filter(Boolean),

  resolve: {
    alias: {
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@context': fileURLToPath(new URL('./src/context', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
    },
  },

  build: {
    target: 'ES2020',
    minify: 'terser',
    sourcemap: false, // Disable in production for security
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    reportCompressedSize: false,
  },

  server: {
    port: 5173,
    host: true, // Listen on all interfaces for Docker
    middlewareMode: false,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },

  preview: {
    port: 5173,
    host: true,
  },
});
