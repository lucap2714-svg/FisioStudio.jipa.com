import { chromium } from 'playwright';
import fs from 'fs';

const TARGET = process.env.TARGET_URL || 'http://localhost:4173';
const OUT = 'runtime-error.txt';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];

  const push = (type, msg) => {
    const line = `[${type}] ${msg}`;
    console.log(line);
    logs.push(line);
  };

  page.on('console', (msg) => {
    push('console', `${msg.type()} ${msg.text()}`);
  });

  page.on('pageerror', (err) => {
    push('pageerror', err.stack || err.message || String(err));
  });

  await page.goto(TARGET);
  await page.waitForTimeout(1000);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1000);

  fs.writeFileSync(OUT, logs.join('\n'), 'utf-8');
  await browser.close();
}

run().catch((e) => {
  console.error('[trace-runtime-error] Fatal', e);
  process.exit(1);
});
