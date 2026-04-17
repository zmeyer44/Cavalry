import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

export interface CliConfig {
  url: string;
  token?: string;
  orgSlug?: string;
}

const USER_CONFIG_PATH = join(homedir(), '.cavalry', 'config.json');

export async function loadUserConfig(): Promise<Partial<CliConfig>> {
  if (!existsSync(USER_CONFIG_PATH)) return {};
  try {
    const raw = await readFile(USER_CONFIG_PATH, 'utf8');
    return JSON.parse(raw) as Partial<CliConfig>;
  } catch {
    return {};
  }
}

export async function saveUserConfig(cfg: Partial<CliConfig>): Promise<void> {
  await mkdir(dirname(USER_CONFIG_PATH), { recursive: true });
  await writeFile(USER_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

export interface ProjectConfig {
  gateway?: string;
  skills?: string[];
}

export async function loadProjectConfig(cwd: string = process.cwd()): Promise<{
  path: string | null;
  config: ProjectConfig;
}> {
  let dir = resolve(cwd);
  while (true) {
    const candidate = join(dir, 'cavalry.json');
    if (existsSync(candidate)) {
      const raw = await readFile(candidate, 'utf8');
      return { path: candidate, config: JSON.parse(raw) as ProjectConfig };
    }
    const parent = dirname(dir);
    if (parent === dir) return { path: null, config: {} };
    dir = parent;
  }
}

export async function saveProjectConfig(
  path: string,
  config: ProjectConfig,
): Promise<void> {
  await writeFile(path, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export interface ResolvedConfig {
  url: string;
  token: string | undefined;
  orgSlug: string | undefined;
}

export async function resolveConfig(flags: {
  url?: string;
  token?: string;
}): Promise<ResolvedConfig> {
  const user = await loadUserConfig();
  const { config: project } = await loadProjectConfig();

  const url =
    flags.url ??
    process.env.CAVALRY_URL ??
    process.env.CAVALRY_GATEWAY_URL ??
    project.gateway ??
    user.url ??
    'http://localhost:3001';

  const token = flags.token ?? process.env.CAVALRY_TOKEN ?? user.token;

  return { url, token, orgSlug: user.orgSlug };
}
