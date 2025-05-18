

// ExpressとHTTPサーバーのインポート
import express from 'express';
import http from 'http';
// WebSocketサーバーとPTY(疑似端末)のインポート
import WebSocket from 'ws';
import * as nodePty from 'node-pty'

// ExpressアプリケーションとHTTPサーバーの初期化
const app = express();
const server = new http.Server(app);

// 静的ファイル配信ディレクトリの設定
// 開発環境と本番環境で異なるディレクトリを使用
let staticDir = 'dist/client' // 本番環境用
if (process.env.NODE_ENV === "development") {
  staticDir = ".cache/dist/client"; // 開発環境用
}

// ルートパスに静的ファイル配信ミドルウェアを設定
app.use("/", express.static(staticDir));
// WebSocketサーバーの初期化
const wss = new WebSocket.Server({ server });

// WebSocket接続時のイベントハンドラ
wss.on("connection", (ws) => {
  // 新しいPTY(疑似端末)プロセスを生成
  // zshシェルを使用し、初期サイズ80x24で起動
  let pty = nodePty.spawn("zsh", [], {
    name: "xterm-color",  // ターミナルエミュレータのタイプ
    cols: 80,            // 初期カラム数
    rows: 24,            // 初期行数
    cwd: process.env.HOME as string,  // ホームディレクトリを作業ディレクトリに設定
    // env: process.env,  // 環境変数の継承(コメントアウト)
  });

  // PTYからの出力データをWebSocketクライアントに送信
  pty.onData((data) => {
    // console.log("send: %s", data);  // デバッグ用ログ(コメントアウト)
    ws.send(JSON.stringify({ output: data }));
  });

  // WebSocketクライアントからのメッセージ処理
  ws.on("message", (message) => {
    console.log("received: %s", message);  // 受信メッセージのログ
    const m = JSON.parse(message.toString());

    // 入力データの場合、PTYに書き込み
    if (m.input) {
      pty.write(m.input);
    } 
    // リサイズ要求の場合、PTYのサイズを変更
    else if (m.resize) {
      pty.resize(m.resize[0], m.resize[1]);
    }
  });
});

// サーバーを指定ポート(環境変数PORTまたはデフォルト8999)で起動
server.listen(process.env.PORT || 8999, () => {
  console.log(`Server started on ${JSON.stringify(server.address())} :)`);
});
