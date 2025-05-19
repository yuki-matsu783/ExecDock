import { useState, useCallback, useEffect } from 'react';
import { useTerminal } from '../contexts/TerminalContext';

// File system item interface
export interface FileSystemItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

/**
 * Hook for file system operations that works with both Electron and web versions
 */
export const useFileSystem = () => {
  const { isElectron, ws } = useTerminal();
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  
  // Get current directory
  const getCurrentDirectory = useCallback(async (): Promise<string> => {
    if (isElectron && window.api?.fileSystem) {
      // Electron version
      const dir = await window.api.fileSystem.getCurrentDirectory();
      setCurrentDirectory(dir);
      return dir;
    } else if (ws) {
      // Web version using WebSocket
      return new Promise<string>((resolve) => {
        const messageHandler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.fileSystem && data.fileSystem.currentDirectory) {
              ws.removeEventListener('message', messageHandler);
              setCurrentDirectory(data.fileSystem.currentDirectory);
              resolve(data.fileSystem.currentDirectory);
            } else if (data.fileSystem && data.fileSystem.error) {
              ws.removeEventListener('message', messageHandler);
              console.error(data.fileSystem.error);
              resolve('');
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.addEventListener('message', messageHandler);
        ws.send(JSON.stringify({ fileSystem: { getCurrentDirectory: true } }));
        
        // Timeout after 5 seconds
        setTimeout(() => {
          ws.removeEventListener('message', messageHandler);
          resolve('');
        }, 5000);
      });
    }
    
    return '';
  }, [isElectron, ws]);
  
  // List directory contents
  const listDirectory = useCallback(async (dirPath: string): Promise<FileSystemItem[]> => {
    if (isElectron && window.api?.fileSystem) {
      // Electron version
      return await window.api.fileSystem.listDirectory(dirPath);
    } else if (ws) {
      // Web version using WebSocket
      return new Promise<FileSystemItem[]>((resolve) => {
        const messageHandler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.fileSystem && data.fileSystem.directoryContents) {
              ws.removeEventListener('message', messageHandler);
              resolve(data.fileSystem.directoryContents);
            } else if (data.fileSystem && data.fileSystem.error) {
              ws.removeEventListener('message', messageHandler);
              console.error(data.fileSystem.error);
              resolve([]);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.addEventListener('message', messageHandler);
        ws.send(JSON.stringify({ fileSystem: { listDirectory: dirPath } }));
        
        // Timeout after 5 seconds
        setTimeout(() => {
          ws.removeEventListener('message', messageHandler);
          resolve([]);
        }, 5000);
      });
    }
    
    return [];
  }, [isElectron, ws]);
  
  // Read file content
  const readFile = useCallback(async (filePath: string): Promise<string> => {
    if (isElectron && window.api?.fileSystem) {
      // Electron version
      return await window.api.fileSystem.readFile(filePath);
    } else if (ws) {
      // Web version using WebSocket
      return new Promise<string>((resolve) => {
        const messageHandler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.fileSystem && data.fileSystem.fileContent !== undefined) {
              ws.removeEventListener('message', messageHandler);
              resolve(data.fileSystem.fileContent);
            } else if (data.fileSystem && data.fileSystem.error) {
              ws.removeEventListener('message', messageHandler);
              console.error(data.fileSystem.error);
              resolve('');
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.addEventListener('message', messageHandler);
        ws.send(JSON.stringify({ fileSystem: { readFile: filePath } }));
        
        // Timeout after 5 seconds
        setTimeout(() => {
          ws.removeEventListener('message', messageHandler);
          resolve('');
        }, 5000);
      });
    }
    
    return '';
  }, [isElectron, ws]);
  
  // Write file content
  const writeFile = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    if (isElectron && window.api?.fileSystem) {
      // Electron version
      return await window.api.fileSystem.writeFile(filePath, content);
    } else if (ws) {
      // Web version using WebSocket
      return new Promise<boolean>((resolve) => {
        const messageHandler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.fileSystem && data.fileSystem.writeSuccess !== undefined) {
              ws.removeEventListener('message', messageHandler);
              resolve(data.fileSystem.writeSuccess);
            } else if (data.fileSystem && data.fileSystem.error) {
              ws.removeEventListener('message', messageHandler);
              console.error(data.fileSystem.error);
              resolve(false);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.addEventListener('message', messageHandler);
        ws.send(JSON.stringify({ 
          fileSystem: { 
            writeFile: { 
              path: filePath, 
              content 
            } 
          } 
        }));
        
        // Timeout after 5 seconds
        setTimeout(() => {
          ws.removeEventListener('message', messageHandler);
          resolve(false);
        }, 5000);
      });
    }
    
    return false;
  }, [isElectron, ws]);
  
  // Check if file/directory exists
  const fileExists = useCallback(async (filePath: string): Promise<boolean> => {
    if (isElectron && window.api?.fileSystem) {
      // Electron version
      return await window.api.fileSystem.exists(filePath);
    } else if (ws) {
      // Web version using WebSocket
      return new Promise<boolean>((resolve) => {
        const messageHandler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.fileSystem && data.fileSystem.exists !== undefined) {
              ws.removeEventListener('message', messageHandler);
              resolve(data.fileSystem.exists);
            } else if (data.fileSystem && data.fileSystem.error) {
              ws.removeEventListener('message', messageHandler);
              console.error(data.fileSystem.error);
              resolve(false);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.addEventListener('message', messageHandler);
        ws.send(JSON.stringify({ fileSystem: { exists: filePath } }));
        
        // Timeout after 5 seconds
        setTimeout(() => {
          ws.removeEventListener('message', messageHandler);
          resolve(false);
        }, 5000);
      });
    }
    
    return false;
  }, [isElectron, ws]);
  
  // Initialize the current directory
  useEffect(() => {
    getCurrentDirectory().catch(console.error);
  }, [getCurrentDirectory]);
  
  return {
    currentDirectory,
    getCurrentDirectory,
    listDirectory,
    readFile,
    writeFile,
    fileExists
  };
};

export default useFileSystem;