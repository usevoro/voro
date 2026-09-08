import { test } from 'node:test';
import assert from 'node:assert/strict';
import { _electron as electron, expect, type ElectronApplication } from '@playwright/test';
import { mkdtemp, mkdir, readFile, rm, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createCodecFixtures } from '../../scripts/codecs';
import { createFixtures } from '../../scripts/fixtures';
const launch = (data: string) =>
  electron.launch({
    executablePath: process.env.ASSET_REVIEWER_EXECUTABLE,
    args: process.env.ASSET_REVIEWER_EXECUTABLE ? [] : ['.'],
    env: { ...process.env, ASSET_REVIEWER_DATA: data },
    timeout: 30000,
  });
async function picker(app: ElectronApplication, root: string) {
  await app.evaluate(({ dialog }, root) => {
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: [root],
    })) as typeof dialog.showOpenDialog;
  }, root);
}
test(
  'Electron: scan, thumbnail, viewer, comment, conflict, offline security, restart',
  { timeout: 120000 },
  async () => {
    const base = await mkdtemp(path.join(tmpdir(), 'reviewer-e2e-'));
    const root = path.join(base, 'project');
    const data = path.join(base, 'data');
    await mkdir(data);
    await createFixtures(root);
    let app: ElectronApplication | undefined;
    try {
      app = await launch(data);
      const page = await app.firstWindow();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await expect(
        page.getByRole('heading', { name: 'Small details. Bigger worlds.' }),
      ).toBeVisible();
      await mkdir('test-results', { recursive: true });
      await page.screenshot({ path: 'test-results/welcome.png' });
      await picker(app, root);
      await page.getByRole('button', { name: /Open a project folder/ }).click();
      await expect(page.getByRole('button', { name: 'Inspect Arc chair.glb' })).toBeVisible({
        timeout: 15000,
      });
      await expect
        .poll(
          () =>
            page.evaluate(
              async () =>
                (await window.reviewer.queryAssets({ search: 'Arc chair' })).assets[0]?.preview,
            ),
          { timeout: 30000 },
        )
        .toBe('ready');
      await page.getByRole('button', { name: 'Inspect Arc chair.glb' }).click();
      await expect(page.getByText('Drag to orbit')).toBeVisible({ timeout: 30000 });
      await expect(page.locator('.inspector.expanded')).toBeVisible();
      await expect(page.locator('.gallery')).toBeHidden();
      const fullSize = await page.locator('.viewer canvas').boundingBox();
      assert.ok(fullSize && fullSize.width > 700 && fullSize.height > 400);
      await page.getByRole('button', { name: 'Compact preview' }).click();
      await expect(page.locator('.gallery')).toBeVisible();
      const frame = await page.locator('.asset-card.selected .asset-image').evaluate((el) => ({
        radius: getComputedStyle(el).borderRadius,
        borderRadius: getComputedStyle(el, '::after').borderRadius,
        border: getComputedStyle(el, '::after').borderWidth,
        svg: el.querySelector('svg.selection-frame') !== null,
      }));
      assert.equal(frame.radius, frame.borderRadius);
      assert.equal(frame.border, '2px');
      assert.equal(frame.svg, false);
      await page.getByRole('button', { name: 'Full view preview' }).click();
      // Start typing immediately after a status save; its response must rebase
      // this new draft instead of treating it as an external conflict.
      await page.getByLabel('Review status').selectOption('needs_changes');
      await page.getByLabel('Comment', { exact: true }).fill('Round the front edge of the seat.');
      await page.getByRole('button', { name: 'Add comment', exact: true }).click();
      await expect(page.getByText('Saved beside asset')).toBeVisible();
      await page.getByLabel('Review status').selectOption('needs_changes');
      await expect(page.getByText('Saved beside asset')).toBeVisible();
      const sidecar = path.join(root, 'Furniture/.Arc chair.glb.notes.json');
      let saved = JSON.parse(await readFile(sidecar, 'utf8'));
      assert.equal(saved.status, 'needs_changes');
      assert.equal(saved.comments[0].text, 'Round the front edge of the seat.');
      await page.getByRole('button', { name: 'Edit comment', exact: true }).click();
      await page.getByLabel('Comment', { exact: true }).fill('Soften the front edge.');
      await page.getByRole('button', { name: 'Save edit' }).click();
      await expect(page.getByText('Saved beside asset')).toBeVisible();
      await page
        .getByLabel('Comment', { exact: true })
        .fill('Keep this draft across selection changes.');
      const exportPath = path.join(base, 'reviews.json');
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = (async () => ({
          canceled: false,
          filePath,
        })) as typeof dialog.showSaveDialog;
      }, exportPath);
      await page.getByRole('button', { name: 'Export reviews', exact: true }).click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Exported 1 saved reviews' }),
      ).toBeVisible();
      const exported = JSON.parse(await readFile(exportPath, 'utf8'));
      assert.equal(exported.format, 'voro.review-export');
      assert.equal(exported.reviews[0].review.comments.length, 1);
      assert.equal(exported.reviews[0].review.comments[0].text, 'Soften the front edge.');
      assert.equal(exported.reviews[0].review.assetId, saved.assetId);
      assert.equal(exported.reviews[0].asset.path, 'Furniture/Arc chair.glb');
      await app.evaluate(({ dialog }) => {
        dialog.showSaveDialog = (async () => ({
          canceled: true,
          filePath: '',
        })) as typeof dialog.showSaveDialog;
      });
      assert.equal(await page.evaluate(() => window.reviewer.exportReviews()), null);
      await page.getByRole('button', { name: 'Back to assets' }).click();
      await page.getByRole('button', { name: 'Inspect Clay vessel.glb' }).click();
      await page.getByRole('button', { name: 'Back to assets' }).click();
      await page.getByRole('button', { name: 'Inspect Arc chair.glb' }).click();
      await expect(page.getByLabel('Comment', { exact: true })).toHaveValue(
        'Keep this draft across selection changes.',
      );
      saved = JSON.parse(await readFile(sidecar, 'utf8'));
      saved.status = 'approved';
      saved.updatedAt = new Date().toISOString();
      await writeFile(sidecar, JSON.stringify(saved));
      await expect(page.getByText('Notes changed outside the app')).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel('Comment', { exact: true })).toHaveValue(
        'Keep this draft across selection changes.',
      );
      await page.getByRole('button', { name: 'Load latest review' }).click();
      await expect(page.getByLabel('Review status')).toHaveValue('approved');
      await page.getByRole('button', { name: 'Add comment', exact: true }).click();
      await expect(page.getByText('Saved beside asset')).toBeVisible();
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
      await page.locator('.inspector').evaluate((el) => (el.scrollTop = 0));
      await page.screenshot({ path: 'test-results/inspection.png' });
      const security = await page.evaluate(async () => {
        const all = await window.reviewer.queryAssets({});
        const project = all.assets[0].projectId;
        const traversal = await fetch(`asset://${project}/%2e%2e%2fsecret.bin`).then(
          (r) => r.status,
        );
        const network = await fetch('https://example.com').then(
          () => false,
          () => true,
        );
        const bridge =
          typeof (window as any).require === 'undefined' &&
          typeof (window as any).process === 'undefined';
        return { traversal, network, bridge };
      });
      assert.equal(security.traversal, 403);
      assert.equal(security.network, true);
      assert.equal(security.bridge, true);
      await page.getByRole('button', { name: 'Back to assets' }).click();
      await expect(page.getByRole('button', { name: 'Inspect Arc chair.glb' })).toBeFocused();
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      await page.getByLabel('Preview available').check();
      await expect(page.locator('.collection-count')).toHaveText('9 files');
      await expect(page.getByText('Preview unavailable', { exact: true })).toHaveCount(0);
      await page.getByLabel('Filter format').selectOption('obj');
      await expect(page.locator('.collection-count')).toHaveText('0 files');
      await page.getByRole('button', { name: 'Clear filters' }).click();
      await expect(page.getByLabel('Preview available')).not.toBeChecked();
      await expect(page.locator('.collection-count')).toHaveText('12 files');
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      await page.getByLabel('Search assets').fill('Sculpture');
      await page.getByRole('button', { name: 'Inspect Sculpture.glb' }).click();
      await expect(page.getByLabel('Animation clip')).toBeVisible({ timeout: 20000 });
      await page.getByRole('button', { name: 'Play animation' }).click();
      await expect(page.getByRole('button', { name: 'Pause animation' })).toBeVisible();
      assert.deepEqual(errors, []);
      await app.close();
      app = await launch(data);
      const again = await app.firstWindow();
      await again.locator('.recent-list button').first().click();
      await again.getByRole('button', { name: 'Inspect Arc chair.glb' }).click();
      await expect(again.getByText('Soften the front edge.')).toBeVisible();
      await expect(again.getByText('Keep this draft across selection changes.')).toBeVisible();
      await expect(again.getByLabel('Review status')).toHaveValue('approved');
    } finally {
      await app?.close();
      await rm(base, { recursive: true, force: true });
    }
  },
);

