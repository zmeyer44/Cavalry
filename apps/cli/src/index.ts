#!/usr/bin/env -S npx tsx
import { Command } from 'commander';
import pc from 'picocolors';
import { login, logout } from './commands/login';
import { whoami } from './commands/whoami';
import { init } from './commands/init';
import { publish } from './commands/publish';
import { install } from './commands/install';
import { policyList } from './commands/policy';

const program = new Command();

program
  .name('cavalry')
  .description('Governance, observability, and control for AI agent context')
  .version('0.1.0')
  .option('--url <url>', 'Gateway URL')
  .option('--token <token>', 'API token');

program
  .command('login')
  .description('Authenticate with a gateway using an API token')
  .action(async () => login(program.opts()));

program.command('logout').description('Clear saved token').action(logout);

program
  .command('whoami')
  .description('Show the active gateway and token prefix')
  .action(async () => whoami(program.opts()));

program
  .command('init')
  .description('Create cavalry.json in the current directory')
  .action(async () => init({}));

program
  .command('publish [path]')
  .description('Publish a skill directory to the private registry')
  .action(async (path: string | undefined) => publish(path, program.opts()));

program
  .command('install <ref>')
  .description('Install a skill from the registry')
  .option('--out <dir>', 'Output directory')
  .action(async (ref: string, cmdOpts: { out?: string }) =>
    install(ref, { ...program.opts(), outDir: cmdOpts.out }),
  );

const policyCmd = program
  .command('policy')
  .description('Inspect active governance policies');

policyCmd
  .command('list')
  .description('List active policies enforced at the gateway')
  .option('--json', 'Emit JSON instead of a table')
  .action(async (cmdOpts: { json?: boolean }) =>
    policyList({ ...program.opts(), json: cmdOpts.json }),
  );

program
  .command('search <query>')
  .description('Search skills (M6)')
  .action(() => console.error(pc.yellow('search: landing in M6')));

program
  .command('list')
  .description('List installed skills in the current project (M6)')
  .action(() => console.error(pc.yellow('list: landing in M6')));

program
  .command('doctor')
  .description('Diagnose config and connectivity')
  .action(async () => {
    try {
      await whoami(program.opts());
    } catch (err) {
      console.error(pc.red(String(err)));
      process.exit(1);
    }
  });

program.parseAsync().catch((err) => {
  console.error(pc.red(String(err)));
  process.exit(1);
});
