import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createFixtures } from './fixtures';
// Capture the actual application using only reproducible, synthetic assets.
const base = await mkdtemp(path.join(tmpdir(), 'voro-site-'));
const project = path.join(base, 'Little worlds');
await createFixtures(project);
await mkdir('site/public/images', { recursive: true });
const app = await electron.launch({
  args: ['.'],
  env: { ...process.env, ASSET_REVIEWER_DATA: path.join(base, 'data') },
});
try {
  const page = await app.firstWindow();
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
  // Replace only the machine-specific display path; source assets and UI are real.
  await page.locator('.page-heading p').evaluate((el) => {
    el.textContent = 'Little worlds / Assets';
  });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'site/public/images/collection.jpg', type: 'jpeg', quality: 88 });
  await page.getByRole('button', { name: 'Inspect Arc chair.glb' }).click();
  await expect(page.getByText('Drag to orbit')).toBeVisible();
  await page.getByLabel('Review status').selectOption('needs_changes');
  await page
    .getByLabel('Comment', { exact: true })
    .fill('Soften the front edge of the seat. Keep the profile light.');
  await page.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(page.getByText('Saved beside asset')).toBeVisible();
  await page.locator('.page-heading p').evaluate((el) => {
    el.textContent = 'Little worlds / Assets';
  });
  await page.locator('.inspector').evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: 'site/public/images/inspection.jpg', type: 'jpeg', quality: 88 });
  const review = JSON.parse(
    await readFile(path.join(project, 'Furniture/.Arc chair.glb.notes.json'), 'utf8'),
  );
  await writeFile('site/public/example-review.notes.json', JSON.stringify(review, null, 2) + '\n');
} finally {
  await app.close();
  await rm(base, { recursive: true, force: true });
}
