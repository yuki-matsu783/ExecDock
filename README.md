# ExecDock

ExecDockは、Webブラウザ上で動作する高機能なターミナルエミュレータです。xterm.jsとnode-ptyを組み合わせることで、ネイティブに近いターミナル体験を提供します。

## 特徴

- 🌐 ブラウザベースのターミナルエミュレーション
- ⚡ リアルタイムな双方向通信
- 📱 レスポンシブな画面サイズ調整
- 🔍 テキスト検索機能
- 🔤 Unicode 11のサポート
- 🔗 URLの自動リンク化

## 必要要件

- Node.js
- pnpm

## インストール方法

```bash
pnpm install
```

## 使い方

### 開発モード

```bash
pnpm run dev
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

## 技術スタック

- xterm.js: ターミナルエミュレーション
- node-pty: プロセス制御
- WebSocket: リアルタイム通信
- Express: Webサーバー

## 参考リンク

- [xterm.js](https://github.com/xtermjs/xterm.js)
- [webssh](https://github.com/dews/webssh)
- [node-pty xterm.js websocket を利用したブラウザで動くShellの作成](https://tech-blog.s-yoshiki.com/entry/294)
