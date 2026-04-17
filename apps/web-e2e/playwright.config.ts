import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');

const WEB_PORT = Number(process.env.CAVALRY_E2E_WEB_PORT ?? 3100);
const GATEWAY_PORT = Number(process.env.CAVALRY_E2E_GATEWAY_PORT ?? 3101);
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://cavalry:cavalry@localhost:5432/cavalry_e2e';
const WEB_URL = `http://localhost:${WEB_PORT}`;
const GATEWAY_URL = `http://localhost:${GATEWAY_PORT}`;
const STORAGE_DIR =
  process.env.CAVALRY_STORAGE_LOCAL_DIR ??
  resolve(HERE, '.cavalry-e2e-storage');

const sharedEnv: Record<string, string> = {
  CAVALRY_ENV: 'test',
  CAVALRY_LOG_LEVEL: process.env.CAVALRY_LOG_LEVEL ?? 'warn',
  DATABASE_URL,
  CAVALRY_WEB_URL: WEB_URL,
  CAVALRY_GATEWAY_URL: GATEWAY_URL,
  CAVALRY_STORAGE_PROVIDER: 'local',
  CAVALRY_STORAGE_LOCAL_DIR: STORAGE_DIR,
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    'e2e-secret-at-least-32-characters-long-xxxxx',
  BETTER_AUTH_URL: WEB_URL,
  NEXT_PUBLIC_APP_URL: WEB_URL,
  NODE_ENV: 'test',
};

process.env.DATABASE_URL = DATABASE_URL;
process.env.CAVALRY_WEB_URL = WEB_URL;
process.env.CAVALRY_GATEWAY_URL = GATEWAY_URL;
process.env.CAVALRY_STORAGE_LOCAL_DIR = STORAGE_DIR;

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './support/global-setup.ts',
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // `next start` (vs `next dev`) is used so the e2e suite can run alongside
      // a local dev server on port 3000 without tripping Next 16's single-dev-
      // server-per-directory lock. Requires a prior `pnpm --filter @cavalry/web build`.
      command: `pnpm --filter @cavalry/web exec next start --port ${WEB_PORT}`,
      cwd: REPO_ROOT,
      url: `${WEB_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: sharedEnv,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter @cavalry/gateway start',
      cwd: REPO_ROOT,
      url: `${GATEWAY_URL}/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { ...sharedEnv, CAVALRY_GATEWAY_PORT: String(GATEWAY_PORT) },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
