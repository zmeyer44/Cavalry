import pc from 'picocolors';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { create as tarCreate } from 'tar';
import { parseManifest, skillRef } from '@cavalry/skill-format';
import { resolveConfig } from '../config';
import { GatewayClient } from '../client';

const DEFAULT_EXCLUDES = [
  'node_modules',
  '.git',
  '.cavalry',
  '.DS_Store',
  'dist',
  'build',
  '.next',
  '.turbo',
];

export async function publish(
  path: string | undefined,
  opts: { url?: string; token?: string },
): Promise<void> {
  const dir = resolve(path ?? '.');
  const manifestPath = join(dir, 'skill.json');

  const stats = await stat(dir).catch(() => null);
  if (!stats?.isDirectory()) {
    console.error(pc.red(`Not a directory: ${dir}`));
    process.exit(1);
  }
  const manifestRaw = await readFile(manifestPath, 'utf8').catch(() => null);
  if (!manifestRaw) {
    console.error(pc.red(`Missing skill.json in ${dir}`));
    process.exit(1);
  }
  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(manifestRaw);
  } catch (err) {
    console.error(pc.red(`Invalid JSON in skill.json: ${(err as Error).message}`));
    process.exit(1);
  }

  const parsed = parseManifest(manifestJson);
  if (!parsed.ok) {
    console.error(pc.red('Invalid manifest:'));
    for (const issue of parsed.error.issues) {
      console.error(`  ${pc.yellow(issue.path)}: ${issue.message}`);
    }
    process.exit(1);
  }

  const manifest = parsed.value;
  const cfg = await resolveConfig(opts);
  if (!cfg.token) {
    console.error(pc.red('Not logged in. Run `cavalry login --token <...>`.'));
    process.exit(1);
  }

  console.log(pc.dim(`packing ${dir}…`));
  const chunks: Buffer[] = [];
  const stream = tarCreate(
    {
      cwd: dir,
      gzip: { level: 6 },
      portable: true,
      filter: (path) => !DEFAULT_EXCLUDES.some((pattern) => path.split('/').includes(pattern)),
    },
    ['.'],
  );
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const artifact = Buffer.concat(chunks);

  console.log(
    pc.dim(
      `publishing ${skillRef(manifest)} (${(artifact.length / 1024).toFixed(1)} KB) to ${cfg.url}…`,
    ),
  );

  const client = new GatewayClient({ url: cfg.url, token: cfg.token });
  try {
    const result = await client.publish({
      namespace: manifest.namespace,
      name: manifest.name,
      manifest: manifest as unknown as Record<string, unknown>,
      artifact,
    });
    console.log(
      pc.green(
        `✓ Published ${result.namespace}/${result.name}@${result.version} (${result.artifactHash.slice(0, 12)}…)`,
      ),
    );
  } catch (err) {
    console.error(pc.red(`✗ ${(err as Error).message}`));
    const issues = (err as { issues?: Array<{ path: string; message: string }> }).issues;
    if (issues) {
      for (const i of issues) console.error(`  ${pc.yellow(i.path)}: ${i.message}`);
    }
    process.exit(1);
  }
}
