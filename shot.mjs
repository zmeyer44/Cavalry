import { chromium } from 'playwright';

const URL = process.argv[2];
const OUT = process.argv[3];
const WIDTH = Number(process.argv[4] ?? 1320);
const HEIGHT = Number(process.argv[5] ?? 900);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
const fullPage = process.argv[6] === 'full';
const scrollY = Number(process.argv[7] ?? 0);
if (scrollY > 0) {
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(500);
}
await page.screenshot({ path: OUT, fullPage });
await browser.close();
console.log('saved', OUT);
