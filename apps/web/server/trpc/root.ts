import { router } from './trpc';
import { meRouter } from './routers/me';
import { orgRouter } from './routers/org';
import { workspaceRouter } from './routers/workspace';
import { tokenRouter } from './routers/token';
import { auditRouter } from './routers/audit';
import { invitationRouter } from './routers/invitation';
import { skillRouter } from './routers/skill';

export const appRouter = router({
  me: meRouter,
  org: orgRouter,
  workspace: workspaceRouter,
  token: tokenRouter,
  audit: auditRouter,
  invitation: invitationRouter,
  skill: skillRouter,
});

export type AppRouter = typeof appRouter;
