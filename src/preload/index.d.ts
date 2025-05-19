import { ElectronAPI } from '@electron-toolkit/preload'

// Terminal API exposed to renderer process
interface TerminalAPI {
  write: (data: string) => void
  executeCommand: (command: string) => void
  resize: (cols: number, rows: number) => void
  onData: (callback: (data: string) => void) => () => void
  isElectron: boolean
}

// Runtime API exposed to renderer process
interface RuntimeAPI {
  executeNode: (args: string) => Promise<boolean>
  executePython: (args: string) => Promise<boolean>
  checkAvailability: (type: 'node' | 'python') => Promise<boolean>
}

// File System API
interface FileSystemAPI {
  getCurrentDirectory: () => Promise<string>
  listDirectory: (path: string) => Promise<Array<{ name: string, isDirectory: boolean, path: string }>>
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<boolean>
  exists: (path: string) => Promise<boolean>
}

// Custom APIs for renderer
interface API {
  terminal: TerminalAPI
  runtime: RuntimeAPI
  fileSystem: FileSystemAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
