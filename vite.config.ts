import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Bu satır React Native kodlarını web'de çalışır hale getirir
      'react-native': 'react-native-web',
    },
  },
  // Global nesne tanımlaması (bazen ikon kütüphaneleri için gerekir)
  define: {
    global: 'window',
  },
});