test(
  'Electron: local Draco, Meshopt and KTX2 decoders render offline',
  { timeout: 60000 },
  async () => {
    const base = await mkdtemp(path.join(tmpdir(), 'reviewer-codecs-'));
    const root = path.join(base, 'project');
    const data = path.join(base, 'data');
    await mkdir(data);
    await createCodecFixtures(root);
    const app = await launch(data);
    if (process.env.DEBUG_CODECS)
      app.on('window', (p) => {
        p.on('console', (m) => console.log('renderer:', m.type(), m.text()));
        p.on('pageerror', (e) => console.log('renderer error:', e.message));
      });
    try {
      const page = await app.firstWindow();
      await picker(app, root);
      await page.getByRole('button', { name: /Open a project folder/ }).click();
      await expect
        .poll(
          () =>
            page.evaluate(async () =>
              (await window.reviewer.queryAssets({})).assets.map((a) => ({
                name: a.name,
                preview: a.preview,
                error: a.previewError,
              })),
            ),
          { timeout: 30000 },
        )
        .toEqual([
          { name: 'Draco knot.glb', preview: 'ready', error: null },
          { name: 'KTX2 cube.gltf', preview: 'ready', error: null },
          { name: 'Meshopt knot.gltf', preview: 'ready', error: null },
        ]);
      for (const name of ['Draco knot.glb', 'KTX2 cube.gltf', 'Meshopt knot.gltf']) {
        await page.getByRole('button', { name: `Inspect ${name}` }).click();
        await expect(page.getByText('Drag to orbit')).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: 'Back to assets' }).click();
      }
    } finally {
      await app.close();
      await rm(base, { recursive: true, force: true });
    }
  },
);

