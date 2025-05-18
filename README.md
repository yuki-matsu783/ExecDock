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
pnpm installall  # フロントエンド・バックエンド両方の依存関係をインストール
```

## 使い方

### 開発モード

両方のサーバーを同時に起動:
```bash
pnpm devall
```

または個別に起動:
```bash
# バックエンドのみ（ホットリロード対応）
pnpm dev

# フロントエンドのみ（Electronアプリケーション）
pnpm client:dev
```

### プロダクションビルド

```bash
pnpm run build
```

### アプリケーションのパッケージング

```bash
cd client && pnpm build
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
- React 18.2: UIライブラリ
- Material-UI (MUI) 7.1: UIコンポーネント
- react-resizable-panels 2.0: パネル分割UI
- @xterm/xterm 5.5.0: ターミナルエミュレーション
  - @xterm/addon-fit 0.10.0: サイズ自動調整
  - @xterm/addon-search 0.15.0: テキスト検索
  - @xterm/addon-web-links 0.11.0: URLリンク化
  - @xterm/addon-unicode11 0.8.0: Unicode対応
  - @xterm/addon-serialize 0.13.0: 状態シリアライズ
- TypeScript 5.8.3: 型システム
- Vite 6.3.5: ビルドツール
- Electron: デスクトップアプリケーションフレームワーク

### バックエンド
- node-pty 1.0.0: プロセス制御
- Electron IPC: プロセス間通信

## 参考リンク

- [@xterm/xterm](https://github.com/xtermjs/xterm.js)
- [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)
- [Material-UI (MUI)](https://mui.com/)
- [Electron](https://www.electronjs.org/)
- [node-pty](https://github.com/microsoft/node-pty)
