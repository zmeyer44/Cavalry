import pc from 'picocolors';
import { mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { extract as tarExtract } from 'tar';
import { parseSkillRef } from '@cavalry/skill-format';
import { resolveConfig } from '../config';
import { GatewayClient } from '../client';

export async function install(
  ref: string,
  opts: { url?: string; token?: string; outDir?: string },
): Promise<void> {
  const parsed = parseSkillRef(ref);
  if (!parsed) {
    console.error(pc.red(`Invalid skill reference: ${ref}`));
    process.exit(1);
  }
  if (parsed.registry && parsed.registry !== 'internal') {
    console.error(
      pc.red(`Upstream registries not supported yet (got "${parsed.registry}"). M3 adds this.`),
    );
    process.exit(1);
  }

  const cfg = await resolveConfig(opts);
  if (!cfg.token) {
    console.error(pc.red('Not logged in. Run `cavalry login --token <...>`.'));
    process.exit(1);
  }
  const client = new GatewayClient({ url: cfg.url, token: cfg.token });

  let version = parsed.version;
  if (!version || version === 'latest') {
    version = await client.resolveLatest(parsed.namespace, parsed.name);
  }

  const outDir = resolve(
    opts.outDir ??
      join(process.cwd(), '.cavalry', 'skills', parsed.namespace, parsed.name),
  );
  await mkdir(outDir, { recursive: true });

  console.log(
    pc.dim(`fetching ${parsed.namespace}/${parsed.name}@${version} → ${outDir}…`),
  );

  const { stream, hash, size } = await client.fetchArtifact(parsed.namespace, parsed.name, version);

  // Verify hash while extracting
  const hasher = createHash('sha256');
  const verified = new Readable({
    read() {},
  });
  let bytes = 0;
  stream.on('data', (chunk: Buffer) => {
    hasher.update(chunk);
    bytes += chunk.length;
    verified.push(chunk);
  });
  stream.on('end', () => verified.push(null));
  stream.on('error', (err) => verified.destroy(err));

  await pipeline(verified, tarExtract({ cwd: outDir }));

  const actual = hasher.digest('hex');
  if (hash && actual !== hash) {
    console.error(pc.red(`✗ Hash mismatch. expected=${hash} got=${actual}`));
    process.exit(1);
  }
  if (size && bytes !== size) {
    console.error(pc.yellow(`! Size mismatch. expected=${size} got=${bytes}`));
  }

  console.log(
    pc.green(
      `✓ Installed ${parsed.namespace}/${parsed.name}@${version} (${(bytes / 1024).toFixed(1)} KB)`,
    ),
  );
}
