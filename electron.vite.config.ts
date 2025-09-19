import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { sourcemap: true }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { sourcemap: true }
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    build: { sourcemap: true }
  }
})

