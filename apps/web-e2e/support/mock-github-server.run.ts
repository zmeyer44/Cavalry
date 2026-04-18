import { MockGitHubServer } from './mock-github-server';

const port = Number(process.env.CAVALRY_E2E_GITHUB_MOCK_PORT ?? 3102);

async function main(): Promise<void> {
  const server = new MockGitHubServer();
  await server.start(port);
  console.log(`[mock-github] listening on http://127.0.0.1:${port}`);
  const shutdown = async (signal: string) => {
    console.log(`[mock-github] ${signal} — shutting down`);
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[mock-github] failed to start', err);
  process.exit(1);
});
