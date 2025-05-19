# ExecDock

ExecDockは、React+MUIベースのデスクトップターミナルアプリケーションです。xterm.jsとnode-ptyを組み合わせることで、ネイティブに近いターミナル体験を提供します。また、カスタマイズ可能なコマンドパネルを備えており、頻繁に使用するコマンドを簡単に実行できます。Electronを利用して、クロスプラットフォームのデスクトップアプリケーションとして動作します。

## 特徴

- 🖥️ 分割画面UI（コマンドパネル + ターミナル）
- 🎯 カスタマイズ可能なコマンドボタン
- 📏 ドラッグでサイズ調整可能なパネル
- ⚡ リアルタイム双方向通信
- 📱 レスポンシブな画面サイズ調整
- 🔍 ターミナル内テキスト検索機能
- 🔤 Unicode 11のサポート
- 🔗 URLの自動リンク化
- 💻 クロスプラットフォーム対応（macOS, Windows, Linux）

## 必要要件

- Node.js 20.x以上
- pnpm

## インストール方法

```bash
# メインアプリケーションの依存関係をインストール
pnpm install
```

## 使い方

### 開発モード

Electronアプリケーションを起動:
```bash
pnpm dev
```

Web版をフルスタックで起動（フロントエンド + バックエンド）:
```bash
# サーバー側の依存関係をインストール（必須）
cd src/server
pnpm install
cd ../..

# node-pty モジュールを再ビルド
pnpm rebuildpnpm web:full-dev
```

個別に起動する場合:
```bash
# バックエンド（サーバー）のみ
pnpm server:dev

# Web版フロントエンドのみ
pnpm web:dev
```

**注意**: サーバーを起動する前に、 `src/server` ディレクトリで `pnpm install` を実行してください。

### プロダクションビルド

```bash
# Electronアプリケーションをビルド
pnpm build

# Web版をビルド
pnpm web:build
pnpm server:build
```

### アプリケーションのパッケージング

```bash
# Windows向けビルド
pnpm build:win

# macOS向けビルド
pnpm build:mac

# Linux向けビルド
pnpm build:linux

# 全プラットフォーム向けビルド
pnpm build:all
```

これにより、`dist`ディレクトリに各プラットフォーム向けの実行可能ファイルが生成されます。

## 機能詳細

### コマンドパネル
- 左パネルに階層構造でコマンドを表示
- カテゴリは自動的にアコーディオンで折りたたみ可能
- お気に入り機能（スターアイコンで登録）
  - お気に入りは上部にまとめて表示
  - 登録順でソート
- 全展開/全折りたたみボタン
- 編集モード切り替え可能
- MUIコンポーネントによるリッチなUI
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

### IPC通信
- Electron IPCを使用したプロセス間通信
- メインプロセスとレンダラープロセス間の効率的なデータ転送
- 自動的なターミナルサイズ同期
- エラー発生時の適切なハンドリングと復旧処理

## コマンド定義仕様

### コマンドYAMLフォーマット
```yaml
version: "1.0"
commands:
  - id: unique-id
    label: カテゴリラベル
    children:  # コマンド/サブカテゴリ
      - id: command
        label: コマンドラベル
        command: "コマンド文字列"  # 改行なし
        executionType: immediate  # immediate(即時実行) or input_required(入力待ち)
        description: |-  # マルチライン説明
          コマンドの詳細説明
          オプションや使用例など
```

### コマンドタイプ
- `immediate`: ボタンクリックで即時実行（自動で改行追加）
- `input_required`: パラメータ入力待ち（ユーザーがEnterを押すまで実行しない）

### コマンド編集
- 編集モーダルでYAML形式で編集可能
  - 階層構造は自動的にアコーディオンで表示
  - お気に入り設定も編集可能
- インポート/エクスポート機能
- localStorageに自動保存
- お気に入り機能:
  - スターアイコンで登録/解除
  - 登録順で自動ソート
  - 専用セクションに表示

## 技術スタック

### フロントエンド
- React 19.1.0: UIライブラリ
- Material-UI (MUI) 7.1.0: UIコンポーネント
- react-resizable-panels 3.0.2: パネル分割UI
- @xterm/xterm 5.5.0: ターミナルエミュレーション
  - @xterm/addon-fit 0.10.0: サイズ自動調整
  - @xterm/addon-search 0.15.0: テキスト検索
  - @xterm/addon-web-links 0.11.0: URLリンク化
  - @xterm/addon-unicode11 0.8.0: Unicode対応
  - @xterm/addon-serialize 0.13.0: 状態シリアライズ
- TypeScript 5.3.3: 型付き言語
- Vite 6.2.6: ビルドツール
- Electron 34.5.4: デスクトップアプリケーションフレームワーク
- yaml 2.8.0: YAML形式の処理

### バックエンド
- node-pty 1.0.0: プロセス制御
- Express 4.18.2: Webサーバーフレームワーク
- WebSocket (ws) 8.16.0: リアルタイム双方向通信
- Electron IPC: プロセス間通信
- マルチランタイムサポート:
  - Node.js: スクリプト実行
  - Python: スクリプト実行

## 参考リンク

- [@xterm/xterm](https://github.com/xtermjs/xterm.js)
- [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)
- [Material-UI (MUI)](https://mui.com/)
- [Electron](https://www.electronjs.org/)
- [node-pty](https://github.com/microsoft/node-pty)
- [WebSocket](https://github.com/websockets/ws)
