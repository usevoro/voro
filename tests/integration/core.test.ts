import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  symlink,
  rename,
  chmod,
  rm,
  stat,
  realpath,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Catalog } from '../../src/catalog/catalog';
import { authorizePath, isWithin } from '../../src/catalog/paths';
import { readReview, saveReview, sidecarPath } from '../../src/catalog/notes';
import { createFixtures } from '../../scripts/fixtures';
const comment = (text: string) => ({
  id: randomUUID(),
  text,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
async function setup() {
  const base = await mkdtemp(path.join(tmpdir(), 'reviewer-test-'));
  const root = path.join(base, 'project');
  const data = path.join(base, 'data');
  await mkdir(root);
  await mkdir(data);
  return { base, root, data };
}
async function eventually(fn: () => boolean | Promise<boolean>, timeout = 5000) {
  const start = Date.now();
  while (!(await fn())) {
    if (Date.now() - start > timeout) throw new Error('Condition timed out');
    await new Promise((r) => setTimeout(r, 80));
  }
}
test('authorization rejects traversal, symlink escapes and Windows sibling prefixes', async () => {
  const { base, root } = await setup();
  try {
    await writeFile(path.join(base, 'secret.bin'), 'secret');
    await writeFile(path.join(root, 'a #%.bin'), 'ok');
    await symlink(path.join(base, 'secret.bin'), path.join(root, 'escape.bin'));
    assert.equal(
      await authorizePath(root, 'a #%.bin'),
      await realpath(path.join(root, 'a #%.bin')),
    );
    await assert.rejects(authorizePath(root, '../secret.bin'));
    await assert.rejects(authorizePath(root, 'escape.bin'));
    await assert.rejects(authorizePath(root, 'C:\\secret.bin'));
    assert.equal(isWithin('C:\\project', 'C:\\project-other\\secret', path.win32), false);
    assert.equal(isWithin('C:\\project', 'D:\\project\\secret', path.win32), false);
    assert.equal(isWithin('C:\\project', 'C:\\project\\models\\a.glb', path.win32), true);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
test('notes use explicit saves, survive edits, reject stale writers and preserve malformed sidecars', async () => {
  const { base, root } = await setup();
  const source = path.join(root, 'chair.glb');
  await writeFile(source, 'model');
  try {
    const initial = await readReview(source);
    assert.equal(initial.revision, null);
    assert.equal(await stat(sidecarPath(source)).catch(() => null), null);
    const first = await saveReview(source, {
      assetId: 'catalog-id',
      revision: null,
      status: 'needs_changes',
      comments: [comment('Smooth the edge')],
    });
    assert.equal(first.review.comments[0].text, 'Smooth the edge');
    assert.equal(first.review.assetFile, 'chair.glb');
    await assert.rejects(
      saveReview(source, {
        assetId: 'catalog-id',
        revision: null,
        status: 'approved',
        comments: [],
      }),
      /CONFLICT/,
    );
    const second = await saveReview(source, {
      assetId: 'catalog-id',
      revision: first.revision,
      status: 'approved',
      comments: [],
    });
    assert.equal(second.review.assetId, first.review.assetId);
    assert.equal(second.review.comments.length, 0);
    await writeFile(sidecarPath(source), '{broken');
    const malformed = await readReview(source);
    assert.ok(malformed.error);
    await assert.rejects(
      saveReview(source, {
        assetId: 'x',
        revision: malformed.revision,
        status: 'approved',
        comments: [],
      }),
    );
    assert.equal(await readFile(sidecarPath(source), 'utf8'), '{broken');
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
test('serialized writes admit only one concurrent save from the same revision', async () => {
  const { base, root } = await setup();
  const source = path.join(root, 'a.glb');
  await writeFile(source, 'model');
  try {
    const writes = await Promise.allSettled(
      ['one', 'two'].map((text) =>
        saveReview(source, {
          assetId: 'x',
          revision: null,
          status: 'unreviewed',
          comments: [comment(text)],
        }),
      ),
    );
    assert.equal(writes.filter((w) => w.status === 'fulfilled').length, 1);
    assert.equal((await readReview(source)).review.comments.length, 1);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
test('read-only and symbolic-link sidecars cannot be overwritten', async () => {
  const { base, root } = await setup();
  const source = path.join(root, 'a.glb');
  await writeFile(source, 'model');
  try {
    await chmod(root, 0o555);
    assert.equal((await readReview(source)).writable, false);
    await assert.rejects(
      saveReview(source, { assetId: 'x', revision: null, status: 'approved', comments: [] }),
    );
    await chmod(root, 0o755);
    const other = path.join(base, 'notes.json');
    await writeFile(other, 'untouched');
    await symlink(other, sidecarPath(source));
    assert.ok((await readReview(source)).error);
    await assert.rejects(
      saveReview(source, { assetId: 'x', revision: null, status: 'approved', comments: [] }),
    );
    assert.equal(await readFile(other, 'utf8'), 'untouched');
  } finally {
    await chmod(root, 0o755);
    await rm(base, { recursive: true, force: true });
  }
});
test('catalog discovers nested fixtures, filters pages and reconstructs reviews without a database', async () => {
  const { base, root, data } = await setup();
  await createFixtures(root);
  await mkdir(path.join(root, 'node_modules'));
  await writeFile(path.join(root, 'node_modules/ignored.glb'), 'ignored');
  await symlink(root, path.join(root, 'loop'));
  let changes = 0;
  let catalog = new Catalog(data, () => changes++);
  try {
    await catalog.open(root);
    await catalog.scanPromise;
    assert.equal(catalog.summary().total, 12);
    assert.equal(catalog.summary().scan.skipped, 1);
    assert.ok(changes >= 2);
    assert.equal(catalog.query({ format: 'obj' }).assets[0].preview, 'unsupported');
    assert.equal(catalog.query({ search: 'Missing' }).assets[0].dependencyErrors.length, 1);
    assert.equal(catalog.query({ folder: 'Furniture', limit: 2 }).assets.length, 2);
    assert.equal(catalog.query({ folder: 'Furniture', limit: 2 }).total, 3);
    const asset = catalog.query({ search: 'Arc chair' }).assets[0];
    await catalog.save({
      assetId: asset.id,
      revision: null,
      status: 'needs_changes',
      comments: [comment('Keep this feedback')],
    });
    assert.equal(catalog.query({ comments: true, status: 'needs_changes' }).total, 1);
    await catalog.close();
    await rm(data, { recursive: true });
    await mkdir(data);
    catalog = new Catalog(data, () => {});
    await catalog.open(root);
    await catalog.scanPromise;
    assert.equal(catalog.query({ comments: true }).total, 1);
    assert.equal(
      (await catalog.review(catalog.query({ comments: true }).assets[0].id)).review.comments[0]
        .text,
      'Keep this feedback',
    );
  } finally {
    await catalog.close();
    await rm(base, { recursive: true, force: true });
  }
});
test('watcher invalidates dependent previews, refreshes notes and tracks source moves', async () => {
  const { base, root, data } = await setup();
  await createFixtures(root);
  const catalog = new Catalog(data, () => {});
  try {
    await catalog.open(root);
    await catalog.scanPromise;
    await new Promise((r) => setTimeout(r, 300));
    const asset = catalog.query({ search: 'Textured-space' }).assets[0];
    const original = asset.fingerprint;
    await catalog.preview(asset.id, asset.fingerprint, 'ready', 'cached.png', null);
    const buffer = path.join(root, 'Validation/geometry.bin');
    await writeFile(buffer, Buffer.concat([await readFile(buffer), Buffer.alloc(4)]));
    await eventually(() => catalog.get(asset.id)!.fingerprint !== original);
    assert.equal(catalog.get(asset.id)!.preview, 'queued');
    const source = await catalog.source(asset.id);
    const saved = await catalog.save({
      assetId: asset.id,
      revision: null,
      status: 'approved',
      comments: [comment('Travel with this asset')],
    });
    const external = { ...saved.review, status: 'needs_changes' };
    await writeFile(sidecarPath(source), JSON.stringify(external));
    await eventually(() => catalog.get(asset.id)!.status === 'needs_changes');
    const moved = path.join(root, 'Validation/Renamed.gltf');
    await rename(source, moved);
    await rename(sidecarPath(source), sidecarPath(moved));
    catalog.startScan();
    await catalog.scanPromise;
    const movedAsset = catalog.query({ search: 'Renamed' }).assets[0];
    assert.equal((await catalog.review(movedAsset.id)).review.assetId, saved.review.assetId);
    assert.equal((await catalog.review(movedAsset.id)).error, undefined);
    assert.equal((await catalog.review(movedAsset.id)).review.assetFile, 'Renamed.gltf');
  } finally {
    await catalog.close();
    await rm(base, { recursive: true, force: true });
  }
});
test('external dependency grants are explicit and revocable', async () => {
  const { base, root, data } = await setup();
  await createFixtures(root);
  const shared = path.join(base, 'shared');
  await mkdir(shared);
  const file = path.join(root, 'Validation/Textured-space #1.gltf');
  const json = JSON.parse(await readFile(file, 'utf8'));
  await rename(path.join(root, 'Validation/geometry.bin'), path.join(shared, 'geometry.bin'));
  json.buffers[0].uri = '../../shared/geometry.bin';
  await writeFile(file, JSON.stringify(json));
  const catalog = new Catalog(data, () => {});
  try {
    await catalog.open(root);
    await catalog.scanPromise;
    assert.equal(catalog.query({ search: 'Textured-space' }).assets[0].dependencyErrors.length, 1);
    await catalog.setExternalRoots([shared]);
    await catalog.scanPromise;
    assert.equal(catalog.query({ search: 'Textured-space' }).assets[0].dependencyErrors.length, 0);
    await authorizePath(root, '../shared/geometry.bin', [shared]);
    await assert.rejects(authorizePath(root, '../shared/geometry.bin'));
    await catalog.setExternalRoots([]);
    await catalog.scanPromise;
    assert.equal(catalog.query({ search: 'Textured-space' }).assets[0].dependencyErrors.length, 1);
  } finally {
    await catalog.close();
    await rm(base, { recursive: true, force: true });
  }
});
test('cancel leaves discovered rows usable and rescan reconciles removed sources and orphan notes', async () => {
  const { base, root, data } = await setup();
  await createFixtures(root);
  for (let i = 0; i < 600; i++) await writeFile(path.join(root, `model-${i}.glb`), 'malformed');
  let cancel = true;
  const catalog = new Catalog(data, () => {
    if (cancel && catalog.scan.discovered > 0 && catalog.scan.running) catalog.cancel();
  });
  try {
    await catalog.open(root);
    await catalog.scanPromise;
    assert.equal(catalog.scan.canceled, true);
    assert.ok(catalog.query({}).total > 0);
    assert.ok(catalog.query({}).total < 612);
    cancel = false;
    catalog.startScan();
    await catalog.scanPromise;
    assert.equal(catalog.query({}).total, 612);
    const asset = catalog.query({ search: 'Arc chair' }).assets[0];
    await catalog.save({
      assetId: asset.id,
      revision: null,
      status: 'approved',
      comments: [comment('Keep the orphan safe')],
    });
    await rm(await catalog.source(asset.id));
    catalog.startScan();
    await catalog.scanPromise;
    assert.equal(catalog.query({ search: 'Arc chair' }).total, 0);
    assert.equal(catalog.orphans.length, 1);
    const target = catalog.query({ search: 'Low table' }).assets[0];
    await catalog.reattach(catalog.orphans[0], target.id);
    assert.equal((await catalog.review(target.id)).review.comments[0].text, 'Keep the orphan safe');
    assert.ok(await stat(path.join(root, catalog.orphans[0])));
  } finally {
    await catalog.close();
    await rm(base, { recursive: true, force: true });
  }
});

test('preview availability filters completed thumbnails before counting and pagination', async () => {
  const { base, root, data } = await setup();
  await createFixtures(root);
  const catalog = new Catalog(data, () => {});
  try {
    await catalog.open(root);
    await catalog.scanPromise;
    assert.equal(catalog.query({ previewOnly: true }).total, 0);
    const assets = catalog.query({ folder: 'Furniture' }).assets;
    for (const asset of assets.slice(0, 2))
      await catalog.preview(
        asset.id,
        asset.fingerprint,
        'ready',
        'thumbnail://cache/test.png',
        null,
      );
    await catalog.preview(assets[2].id, assets[2].fingerprint, 'failed', null, 'Invalid geometry');
    const page = catalog.query({ previewOnly: true, folder: 'Furniture', limit: 1, offset: 1 });
    assert.equal(page.total, 2);
    assert.equal(page.assets.length, 1);
    assert.equal(page.assets[0].id, assets[1].id);
    assert.equal(catalog.query({ previewOnly: true, format: 'obj' }).total, 0);
    assert.equal(catalog.query({ previewOnly: false }).total, 12);
    await catalog.preview(assets[0].id, assets[0].fingerprint, 'queued', null, null);
    assert.equal(catalog.query({ previewOnly: true }).total, 1);
  } finally {
    await catalog.close();
    await rm(base, { recursive: true, force: true });
  }
});

test('review exports preserve saved IDs and Unicode, report broken/orphan notes, and never write sidecars', async () => {
  const { base, root, data } = await setup();
  await createFixtures(root);
  const catalog = new Catalog(data, () => {});
  try {
    await catalog.open(root);
    await catalog.scanPromise;
    const asset = catalog.query({ search: 'Arc chair' }).assets[0];
    const unsupported = catalog.query({ format: 'obj' }).assets[0];
    const saved = await catalog.save({
      assetId: asset.id,
      revision: null,
      status: 'needs_changes',
      comments: [comment('Soften the edge.\nČuvaj oblik — keep the silhouette.')],
    });
    await catalog.save({
      assetId: unsupported.id,
      revision: null,
      status: 'approved',
      comments: [],
    });
    const source = await catalog.source(asset.id);
    const before = await readFile(sidecarPath(source), 'utf8');
    const broken = await catalog.source(catalog.query({ search: 'Low table' }).assets[0].id);
    await writeFile(sidecarPath(broken), '{broken');
    await writeFile(path.join(root, '.missing.glb.notes.json'), JSON.stringify(saved.review));
    catalog.startScan();
    await catalog.scanPromise;
    const exported = await catalog.exportReviews();
    const { reviewExportSchema } = await import('../../src/shared/contracts');
    assert.deepEqual(reviewExportSchema.parse(JSON.parse(JSON.stringify(exported))), exported);
    assert.equal(exported.reviews.length, 2);
    const chair = exported.reviews.find((r) => r.asset.path === asset.relativePath)!;
    assert.equal(chair.review.assetId, saved.review.assetId);
    assert.equal(chair.review.comments[0].text, saved.review.comments[0].text);
    assert.equal(chair.revision, saved.revision);
    assert.equal(chair.sidecar, 'Furniture/.Arc chair.glb.notes.json');
    assert.equal(exported.assetsWithoutSavedReview, 9);
    assert.deepEqual(exported.warnings.map((w) => w.kind).sort(), [
      'orphan_review',
      'unreadable_review',
    ]);
    assert.equal(JSON.stringify(exported).includes(root), false);
    assert.equal(await readFile(sidecarPath(source), 'utf8'), before);
    assert.equal(await readFile(sidecarPath(broken), 'utf8'), '{broken');
    assert.equal(
      (await catalog.exportReviews()).reviews[0].review.assetId,
      exported.reviews[0].review.assetId,
    );
  } finally {
    await catalog.close();
    await rm(base, { recursive: true, force: true });
  }
});