test(
  'Electron: explicit external grants, thumbnail recovery, and deleting comments',
  { timeout: 60000 },
  async () => {
    const base = await mkdtemp(path.join(tmpdir(), 'reviewer-recovery-'));
    const root = path.join(base, 'project');
    const data = path.join(base, 'data');
    const shared = path.join(base, 'shared');
    await mkdir(data);
    await mkdir(shared);
    await createFixtures(root);
    const file = path.join(root, 'Validation/Textured-space #1.gltf');
    const json = JSON.parse(await readFile(file, 'utf8'));
    await rename(path.join(root, 'Validation/geometry.bin'), path.join(shared, 'geometry.bin'));
    json.buffers[0].uri = '../../shared/geometry.bin';
    await writeFile(file, JSON.stringify(json));
    const app = await launch(data);
    try {
      const page = await app.firstWindow();
      await picker(app, root);
      await page.getByRole('button', { name: /Open a project folder/ }).click();
      await expect
        .poll(() =>
          page.evaluate(
            async () =>
              (await window.reviewer.queryAssets({ search: 'Textured-space' })).assets[0]?.preview,
          ),
        )
        .toBe('failed');
      await page.getByRole('button', { name: 'Project settings' }).click();
      await picker(app, shared);
      await page.getByRole('button', { name: 'Allow resource folder…' }).click();
      await expect(page.getByRole('button', { name: 'Remove access' })).toBeVisible();
      await page.getByRole('button', { name: 'Close settings' }).click();
      await expect
        .poll(
          () =>
            page.evaluate(
              async () =>
                (await window.reviewer.queryAssets({ search: 'Textured-space' })).assets[0]
                  ?.preview,
            ),
          { timeout: 15000 },
        )
        .toBe('ready');
      await page.getByLabel('Search assets').fill('Textured-space');
      await page.getByRole('button', { name: 'Inspect Textured-space #1.gltf' }).click();
      await expect(page.getByText('Drag to orbit')).toBeVisible();
      await page.getByLabel('Comment', { exact: true }).fill('Temporary review');
      await page.getByRole('button', { name: 'Add comment', exact: true }).click();
      await expect(page.getByText('Saved beside asset')).toBeVisible();
      await page.getByRole('button', { name: 'Delete comment', exact: true }).click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.getByText('No notes. A clear starting point.')).toBeVisible();
      assert.equal(
        JSON.parse(
          await readFile(path.join(root, 'Validation/.Textured-space #1.gltf.notes.json'), 'utf8'),
        ).comments.length,
        0,
      );
      await app.evaluate(({ BrowserWindow }) => {
        const thumbnail = BrowserWindow.getAllWindows().find((w) =>
          w.webContents.getURL().endsWith('/thumbnail.html'),
        );
        thumbnail?.webContents.forcefullyCrashRenderer();
      });
      await page.evaluate(() => window.reviewer.clearCache());
      await expect
        .poll(
          () =>
            page.evaluate(
              async () =>
                (await window.reviewer.queryAssets({ search: 'Textured-space' })).assets[0]
                  ?.preview,
            ),
          { timeout: 15000 },
        )
        .toBe('ready');
      await page.getByRole('button', { name: 'Project settings' }).click();
      await page.getByRole('button', { name: 'Remove access' }).click();
      await page.getByRole('button', { name: 'Close settings' }).click();
      await expect
        .poll(() =>
          page.evaluate(
            async () =>
              (await window.reviewer.queryAssets({ search: 'Textured-space' })).assets[0]
                ?.dependencyErrors.length,
          ),
        )
        .toBe(1);
    } finally {
      await app.close();
      await rm(base, { recursive: true, force: true });
    }
  },
);

