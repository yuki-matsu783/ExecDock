import { contextBridge } from 'electron'

// Minimal context bridge for WebSocket configuration
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('websocket', {
      // Add any WebSocket specific configurations if needed
    })
  } catch (error) {
    console.error('Failed to expose WebSocket config:', error)
  }
}
