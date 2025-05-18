import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Viteの設定
 * - Reactプラグインを使用
 * - 開発サーバーのポートを3000に設定
 * - HMRの設定
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
  // プロダクションビルドの設定
  build: {
    outDir: 'dist',
    sourcemap: true,
    // チャンクサイズの警告しきい値
    chunkSizeWarningLimit: 1000,
  },
});
