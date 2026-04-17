import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');

const WEB_PORT = Number(process.env.CAVALRY_E2E_WEB_PORT ?? 3100);
const GATEWAY_PORT = Number(process.env.CAVALRY_E2E_GATEWAY_PORT ?? 3101);
const GITHUB_MOCK_PORT = Number(
  process.env.CAVALRY_E2E_GITHUB_MOCK_PORT ?? 3102,
);
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://cavalry:cavalry@localhost:5432/cavalry_e2e';
const WEB_URL = `http://localhost:${WEB_PORT}`;
const GATEWAY_URL = `http://localhost:${GATEWAY_PORT}`;
const GITHUB_MOCK_URL = `http://127.0.0.1:${GITHUB_MOCK_PORT}`;
const STORAGE_DIR =
  process.env.CAVALRY_STORAGE_LOCAL_DIR ??
  resolve(HERE, '.cavalry-e2e-storage');

// Generate a fresh RSA keypair once per e2e run. @octokit/app requires a valid
// PEM on construction (it parses the key during App JWT signing), but our
// mock server never verifies the resulting JWT — any valid RSA key works.
const { privateKey: GITHUB_APP_PRIVATE_KEY } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

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
  CAVALRY_ENCRYPTION_KEY:
    process.env.CAVALRY_ENCRYPTION_KEY ?? 'e2e-encryption-key-please-rotate',
  NODE_ENV: 'test',
  // GitHub App test config — points at the local mock server.
  CAVALRY_GITHUB_APP_ID: '1',
  CAVALRY_GITHUB_APP_PRIVATE_KEY: GITHUB_APP_PRIVATE_KEY,
  CAVALRY_GITHUB_APP_WEBHOOK_SECRET: 'e2e-webhook-secret',
  CAVALRY_GITHUB_APP_CLIENT_ID: 'e2e-client-id',
  CAVALRY_GITHUB_APP_CLIENT_SECRET: 'e2e-client-secret',
  CAVALRY_GITHUB_APP_SLUG: 'cavalry-e2e',
  CAVALRY_GITHUB_APP_API_URL: GITHUB_MOCK_URL,
};
process.env.CAVALRY_ENCRYPTION_KEY = sharedEnv.CAVALRY_ENCRYPTION_KEY;

process.env.DATABASE_URL = DATABASE_URL;
process.env.CAVALRY_WEB_URL = WEB_URL;
process.env.CAVALRY_GATEWAY_URL = GATEWAY_URL;
process.env.CAVALRY_STORAGE_LOCAL_DIR = STORAGE_DIR;
// Mirror the GitHub App env on the test process so sync engine / signing
// helpers inside specs see the same config as the webServer.
process.env.CAVALRY_GITHUB_APP_ID = sharedEnv.CAVALRY_GITHUB_APP_ID;
process.env.CAVALRY_GITHUB_APP_PRIVATE_KEY =
  sharedEnv.CAVALRY_GITHUB_APP_PRIVATE_KEY;
process.env.CAVALRY_GITHUB_APP_WEBHOOK_SECRET =
  sharedEnv.CAVALRY_GITHUB_APP_WEBHOOK_SECRET;
process.env.CAVALRY_GITHUB_APP_API_URL = sharedEnv.CAVALRY_GITHUB_APP_API_URL;
process.env.CAVALRY_GITHUB_APP_SLUG = sharedEnv.CAVALRY_GITHUB_APP_SLUG;
process.env.CAVALRY_E2E_GITHUB_MOCK_PORT = String(GITHUB_MOCK_PORT);
process.env.CAVALRY_E2E_WEB_PORT = String(WEB_PORT);

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
      command: 'pnpm --filter @cavalry/web-e2e exec tsx support/mock-github-server.run.ts',
      cwd: REPO_ROOT,
      url: `${GITHUB_MOCK_URL}/_control/state`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        CAVALRY_E2E_GITHUB_MOCK_PORT: String(GITHUB_MOCK_PORT),
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
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
