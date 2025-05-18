
#!/bin/bash

# 初期設定: 開発環境モードに設定
export NODE_ENV=development
# 開発用キャッシュディレクトリを削除
rm -r .cache

# フロントエンドビルド
echo "開発環境用フロントエンドビルドを開始します..."
cd client 
vite build  # Viteを使用してクライアント側をビルド
cd ../

# バックエンドビルド
echo "開発環境用バックエンドビルドを開始します..."
esbuild ./server/main.ts \
 --platform=node \  # Node.jsプラットフォーム向けにビルド
 --minify \        # コードを最小化
 --format=cjs \    # CommonJS形式で出力
 --outfile=./.cache/dist/main.js  # 開発用キャッシュディレクトリに出力

# 開発サーバー起動
echo "開発サーバーを起動します..."
node ./.cache/dist/main.js
