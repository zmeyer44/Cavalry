import pino from 'pino';

export const logger = pino({
  name: 'cavalry-worker',
  level: process.env.CAVALRY_LOG_LEVEL ?? 'info',
});
