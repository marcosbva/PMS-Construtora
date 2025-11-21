import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa bibliotecas pesadas em arquivos diferentes para cache eficiente
          vendor: ['react', 'react-dom', 'recharts', 'lucide-react'],
          utils: ['@google/genai'] // Separa a IA se for pesada
        }
      }
    }
  }
})