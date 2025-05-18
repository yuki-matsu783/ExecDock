# ExecDock

ExecDockは、React+MUIベースのWebターミナルアプリケーションです。xterm.jsとnode-ptyを組み合わせることで、ネイティブに近いターミナル体験を提供します。また、カスタマイズ可能なコマンドパネルを備えており、頻繁に使用するコマンドを簡単に実行できます。

## 特徴

- 🖥️ 分割画面UI（コマンドパネル + ターミナル）
- 🎯 カスタマイズ可能なコマンドボタン
- 📏 ドラッグでサイズ調整可能なパネル
- 🌐 ブラウザベースのターミナルエミュレーション
- ⚡ WebSocketによるリアルタイム双方向通信
- 📱 レスポンシブな画面サイズ調整
- 🔍 ターミナル内テキスト検索機能
- 🔤 Unicode 11のサポート
- 🔗 URLの自動リンク化
- 🔄 自動再接続機能
- 🎨 カスタマイズ可能なカラーテーマ
- 📊 最適化されたリサイズ処理

## 必要要件

- Node.js 20.x以上
- pnpm

## インストール方法

```bash
pnpm install
```

## 使い方

### 開発モード

1. クライアント開発サーバーの起動 (http://localhost:3000)
```bash
cd client && pnpm dev
```

2. バックエンドサーバーの起動 (WebSocket: ws://localhost:8999)
```bash
pnpm dev
```

### プロダクションビルド

```bash
pnpm run build
```

### プロダクション実行

```bash
pnpm run serve
```

ブラウザで http://localhost:8999 を開いてください。

## 機能詳細

### コマンドパネル
- 左パネルにコマンドボタンを表示
- カテゴリー別のグループ化
- MUIコンポーネントによるスタイリング
- クリックでターミナルにコマンド入力

### ターミナル
- xterm.jsベースのターミナルエミュレーション
- リアルタイムな入出力表示
- コピー＆ペースト対応
- テキスト検索機能
- URLの自動リンク化
- Unicode 11対応
- サイズ自動調整
- カスタマイズ可能なフォントとカラー

### WebSocket通信
- 安定した双方向通信
- 自動再接続（最大5回試行）
- 指数バックオフによる再接続
- 効率的なデータ転送

## 技術スタック

### フロントエンド
- React 18.2: UIライブラリ
- Material-UI (MUI) 5.15: UIコンポーネント
- react-resizable-panels 2.0: パネル分割UI
- @xterm/xterm 5.5.0: ターミナルエミュレーション
  - @xterm/addon-fit 0.10.0: サイズ自動調整
  - @xterm/addon-search 0.15.0: テキスト検索
  - @xterm/addon-web-links 0.11.0: URLリンク化
  - @xterm/addon-unicode11 0.8.0: Unicode対応
  - @xterm/addon-serialize 0.13.0: 状態シリアライズ
- TypeScript 5.8.3: 型システム
- Vite 6.3.5: ビルドツール

### バックエンド
- Express 5.1.0: Webサーバー
- node-pty 1.0.0: プロセス制御
- ws 8.11.0: WebSocket通信
- esbuild 0.25.4: バンドルツール

## 参考リンク

- [@xterm/xterm](https://github.com/xtermjs/xterm.js)
- [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)
- [Material-UI (MUI)](https://mui.com/)
- [webssh](https://github.com/dews/webssh)
- [node-pty xterm.js websocket を利用したブラウザで動くShellの作成](https://tech-blog.s-yoshiki.com/entry/294)
