import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '../fixtures';
import { insertRegistry } from '../support/factories';
import { MockUpstream, makeDemoSkill } from '../support/mock-upstream';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const CLI_PATH = resolve(REPO_ROOT, 'apps/cli/src/index.ts');

test.describe('M3 CLI install upstream', () => {
  test('cavalry install tessl://demo/hello@1.0.0 → exit 0 + extracted files', async ({
    orgWithToken,
  }) => {
    const upstream = new MockUpstream([makeDemoSkill()]);
    const { url } = await upstream.start();
    const outDir = await mkdtemp(join(tmpdir(), 'cavalry-cli-install-'));
    try {
      const { org, token } = orgWithToken;
      await insertRegistry({ orgId: org.id, name: 'tessl', type: 'tessl', url });

      const result = await runCli(
        ['install', 'tessl://demo/hello@1.0.0', '--out', outDir],
        {
          token: token.token,
          gatewayUrl: process.env.CAVALRY_GATEWAY_URL!,
        },
      );

      expect(result.code).toBe(0);
      expect(result.stdout + result.stderr).toMatch(/Installed tessl:demo\/hello@1\.0\.0/);

      // Files extracted
      const files = await readdir(outDir);
      expect(files).toContain('skill.json');
      expect(files).toContain('SKILL.md');
      const stats = await stat(join(outDir, 'SKILL.md'));
      expect(stats.size).toBeGreaterThan(0);
    } finally {
      await upstream.stop();
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

interface RunCliResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runCli(
  args: string[],
  env: { token: string; gatewayUrl: string },
): Promise<RunCliResult> {
  return new Promise((resolveResult, reject) => {
    // Use pnpm to dispatch through the CLI workspace's `tsx` so the TS source runs.
    const proc = spawn(
      'pnpm',
      ['--filter', '@cavalry/cli', 'exec', 'tsx', CLI_PATH, ...args],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          CAVALRY_TOKEN: env.token,
          CAVALRY_URL: env.gatewayUrl,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => resolveResult({ code: code ?? -1, stdout, stderr }));
  });
}
