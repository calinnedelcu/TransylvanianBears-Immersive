import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 950,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/') || id.includes('/node_modules/@react-three/')) return 'three-runtime';
          if (id.includes('/node_modules/gsap/')) return 'motion-runtime';
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'react-runtime';
          return undefined;
        },
      },
    },
  },
})
