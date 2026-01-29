import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@vue-office')) return 'vue-office'
          if (id.includes('pdfjs-dist')) return 'pdfjs'
          if (id.includes('xlsx')) return 'xlsx'
          if (id.includes('mammoth')) return 'mammoth'
          if (id.includes('fast-xml-parser')) return 'fxp'
          if (id.includes('js-yaml')) return 'js-yaml'
          return 'vendor'
        },
      },
    },
  },
})
