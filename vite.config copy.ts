import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 1. React Native kodlarını web uyumlu hale getirir
      'react-native': 'react-native-web',
      
      // 2. Mobil ikon kütüphanesini web ikon kütüphanesine yönlendirir
      'lucide-react-native': 'lucide-react',
    },
    // Web uzantılarına öncelik ver
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  },
  define: {
    // Bazı kütüphaneler için global değişkeni
    global: 'window',
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});

