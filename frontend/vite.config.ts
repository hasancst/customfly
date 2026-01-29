import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
    rollupOptions: {
      input: {
        admin: path.resolve(__dirname, 'index.html'),
        public: path.resolve(__dirname, 'public.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'public'
            ? 'assets/public-[hash].js'
            : 'assets/admin-[hash].js';
        },
        chunkFileNames: (chunkInfo) => {
          // Separate chunks for admin and public
          const isPublic = chunkInfo.facadeModuleId?.includes('main-public') ||
            chunkInfo.facadeModuleId?.includes('PublicApp');
          return isPublic
            ? 'assets/public-chunks/[name]-[hash].js'
            : 'assets/admin-chunks/[name]-[hash].js';
        },
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
