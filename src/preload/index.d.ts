import { ElectronAPI } from '@electron-toolkit/preload'

// Terminal API exposed to renderer process
interface TerminalAPI {
  write: (data: string) => void
  executeCommand: (command: string) => void
  resize: (cols: number, rows: number) => void
  onData: (callback: (data: string) => void) => () => void
  isElectron: () => boolean
}

// Runtime API exposed to renderer process
interface RuntimeAPI {
  executeNode: (args: string) => Promise<boolean>
  executePython: (args: string) => Promise<boolean>
  checkAvailability: (type: 'node' | 'python') => Promise<boolean>
}

// Custom APIs for renderer
interface API {
  terminal: TerminalAPI
  runtime: RuntimeAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
