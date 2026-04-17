import pc from 'picocolors';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { saveProjectConfig, type ProjectConfig } from '../config';

export async function init(opts: { cwd?: string }): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const target = resolve(cwd, 'cavalry.json');
  if (existsSync(target)) {
    console.error(pc.red('cavalry.json already exists in this directory'));
    process.exit(1);
  }
  const config: ProjectConfig = {
    gateway: 'http://localhost:3001',
    skills: [],
  };
  await saveProjectConfig(target, config);
  console.log(pc.green(`✓ Created ${target}`));
}
