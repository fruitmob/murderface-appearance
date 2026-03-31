import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  base: './', // Relative paths for FiveM NUI
  build: {
    outDir: '../dist', // Output to web/dist/
    emptyOutDir: true,
    assetsInlineLimit: 8192,
    target: 'es2015', // Target older JS for FiveM CEF compatibility
    modulePreload: false, // Disable module preload (FiveM CEF doesn't support it)
    rollupOptions: {
      output: {
        // IIFE format — no ES modules, FiveM CEF compatible
        format: 'iife',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: undefined,
        inlineDynamicImports: true,
      }
    }
  },
  server: {
    port: 5173,
    open: false,
  }
})
