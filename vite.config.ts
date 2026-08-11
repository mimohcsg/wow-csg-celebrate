import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build can be uploaded to SharePoint Site Assets.
export default defineConfig({
  plugins: [react()],
  base: './',
})
