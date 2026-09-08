import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createFixtures } from './fixtures';
const base = await mkdtemp(path.join(tmpdir(), 'reviewer-brand-'));
const project = path.join(base, 'Studio collection');
await createFixtures(project);
await mkdir('.impeccable/review', { recursive: true });
const app = await electron.launch({
  args: ['.'],
  env: { ...process.env, ASSET_REVIEWER_DATA: path.join(base, 'data') },
});
const checks: Record<string, unknown> = {};
try {
  const page = await app.firstWindow();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const capture = async (name: string) => {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `.impeccable/review/${name}.png` });
    checks[name] = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      fonts:
        document.fonts.check('600 38px "Bricolage Grotesque"') &&
        document.fonts.check('400 13px "DM Sans"'),
    }));
  };
  const size = async (width: number, height: number) => {
    await app.evaluate(
      ({ BrowserWindow }, bounds) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().endsWith('/index.html'))!
          .setSize(bounds.width, bounds.height),
      { width, height },
    );
  };
  await expect(page.getByRole('heading', { name: 'Small details. Bigger worlds.' })).toBeVisible();
  await capture('desktop-welcome');
  await size(1080, 700);
  await capture('minimum-welcome');
  await size(1480, 960);
  await app.evaluate(({ dialog }, root) => {
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: [root],
    })) as typeof dialog.showOpenDialog;
  }, project);
  await page.getByRole('button', { name: /Open a project folder/ }).click();
  await expect
    .poll(
      () =>
        page.evaluate(
          async () =>
            (await window.reviewer.queryAssets({})).assets.filter((a) => a.preview === 'ready')
              .length,
        ),
      { timeout: 30000 },
    )
    .toBe(9);
  await capture('desktop-gallery');
  await page.getByRole('button', { name: 'Inspect Arc chair.glb' }).click();
  await expect(page.getByText('Drag to orbit')).toBeVisible();
  await page.getByLabel('Review status').selectOption('needs_changes');
  await page
    .getByLabel('Comment', { exact: true })
    .fill('Soften the front edge of the seat. Keep the profile light.');
  await page.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(page.getByText('Saved beside asset')).toBeVisible();
  await page.locator('.inspector').evaluate((el) => {
    el.scrollTop = 0;
  });
  await capture('desktop-inspection');
  await size(1080, 700);
  await page.locator('.inspector').evaluate((el) => {
    el.scrollTop = 0;
  });
  await capture('minimum-inspection');
  await page.getByLabel('Comment', { exact: true }).scrollIntoViewIfNeeded();
  await capture('minimum-notes');
  await page.getByRole('button', { name: 'Project settings' }).click();
  await capture('minimum-settings');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Close inspector' }).click();
  const filters = page.getByRole('button', { name: /Filters/ });
  await filters.click();
  await capture('minimum-filters');
  checks.errors = errors;
  const guideWindow = app.waitForEvent('window', (p) => !p.url().endsWith('/thumbnail.html'));
  await app.evaluate(async ({ BrowserWindow }, guide) => {
    const win = new BrowserWindow({
      width: 1280,
      height: 960,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        partition: 'brand-preview',
      },
    });
    await win.loadFile(guide);
  }, path.resolve('brand/index.html'));
  const guide = await guideWindow;
  await guide.evaluate(() => document.fonts.ready);
  await guide.screenshot({ path: '.impeccable/review/brand-guide.png', fullPage: true });
  checks.guide = await guide.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    images: [...document.images].every((i) => i.complete && i.naturalWidth > 0),
    fonts: document.fonts.check('600 52px "Bricolage Grotesque"'),
  }));
  await writeFile('.impeccable/review/checks.json', JSON.stringify(checks, null, 2));
  console.log(checks);
} finally {
  await app.close();
  await rm(base, { recursive: true, force: true });
}
