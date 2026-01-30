const path = require('path');
const react = require('@vitejs/plugin-react');
const { defineConfig } = require('vite');

module.exports = defineConfig({
  root: path.resolve(__dirname, 'src', 'renderer'),
  publicDir: path.resolve(__dirname, 'public'),
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: path.resolve(__dirname, 'dist', 'renderer'),
    emptyOutDir: true
  }
});
