interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  terminal: {
    input: boolean;
    output: boolean;
    resize: boolean;
  };
  websocket: boolean;
}

const config: LoggerConfig = {
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  terminal: {
    input: false,
    output: false, 
    resize: false
  },
  websocket: false
};

export const logger = {
  debug: (message: string, data?: any) => {
    if (config.level === 'debug') {
      console.debug(`[DEBUG] ${message}`, data);
    }
  },
  
  terminal: {
    input: (data: string) => {
      if (config.terminal.input) {
        console.debug('[TERMINAL INPUT]', data);
      }
    },
    output: (data: string) => {
      if (config.terminal.output) {
        console.debug('[TERMINAL OUTPUT]', data);
      }
    },
    resize: (cols: number, rows: number) => {
      if (config.terminal.resize) {
        console.debug(`[TERMINAL RESIZE] ${cols}x${rows}`);
      }
    }
  },
  
  websocket: (message: string, data?: any) => {
    if (config.websocket) {
      console.debug(`[WEBSOCKET] ${message}`, data);
    }
  }
};

// 開発時はすべてのログを有効にする
if (process.env.NODE_ENV === 'development') {
  config.terminal.input = true;
  config.terminal.output = true;
  config.terminal.resize = true;
  config.websocket = true;
}
