import pc from 'picocolors';
import { mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { extract as tarExtract } from 'tar';
import { parseSkillRef } from '@cavalry/skill-format';
import { resolveConfig } from '../config';
import { GatewayClient, type PolicyViolationError } from '../client';

function isPolicyError(err: unknown): err is PolicyViolationError {
  return (
    err instanceof Error &&
    'kind' in err &&
    ((err as PolicyViolationError).kind === 'policy_violation' ||
      (err as PolicyViolationError).kind === 'approval_required')
  );
}

function reportPolicyError(refLabel: string, err: PolicyViolationError): never {
  if (err.kind === 'approval_required') {
    const suffix = err.approvalId ? ` (id ${err.approvalId})` : '';
    console.error(pc.yellow(`⏳ ${refLabel} is pending approval${suffix}`));
    console.error(pc.yellow(`  policy "${err.policyName}" — ${err.reason}`));
    console.error(
      pc.dim(
        '  once approved in the Cavalry UI, re-run this command to complete the install',
      ),
    );
    process.exit(3);
  }
  console.error(pc.red(`✗ Blocked by policy "${err.policyName}"`));
  console.error(pc.red(`  ${err.reason}`));
  console.error(pc.dim('  run `cavalry policy list` to see active rules'));
  process.exit(2);
}

export async function install(
  ref: string,
  opts: { url?: string; token?: string; outDir?: string },
): Promise<void> {
  const parsed = parseSkillRef(ref);
  if (!parsed) {
    console.error(pc.red(`Invalid skill reference: ${ref}`));
    process.exit(1);
  }

  const cfg = await resolveConfig(opts);
  if (!cfg.token) {
    console.error(pc.red('Not logged in. Run `cavalry login --token <...>`.'));
    process.exit(1);
  }
  const client = new GatewayClient({ url: cfg.url, token: cfg.token });

  const isUpstream = !!parsed.registry;
  let version = parsed.version;
  if (!version || version === 'latest') {
    version = isUpstream
      ? await client.resolveProxiedLatest(parsed.registry!, parsed.namespace, parsed.name)
      : await client.resolveLatest(parsed.namespace, parsed.name);
  }

  const outDir = resolve(
    opts.outDir ??
      join(process.cwd(), '.cavalry', 'skills', parsed.namespace, parsed.name),
  );
  await mkdir(outDir, { recursive: true });

  const refLabel = isUpstream
    ? `${parsed.registry}:${parsed.namespace}/${parsed.name}@${version}`
    : `${parsed.namespace}/${parsed.name}@${version}`;
  console.log(pc.dim(`fetching ${refLabel} → ${outDir}…`));

  let stream: Readable, hash: string, size: number;
  try {
    const got = isUpstream
      ? await client.fetchProxiedArtifact(parsed.registry!, parsed.namespace, parsed.name, version)
      : await client.fetchArtifact(parsed.namespace, parsed.name, version);
    stream = got.stream;
    hash = got.hash;
    size = got.size;
  } catch (err) {
    if (isPolicyError(err)) reportPolicyError(refLabel, err);
    throw err;
  }

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
    pc.green(`✓ Installed ${refLabel} (${(bytes / 1024).toFixed(1)} KB)`),
  );
}
