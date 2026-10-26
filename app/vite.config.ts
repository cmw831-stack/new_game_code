import { defineConfig } from 'vite';

// 构筑实验室网页。规则引擎直接引用仓库根目录的 src/。
export default defineConfig({
  root: 'app',
  base: './',
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  server: { port: 5173, strictPort: true, fs: { allow: ['..'] } },
  build: { outDir: '../dist', emptyOutDir: true },
});
