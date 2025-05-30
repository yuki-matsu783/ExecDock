import 'dotenv/config';

/**
 * バージョン情報の型定義
 */
export interface VersionInfo {
  major: number;    // 破壊的変更
  minor: number;    // 後方互換性のある新機能
  patch: number;    // バグ修正
}

/**
 * クライアントの種類を定義
 */
export type ClientType = 'web' | 'electron';

/**
 * バージョン確認メッセージの型定義
 */
export interface VersionCheckMessage {
  type: 'version_check';
  version: VersionInfo;
  clientType: ClientType;
}

/**
 * 環境変数からアプリケーションのバージョン情報を取得
 * @returns バージョン情報
 */
export function getAppVersion(): VersionInfo {
  const versionStr = process.env.VITE_APP_VERSION || '0.0.0';
  const [major, minor, patch] = versionStr.split('.').map(Number);
  
  // 不正なバージョン形式のチェック
  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    console.error(`Invalid version format in environment variable: ${versionStr}`);
    return { major: 0, minor: 0, patch: 0 };
  }

  return { major, minor, patch };
}

/**
 * バージョンの互換性をチェック
 * @param client クライアントのバージョン情報
 * @param server サーバーのバージョン情報
 * @returns 互換性があればtrue、なければfalse
 */
export function isCompatibleVersion(client: VersionInfo, server: VersionInfo): boolean {
  // メジャーバージョンは完全一致が必要
  if (client.major !== server.major) return false;
  // クライアントのマイナーバージョンはサーバー以上である必要がある
  if (client.minor < server.minor) return false;
  return true;
}
