import { Server } from 'http';
import WebSocket from 'ws';
import * as nodePty from 'node-pty';
import { app } from 'electron';

interface TerminalCommand {
  type: 'terminal';
  input?: string;
  resize?: [number, number];
}

interface NativeCommand {
  type: 'native';
  action: string;
  payload?: any;
}

type Command = TerminalCommand | NativeCommand;

export class TerminalServer {
  private wss: WebSocket.Server;
  private ptyProcess: nodePty.IPty | null = null;
  private isElectron: boolean;

  constructor(server: Server, isElectron: boolean = false) {
    this.isElectron = isElectron;
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');

      // Initialize PTY process
      if (!this.ptyProcess) {
        this.ptyProcess = this.spawnPtyProcess();
      }

      // Handle messages from client
      ws.on('message', (message) => {
        this.handleMessage(ws, message.toString());
      });

      // Handle client disconnection
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }

  private spawnPtyProcess(): nodePty.IPty {
    const shell = process.platform === 'win32' ? 'cmd.exe' : 'zsh';
    const args = process.platform === 'win32' ? ['/K'] : [];

    console.log(`Spawning PTY with shell: ${shell}`);

    const pty = nodePty.spawn(shell, args, {
      name: process.platform === 'win32' ? 'cmd' : 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || process.env.USERPROFILE || process.cwd(),
      env: process.env as { [key: string]: string }
    });

    pty.onData((data) => {
      this.broadcast({ type: 'terminal', output: data });
    });

    pty.onExit(() => {
      console.log('PTY process exited');
      this.ptyProcess = null;
    });

    return pty;
  }

  private handleMessage(ws: WebSocket, message: string) {
    try {
      const command: Command = JSON.parse(message);

      switch (command.type) {
        case 'terminal':
          this.handleTerminalCommand(command);
          break;
        case 'native':
          if (this.isElectron) {
            this.handleNativeCommand(ws, command);
          }
          break;
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  }

  private handleTerminalCommand(command: TerminalCommand) {
    if (!this.ptyProcess) return;

    if (command.input) {
      this.ptyProcess.write(command.input);
    } else if (command.resize) {
      this.ptyProcess.resize(command.resize[0], command.resize[1]);
    }
  }

  private async handleNativeCommand(ws: WebSocket, command: NativeCommand) {
    if (!this.isElectron) return;

    try {
      let result;
      switch (command.action) {
        // Native API handlers will be added here
        default:
          throw new Error(`Unknown native action: ${command.action}`);
      }

      ws.send(JSON.stringify({
        type: 'native_result',
        action: command.action,
        data: result
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      ws.send(JSON.stringify({
        type: 'native_error',
        action: command.action,
        error: errorMessage
      }));
    }
  }

  private broadcast(message: any) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
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
