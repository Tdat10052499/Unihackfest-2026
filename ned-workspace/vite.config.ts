import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// N.E.D Workspace (workspace-plan W1). @ned/core is TypeScript source from the pnpm workspace; Vite compiles it.
// web3.js / Anchor expect a global Buffer: src/polyfill.ts sets it before anything else loads.
export default defineConfig({
  plugins: [react()],
  define: {
    // Some Solana libraries read process.env.NODE_DEBUG / global; give them browser-safe values.
    'process.env.NODE_DEBUG': 'undefined',
    global: 'globalThis',
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  preview: { port: 4173, strictPort: true },
  server: { port: 5173, strictPort: true },
});
