import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(here, '../../../../.env') });

async function main() {
  // M0 seed is a no-op. Real seed lands in M1 once workspaces/tokens arrive.
  console.log('seed: nothing to do in M0');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
