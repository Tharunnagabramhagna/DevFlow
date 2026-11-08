import { PrismaClient } from '@prisma/client';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var prismaClientSingleton: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaClientSingleton ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalThis.prismaClientSingleton = prisma;
}

export default prisma;

