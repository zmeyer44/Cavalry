import { createHash } from 'node:crypto';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { PassThrough, Readable } from 'node:stream';
import tarStream from 'tar-stream';
import type { GitProvider, TreeEntry } from '@cavalry/git-provider';
import picomatch from 'picomatch';

export interface BuildSkillArtifactParams {
  provider: GitProvider;
  installationId: string;
  owner: string;
  repo: string;
  /** Commit SHA to read from. Using a SHA (not a tag) makes this reproducible. */
  ref: string;
  /** Root of the skill directory inside the repo. */
  skillPath: string;
  /** Glob patterns (repo-relative) to exclude from the artifact. */
  ignorePatterns: string[];
}

export interface BuildSkillArtifactResult {
  /** Gzipped tarball of the skill directory contents. */
  body: Buffer;
  /** sha256 of the tarball (hex). */
  hash: string;
  /** Paths inside the archive, ordered. Useful for manifests. */
  files: Array<{ path: string; size: number }>;
}

/**
 * Build a deterministic gzipped tar archive of a skill directory in a repo.
 *
 * "Deterministic" means: fixed mtime/uid/gid, sorted entries, no extended
 * headers — so the same inputs always produce the same sha256.
 */
export async function buildSkillArtifact(
  params: BuildSkillArtifactParams,
): Promise<BuildSkillArtifactResult> {
  const entries = await listSkillTree(params);

  const ignoreMatchers = params.ignorePatterns.map((p) =>
    picomatch(p, { dot: true, basename: true }),
  );

  const filtered = entries.filter((entry) => {
    if (entry.type !== 'blob') return false;
    // `entry.path` here is repo-relative. Match ignore patterns against repo path.
    return !ignoreMatchers.some((match) => match(entry.path));
  });

  // Sort for determinism.
  filtered.sort((a, b) => a.path.localeCompare(b.path));

  const pack = tarStream.pack();
  const chunks: Buffer[] = [];
  const collector = new PassThrough();
  collector.on('data', (chunk: Buffer) => chunks.push(chunk));

  const gzip = createGzip({ level: 9 });
  const pipelinePromise = pipeline(pack, gzip, collector);

  const files: Array<{ path: string; size: number }> = [];
  for (const entry of filtered) {
    const content = await params.provider.readFile({
      installationId: params.installationId,
      owner: params.owner,
      repo: params.repo,
      ref: params.ref,
      path: entry.path,
    });
    if (!content) continue;

    // Archive paths are relative to the skill directory root.
    const archivePath = entry.path.slice(params.skillPath.length).replace(/^\/+/, '');
    if (archivePath.length === 0) continue;

    await new Promise<void>((resolve, reject) => {
      pack.entry(
        {
          name: archivePath,
          size: content.length,
          mode: 0o644,
          mtime: new Date(0),
          uid: 0,
          gid: 0,
          uname: '',
          gname: '',
          type: 'file',
        },
        content,
        (err) => (err ? reject(err) : resolve()),
      );
    });

    files.push({ path: archivePath, size: content.length });
  }

  pack.finalize();
  await pipelinePromise;

  const body = Buffer.concat(chunks);
  const hash = createHash('sha256').update(body).digest('hex');
  return { body, hash, files };
}

/**
 * Stream the recursive tree under the skill directory. Uses listTree with
 * recursive=true — acceptable at this scale (tens to hundreds of files per
 * skill). For very large skills we'd switch to per-blob fetch planning.
 */
async function listSkillTree(
  params: BuildSkillArtifactParams,
): Promise<TreeEntry[]> {
  const entries: TreeEntry[] = [];
  const iterator = params.provider.listTree({
    installationId: params.installationId,
    owner: params.owner,
    repo: params.repo,
    ref: params.ref,
    path: params.skillPath,
    recursive: true,
  });
  for await (const entry of iterator) {
    // `listTree` with a path returns tree entries relative to that subtree.
    // Re-prefix with the skill path so downstream sees full repo paths.
    const fullPath = `${params.skillPath.replace(/\/+$/, '')}/${entry.path}`;
    entries.push({ ...entry, path: fullPath });
  }
  return entries;
}

/** Read the gzipped tar body as a stream (for writing to storage). */
export function toReadable(body: Buffer): Readable {
  return Readable.from(body);
}