test(
  'Electron: folder disclosure controls preserve filters and nested state across refreshes',
  { timeout: 30000 },
  async () => {
    const base = await mkdtemp(path.join(tmpdir(), 'voro-folders-'));
    const root = path.join(base, 'project');
    const data = path.join(base, 'data');
    await mkdir(data);
    for (const file of ['Art/Props/Crate.obj', 'Art/Characters/Hero.obj', 'Artists/Marker.obj']) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), 'o Fixture\nv 0 0 0\n');
    }
    const app = await launch(data);
    try {
      const page = await app.firstWindow();
      await picker(app, root);
      await page.getByRole('button', { name: /Open a project folder/ }).click();
      await expect(page.locator('.collection-count')).toHaveText('3 files');
      const art = page.getByRole('button', { name: 'Show assets in Art', exact: true });
      const props = page.getByRole('button', { name: 'Show assets in Art/Props', exact: true });
      const artists = page.getByRole('button', { name: 'Show assets in Artists', exact: true });
      const branch = page.getByRole('button', { name: /^(Collapse|Expand) folder Art$/ });
      const projectToggle = page.getByRole('button', {
        name: /^(Collapse|Expand) folders in project$/,
      });
      await expect(projectToggle).toHaveAttribute('aria-expanded', 'true');
      await art.click();
      await expect(page.locator('.collection-count')).toHaveText('2 files');
      await branch.click();
      await expect(branch).toHaveAttribute('aria-expanded', 'false');
      await expect(props).toBeHidden();
      await expect(artists).toBeVisible();
      await expect(art).toHaveAttribute('aria-current', 'location');
      await expect(page.locator('.collection-count')).toHaveText('2 files');
      await page.getByRole('button', { name: 'Rescan project' }).click();
      await expect
        .poll(() => page.evaluate(async () => (await window.reviewer.summary()).scan.running))
        .toBe(false);
      await expect(props).toBeHidden();
      await projectToggle.click();
      await expect(projectToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(art).toBeHidden();
      await expect(page.locator('.collection-count')).toHaveText('2 files');
      // Disclosure remains a native button, so keyboard activation works too.
      await projectToggle.press('Space');
      await expect(art).toBeVisible();
      await expect(props).toBeHidden();
      await branch.press('Enter');
      await expect(props).toBeVisible();
      await props.click();
      await expect(page.locator('.collection-count')).toHaveText('1 files');
      await expect(page.getByRole('button', { name: 'Inspect Crate.obj' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: /^(Collapse|Expand) folder Art\/Props$/ }),
      ).toHaveCount(0);
      await mkdir('test-results', { recursive: true });
      await page.screenshot({ path: 'test-results/folders-expanded.png' });
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().endsWith('/index.html'))!
          .setSize(1080, 700),
      );
      await projectToggle.click();
      await page.screenshot({ path: 'test-results/folders-collapsed.png' });
    } finally {
      await app.close();
      await rm(base, { recursive: true, force: true });
    }
  },
);
