import { test, expect } from '../fixtures';
import { insertPolicy } from '../support/factories';
import {
  buildArtifact,
  mcpRequest,
  publishArtifact,
} from '../helpers/gateway';
import type { SkillManifest } from '@cavalry/skill-format';

async function publishSkill(
  token: string,
  namespace: string,
  name: string,
): Promise<void> {
  const manifest: SkillManifest = {
    name,
    namespace,
    version: '1.0.0',
    description: `${namespace}/${name}`,
    targets: ['claude-code'],
    entrypoints: { skill: 'SKILL.md' },
  };
  const { buffer } = await buildArtifact({ manifest });
  await publishArtifact({ token, manifest, artifact: buffer });
}

test.describe('M4 MCP endpoint', () => {
  test('initialize + tools/list + tools/call filters skills through policy', async ({
    orgWithToken,
  }) => {
    const { org, token } = orgWithToken;

    await publishSkill(token.token, 'green', 'ok');
    await publishSkill(token.token, 'red', 'blocked');

    // Block the `red` namespace at the policy layer.
    await insertPolicy({
      orgId: org.id,
      name: 'no-red',
      type: 'blocklist',
      config: { patterns: ['internal:red/*'] },
      priority: 10,
    });

    const init = await mcpRequest({
      token: token.token,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {} },
      id: 1,
    });
    expect(init.status).toBe(200);
    expect(init.body.result).toMatchObject({
      serverInfo: { name: 'cavalry' },
    });

    const tools = await mcpRequest({
      token: token.token,
      method: 'tools/list',
      id: 2,
    });
    const toolNames = (tools.body.result as { tools: Array<{ name: string }> })
      .tools.map((t) => t.name);
    expect(toolNames).toContain('list_skills');
    expect(toolNames).toContain('get_skill');

    const list = await mcpRequest({
      token: token.token,
      method: 'tools/call',
      params: { name: 'list_skills', arguments: {} },
      id: 3,
    });
    const listResult = list.body.result as {
      content: Array<{ text: string }>;
      structuredContent: { skills: Array<{ ref: string }> };
    };
    const refs = listResult.structuredContent.skills.map((s) => s.ref);
    expect(refs).toContain('internal:green/ok');
    expect(refs).not.toContain('internal:red/blocked');

    const blockedDetail = await mcpRequest({
      token: token.token,
      method: 'tools/call',
      params: {
        name: 'get_skill',
        arguments: { namespace: 'red', name: 'blocked' },
      },
      id: 4,
    });
    const detail = blockedDetail.body.result as {
      structuredContent: { decision: string; policy: { name: string } | null };
    };
    expect(detail.structuredContent.decision).toBe('deny');
    expect(detail.structuredContent.policy?.name).toBe('no-red');
  });

  test('rejects missing bearer token', async () => {
    const res = await fetch(
      `${process.env.CAVALRY_GATEWAY_URL ?? 'http://localhost:3001'}/mcp`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
      },
    );
    expect(res.status).toBe(401);
  });
});
