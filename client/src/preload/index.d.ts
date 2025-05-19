import { ElectronAPI } from '@electron-toolkit/preload'

// Terminal API exposed to renderer process
interface TerminalAPI {
  write: (data: string) => void
  executeCommand: (command: string) => void
  resize: (cols: number, rows: number) => void
  onData: (callback: (data: string) => void) => () => void
  isElectron: () => boolean
}

// Custom APIs for renderer
interface API {
  terminal: TerminalAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
