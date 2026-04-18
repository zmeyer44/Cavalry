/**
 * Extremely small Slack Web API client. Just enough to post messages and
 * update them — the Slack SDK would be overkill for two endpoints.
 */

const SLACK_API = 'https://slack.com/api';

export interface PostMessageParams {
  token: string;
  channel: string;
  text: string;
  blocks?: unknown[];
}

export interface PostMessageResult {
  ok: boolean;
  ts?: string;
  channel?: string;
  error?: string;
}

export async function postMessage(
  params: PostMessageParams,
): Promise<PostMessageResult> {
  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${params.token}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel: params.channel,
      text: params.text,
      blocks: params.blocks,
    }),
  });
  return (await res.json()) as PostMessageResult;
}

export interface UpdateMessageParams extends PostMessageParams {
  ts: string;
}

export async function updateMessage(
  params: UpdateMessageParams,
): Promise<PostMessageResult> {
  const res = await fetch(`${SLACK_API}/chat.update`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${params.token}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel: params.channel,
      ts: params.ts,
      text: params.text,
      blocks: params.blocks,
    }),
  });
  return (await res.json()) as PostMessageResult;
}

export interface OAuthAccessResult {
  ok: boolean;
  access_token?: string;
  bot_user_id?: string;
  team?: { id: string; name: string };
  error?: string;
  scope?: string;
}

export async function exchangeOAuthCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<OAuthAccessResult> {
  const form = new URLSearchParams();
  form.set('client_id', params.clientId);
  form.set('client_secret', params.clientSecret);
  form.set('code', params.code);
  form.set('redirect_uri', params.redirectUri);
  const res = await fetch(`${SLACK_API}/oauth.v2.access`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  return (await res.json()) as OAuthAccessResult;
}
