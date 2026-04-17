import { test as base, type BrowserContext, type Page } from '@playwright/test';
import { resetDatabase } from '../support/db';
import {
  findOrgBySlug,
  findUserByEmail,
  insertApiToken,
  makeOrgProfile,
  makeUserProfile,
  type OrgProfile,
  type UserProfile,
  type CreatedToken,
} from '../support/factories';

export interface AuthedUser {
  profile: UserProfile;
  userId: string;
  context: BrowserContext;
  page: Page;
}

export interface AuthedOrg extends AuthedUser {
  org: OrgProfile & { id: string };
}

export interface OrgWithToken extends AuthedOrg {
  token: CreatedToken;
}

type Fixtures = {
  cleanDb: void;
  authedUser: AuthedUser;
  authedOrg: AuthedOrg;
  orgWithToken: OrgWithToken;
};

export const test = base.extend<Fixtures>({
  cleanDb: [
    async ({}, use) => {
      await resetDatabase();
      await use();
    },
    { auto: true, scope: 'test' },
  ],

  authedUser: async ({ browser }, use) => {
    const profile = makeUserProfile();
    const context = await browser.newContext();
    const page = await context.newPage();
    await signUpViaApi(page, profile);

    const record = await findUserByEmail(profile.email);
    if (!record) throw new Error(`user ${profile.email} not created`);

    await use({ profile, userId: record.id, context, page });
    await context.close();
  },

  authedOrg: async ({ authedUser }, use) => {
    const org = makeOrgProfile();
    const res = await authedUser.page.request.post('/api/onboarding/org', {
      data: { name: org.name, slug: org.slug },
    });
    if (!res.ok()) {
      throw new Error(`create org failed: ${res.status()} ${await res.text()}`);
    }
    const row = await findOrgBySlug(org.slug);
    if (!row) throw new Error(`org ${org.slug} not found after create`);

    await use({ ...authedUser, org: { ...org, id: row.id } });
  },

  orgWithToken: async ({ authedOrg }, use) => {
    const token = await insertApiToken({
      orgId: authedOrg.org.id,
      userId: authedOrg.userId,
      name: 'e2e-token',
      scopes: ['skills:read', 'skills:write', 'skills:install'],
    });
    await use({ ...authedOrg, token });
  },
});

async function signUpViaApi(page: Page, profile: UserProfile): Promise<void> {
  const res = await page.request.post('/api/auth/sign-up/email', {
    data: {
      email: profile.email,
      password: profile.password,
      name: profile.name,
    },
  });
  if (!res.ok()) {
    throw new Error(`sign-up failed: ${res.status()} ${await res.text()}`);
  }
}

export { expect } from '@playwright/test';
