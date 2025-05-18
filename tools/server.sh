
#!/bin/bash

# 初期設定: 本番環境モードに設定
export NODE_ENV=prod
# キャッシュ削除(必要に応じてコメントアウトを解除)
# rm -r .cache

# フロントエンドビルド
echo "フロントエンドのビルドを開始します..."
cd client 
vite build  # Viteを使用してクライアント側をビルド
cd ../

# バックエンドビルド
echo "バックエンドのビルドを開始します..."
esbuild ./server/main.ts \
 --platform=node \  # Node.jsプラットフォーム向けにビルド
 --minify \        # コードを最小化
 --format=cjs \    # CommonJS形式で出力
 --outfile=./dist/main.js  # 出力ファイルパス

echo "ビルドが完了しました"
