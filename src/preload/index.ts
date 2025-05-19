import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Terminal related APIs
  terminal: {
    // Send data to PTY process
    write: (data: string) => ipcRenderer.send('terminal:write', data),
    
    // Execute command in terminal
    executeCommand: (command: string) => ipcRenderer.send('terminal:execute', command),
    
    // Resize terminal
    resize: (cols: number, rows: number) => ipcRenderer.send('terminal:resize', { cols, rows }),
    
    // Listen for terminal data
    onData: (callback: (data: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
      ipcRenderer.on('terminal:data', listener)
      return () => ipcRenderer.removeListener('terminal:data', listener)
    },
    
    // Check if running in Electron
    isElectron: () => true
  },
  
  // Runtime related APIs
  runtime: {
    // Execute a Node.js command/script
    executeNode: (args: string) => ipcRenderer.invoke('runtime:node', args),
    
    // Execute a Python command/script
    executePython: (args: string) => ipcRenderer.invoke('runtime:python', args),
    
    // Check if a runtime is available
    checkAvailability: (type: 'node' | 'python') => ipcRenderer.invoke('runtime:check', type)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
