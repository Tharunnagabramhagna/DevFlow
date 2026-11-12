import { app } from './app';
import { env } from './config/env';
import { checkDatabaseHealth, disconnectDatabase } from './config/database';
import logger from './utils/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`DevFlow Backend Server started successfully on port ${env.PORT}`, {
    port: env.PORT,
    environment: env.NODE_ENV,
    clientUrl: env.CLIENT_URL,
  });

  void checkDatabaseHealth().then((healthy) => {
    if (healthy) {
      logger.info('PostgreSQL database connection verified');
    } else {
      logger.warn(
        'PostgreSQL database is unreachable at startup; auth and data endpoints will return 503 until the database is running.'
      );
    }
  });
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, initiating graceful shutdown...`);
  server.close(async () => {
    try {
      await disconnectDatabase();
      logger.info('Database disconnected.');
    } catch (err) {
      logger.error('Error disconnecting database during shutdown', { err });
    }
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

