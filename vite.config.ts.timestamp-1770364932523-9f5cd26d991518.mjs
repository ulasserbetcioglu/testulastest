// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 1. React Native kodlarını web uyumlu hale getirir
      "react-native": "react-native-web",
      // 2. Mobil ikon kütüphanesini web ikon kütüphanesine yönlendirir
      "lucide-react-native": "lucide-react"
    },
    // Web uzantılarına öncelik ver
    extensions: [".web.tsx", ".web.ts", ".web.jsx", ".web.js", ".tsx", ".ts", ".jsx", ".js"]
  },
  define: {
    // Bazı kütüphaneler için global değişkeni
    global: "window"
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx"
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgLy8gMS4gUmVhY3QgTmF0aXZlIGtvZGxhclx1MDEzMW5cdTAxMzEgd2ViIHV5dW1sdSBoYWxlIGdldGlyaXJcbiAgICAgICdyZWFjdC1uYXRpdmUnOiAncmVhY3QtbmF0aXZlLXdlYicsXG4gICAgICBcbiAgICAgIC8vIDIuIE1vYmlsIGlrb24ga1x1MDBGQ3RcdTAwRkNwaGFuZXNpbmkgd2ViIGlrb24ga1x1MDBGQ3RcdTAwRkNwaGFuZXNpbmUgeVx1MDBGNm5sZW5kaXJpclxuICAgICAgJ2x1Y2lkZS1yZWFjdC1uYXRpdmUnOiAnbHVjaWRlLXJlYWN0JyxcbiAgICB9LFxuICAgIC8vIFdlYiB1emFudFx1MDEzMWxhclx1MDEzMW5hIFx1MDBGNm5jZWxpayB2ZXJcbiAgICBleHRlbnNpb25zOiBbJy53ZWIudHN4JywgJy53ZWIudHMnLCAnLndlYi5qc3gnLCAnLndlYi5qcycsICcudHN4JywgJy50cycsICcuanN4JywgJy5qcyddLFxuICB9LFxuICBkZWZpbmU6IHtcbiAgICAvLyBCYXpcdTAxMzEga1x1MDBGQ3RcdTAwRkNwaGFuZWxlciBpXHUwMEU3aW4gZ2xvYmFsIGRlXHUwMTFGaVx1MDE1RmtlbmlcbiAgICBnbG9iYWw6ICd3aW5kb3cnLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgbG9hZGVyOiB7XG4gICAgICAgICcuanMnOiAnanN4JyxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUdsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBO0FBQUEsTUFFTCxnQkFBZ0I7QUFBQTtBQUFBLE1BR2hCLHVCQUF1QjtBQUFBLElBQ3pCO0FBQUE7QUFBQSxJQUVBLFlBQVksQ0FBQyxZQUFZLFdBQVcsWUFBWSxXQUFXLFFBQVEsT0FBTyxRQUFRLEtBQUs7QUFBQSxFQUN6RjtBQUFBLEVBQ0EsUUFBUTtBQUFBO0FBQUEsSUFFTixRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osZ0JBQWdCO0FBQUEsTUFDZCxRQUFRO0FBQUEsUUFDTixPQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
