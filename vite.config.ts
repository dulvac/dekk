import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { vitePluginDevWrite } from './vite-plugin-dev-write'

export default defineConfig({
  plugins: [react(), vitePluginDevWrite()],
  resolve: {
    alias: {
      'shared': path.resolve(__dirname, 'shared'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-mermaid': ['mermaid'],
          'vendor-shiki': ['shiki', '@shikijs/transformers'],
          'vendor-codemirror': ['@uiw/react-codemirror', '@codemirror/lang-markdown', '@codemirror/view'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    css: true,
    exclude: ['e2e/**', 'node_modules/**', '.claude/worktrees/**', '.worktrees/**'],
  },
})
