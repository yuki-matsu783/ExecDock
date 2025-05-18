import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Web向けVite設定
 * - Reactプラグインを使用
 * - 開発サーバーのポートを3000に設定
 * - HMRの設定
 */
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.yaml'],
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src')
    }
  },
  server: {
    port: 3000,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
  // プロダクションビルドの設定
  build: {
    outDir: 'dist/web',
    sourcemap: true,
    // チャンクサイズの警告しきい値
    chunkSizeWarningLimit: 1000,
  },
  root: 'src/renderer',
});