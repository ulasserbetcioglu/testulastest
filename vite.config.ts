import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // ÖNEMLİ: Kod içindeki "react-native" çağrılarını "react-native-web"e yönlendirir.
      'react-native': 'react-native-web',
    },
    // Web uzantılarına öncelik vererek çakışmaları önler
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  },
  define: {
    // Bazı React Native kütüphaneleri "global" değişkenine ihtiyaç duyar
    global: 'window',
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.jsx', '.jsx', '.js', '.json'],
      loader: {
        '.js': 'jsx',
      },
    },
  },
});