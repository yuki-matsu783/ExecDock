import { Server } from 'http';
import WebSocket from 'ws';
import * as nodePty from 'node-pty';
import { logger } from './logger';
import { getAppVersion, VersionInfo, ClientType, isCompatibleVersion } from './shared/shared';

interface Message {
  type?: 'version_check';
  input?: string;
  output?: string;
  resize?: [number, number];
  version?: VersionInfo;
  clientType?: ClientType;
  error?: string;
}

export class TerminalServer {
  private wss: WebSocket.Server;
  private ptyProcess: nodePty.IPty | null = null;
  private clientVersions: Map<WebSocket, VersionInfo> = new Map();
  private clientTypes: Map<WebSocket, ClientType> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws) => {
      // Type assertion to access underlying socket
      const wsAny = ws as any;
      const clientAddress = wsAny._socket?.remoteAddress || 'unknown';
      logger.websocket(`Client connected - IP: ${clientAddress}`);
      
      // バージョン確認を要求
      ws.send(JSON.stringify({
        type: 'version_check',
        version: getAppVersion()
      }));

      let versionVerified = false;

      // クライアントからのメッセージを処理
      ws.on('message', (message) => {
        const msgStr = message.toString();
        logger.websocket(`Received message: ${msgStr}`);
        
        try {
          const msg: Message = JSON.parse(msgStr);

          // バージョン確認メッセージの処理
          if (msg.type === 'version_check' && msg.version && msg.clientType) {
            const serverVersion = getAppVersion();
            if (!isCompatibleVersion(msg.version, serverVersion)) {
              logger.websocket(`Version mismatch - Client: ${JSON.stringify(msg.version)}, Server: ${JSON.stringify(serverVersion)}`);
              ws.send(JSON.stringify({
                type: 'version_check',
                error: 'Version mismatch. Please update your client.'
              }));
              ws.close();
              return;
            }

            this.clientVersions.set(ws, msg.version);
            this.clientTypes.set(ws, msg.clientType);
            versionVerified = true;
            logger.websocket(`Client verified - Type: ${msg.clientType}, Version: ${JSON.stringify(msg.version)}`);

            // PTYプロセスを初期化
            if (!this.ptyProcess) {
              this.ptyProcess = this.spawnPtyProcess();
              logger.debug(`PTY process spawned with PID: ${this.ptyProcess.pid}`);
            }
            return;
          }

          // バージョン確認が済んでいない場合は他のメッセージを処理しない
          if (!versionVerified) {
            logger.websocket('Received message before version verification');
            return;
          }

          this.handleMessage(ws, msgStr);
        } catch (err) {
          logger.debug('Error processing message:', err);
        }
      });

      // クライアント切断時の処理
      ws.on('close', () => {
        logger.websocket('Client disconnected');
        this.clientVersions.delete(ws);
        this.clientTypes.delete(ws);
      });
    });
  }

  private spawnPtyProcess(): nodePty.IPty {
    const shell = process.platform === 'win32' ? 'cmd.exe' : 'zsh';
    const args = process.platform === 'win32' ? ['/K'] : [];

    logger.debug(`Spawning PTY with shell: ${shell}`);

    const pty = nodePty.spawn(shell, args, {
      name: process.platform === 'win32' ? 'cmd' : 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || process.env.USERPROFILE || process.cwd(),
      env: process.env as { [key: string]: string }
    });

    pty.onData((data) => {
      logger.terminal.output(data);
      this.broadcast({ output: data });
    });

    pty.onExit(() => {
      logger.debug('PTY process exited');
      this.ptyProcess = null;
    });

    return pty;
  }

  private handleMessage(ws: WebSocket, message: string) {
    try {
      const msg: Message = JSON.parse(message);
      
      if (!this.ptyProcess) return;

      if (msg.input) {
        logger.terminal.input(msg.input);
        this.ptyProcess.write(msg.input);
      } else if (msg.resize) {
        logger.terminal.resize(msg.resize[0], msg.resize[1]);
        this.ptyProcess.resize(msg.resize[0], msg.resize[1]);
      }
    } catch (err) {
      logger.debug('Error handling message:', err);
    }
  }

  private broadcast(message: any) {
    const messageStr = JSON.stringify(message);
    logger.websocket(`Broadcasting message: ${messageStr}`);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const clientAny = client as any;
        const clientAddress = clientAny._socket?.remoteAddress || 'unknown';
        logger.websocket(`Sending to client: ${clientAddress}`);
        client.send(messageStr);
      }
    });
  }

  public close() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
    this.wss.close();
  }
}
