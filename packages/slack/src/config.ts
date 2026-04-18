export interface SlackAppConfig {
  clientId: string;
  clientSecret: string;
  signingSecret: string;
  /** Scopes the app requests. Bot-scoped install; enough to post approvals. */
  scopes: string[];
}

export function slackConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): SlackAppConfig | null {
  const clientId = env.CAVALRY_SLACK_CLIENT_ID;
  const clientSecret = env.CAVALRY_SLACK_CLIENT_SECRET;
  const signingSecret = env.CAVALRY_SLACK_SIGNING_SECRET;
  if (!clientId || !clientSecret || !signingSecret) return null;
  return {
    clientId,
    clientSecret,
    signingSecret,
    scopes: (env.CAVALRY_SLACK_SCOPES ?? 'chat:write,channels:join,commands')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
