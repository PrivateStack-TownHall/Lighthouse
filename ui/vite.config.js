import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Port 5102: UI of A1 #02 (contract-kit/docs/PORTS.md)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5102, strictPort: true },
  preview: { port: 5102, strictPort: true },
  // react, framer-motion, TanStack Query and lucide in the main chunk; Markdown and JSZip load on demand.
  build: { chunkSizeWarningLimit: 600 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
