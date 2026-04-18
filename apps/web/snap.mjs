import { chromium } from 'playwright';

const run = async () => {
  const browser = await chromium.launch();
  for (const v of [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    const el = page.locator('section:has-text("Works with the coding agents")').first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await el.screenshot({ path: `/tmp/trust-${v.name}.png` });
    console.log('wrote', `/tmp/trust-${v.name}.png`);
    await ctx.close();
  }
  await browser.close();
};
run().catch((err) => { console.error(err); process.exit(1); });
