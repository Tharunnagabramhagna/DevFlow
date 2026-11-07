/* Simple structured logger for DevFlow */

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), message, ...meta }));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), message, ...meta }));
  },
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { error };
    console.error(JSON.stringify({ level: 'error', timestamp: new Date().toISOString(), message, ...errorDetails, ...meta }));
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({ level: 'debug', timestamp: new Date().toISOString(), message, ...meta }));
    }
  },
};

export default logger;

