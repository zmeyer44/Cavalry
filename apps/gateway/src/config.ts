import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(here, '../../../.env') });

export const config = {
  env: process.env.CAVALRY_ENV ?? 'development',
  port: Number(process.env.CAVALRY_GATEWAY_PORT ?? 3001),
  maxArtifactSize: Number(process.env.CAVALRY_GATEWAY_MAX_ARTIFACT_SIZE ?? 52_428_800),
  logLevel: process.env.CAVALRY_LOG_LEVEL ?? 'info',
};
