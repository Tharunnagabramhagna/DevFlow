import { app } from './app';
import { env } from './config/env';
import logger from './utils/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`DevFlow Backend Server started successfully on port ${env.PORT}`, {
    port: env.PORT,
    environment: env.NODE_ENV,
    clientUrl: env.CLIENT_URL,
  });
});

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, initiating graceful shutdown...`);
  server.close(() => {
    logger.info('HTTP server closed, exiting process.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded, forcing termination.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;

