import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/', // Use relative base to allow backend to swap CDN URLs dynamically
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        admin: path.resolve(__dirname, 'index.html'),
        public: path.resolve(__dirname, 'public.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'public'
            ? 'imcst_assets/designer-storefront-[hash].js'
            : 'imcst_assets/admin-[hash].js';
        },
        chunkFileNames: (chunkInfo) => {
          return 'imcst_assets/chunks/[name]-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          return 'imcst_assets/[name]-[hash][extname]';
        },
        manualChunks: (id) => {
          // Group core vendors to avoid circular dependencies between UI components and Shopify libs
          // Core React (must be loaded first)
          if (id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Separate Shopify-specific libs
          if (id.includes('@shopify/polaris') ||
            id.includes('@shopify/app-bridge')) {
            return 'vendor-shopify';
          }
          // Shared UI libs (Radix, Lucide)
          if (id.includes('@radix-ui') ||
            id.includes('lucide-react')) {
            return 'vendor-ui';
          }
          // Separate heavy graphic libs for lazy loading
          if (id.includes('html2canvas') || id.includes('jspdf') || id.includes('pdfjs-dist') || id.includes('psd.js')) {
            return 'vendor-graphics';
          }
        }
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  server: {
    allowedHosts: ['custom.duniasantri.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3011',
        changeOrigin: true,
      },
      '/imcst_api': {
        target: 'http://localhost:3011',
        changeOrigin: true,
      },
      '/imcst_public_api': {
        target: 'http://localhost:3011',
        changeOrigin: true,
      }
    }
  }
})
