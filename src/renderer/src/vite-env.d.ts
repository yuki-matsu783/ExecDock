/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * アプリケーションのバージョン
   * 形式: メジャー.マイナー.パッチ (例: 1.0.0)
   */
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
