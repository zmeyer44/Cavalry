import { router } from './trpc';
import { meRouter } from './routers/me';
import { orgRouter } from './routers/org';
import { workspaceRouter } from './routers/workspace';
import { tokenRouter } from './routers/token';
import { auditRouter } from './routers/audit';
import { invitationRouter } from './routers/invitation';
import { skillRouter } from './routers/skill';
import { registryRouter } from './routers/registry';
import { gitInstallationRouter } from './routers/gitInstallation';
import { skillRepoRouter } from './routers/skillRepo';
import { policyRouter } from './routers/policy';
import { approvalRouter } from './routers/approval';
import { integrationRouter } from './routers/integration';
import { slackRouter } from './routers/slack';

export const appRouter = router({
  me: meRouter,
  org: orgRouter,
  workspace: workspaceRouter,
  token: tokenRouter,
  audit: auditRouter,
  invitation: invitationRouter,
  skill: skillRouter,
  registry: registryRouter,
  gitInstallation: gitInstallationRouter,
  skillRepo: skillRepoRouter,
  policy: policyRouter,
  approval: approvalRouter,
  integration: integrationRouter,
  slack: slackRouter,
});

export type AppRouter = typeof appRouter;
