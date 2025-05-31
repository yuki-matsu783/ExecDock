import { Server } from 'http';
import WebSocket from 'ws';
import * as nodePty from 'node-pty';
import { logger } from './logger';

interface Message {
  input?: string;
  output?: string;
  resize?: [number, number];
}

export class TerminalServer {
  private wss: WebSocket.Server;
  private ptyProcess: nodePty.IPty | null = null;

  constructor(server: Server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws) => {
      // Type assertion to access underlying socket
      const wsAny = ws as any;
      const clientAddress = wsAny._socket?.remoteAddress || 'unknown';
      logger.websocket(`Client connected - IP: ${clientAddress}`);
      
      // Initialize PTY process
      if (!this.ptyProcess) {
        this.ptyProcess = this.spawnPtyProcess();
        logger.debug(`PTY process spawned with PID: ${this.ptyProcess.pid}`);
      }

      // Handle messages from client
      ws.on('message', (message) => {
        logger.websocket(`Received message: ${message.toString()}`);
        this.handleMessage(ws, message.toString());
      });

      // Handle client disconnection
      ws.on('close', () => {
        logger.websocket('Client disconnected');
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
