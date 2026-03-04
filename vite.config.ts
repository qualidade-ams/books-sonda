import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: false, // Permite usar porta alternativa se 8080 estiver ocupada
    // Proxy removido - quando usar vercel dev, a API já está na mesma porta
    // Se precisar rodar npm run dev + vercel dev separados, descomente:
    proxy: {
      '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
