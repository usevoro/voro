import { mkdtemp, mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir, cpus, totalmem, release } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Catalog } from '../src/catalog/catalog';
import { createFixtures } from './fixtures';
const base = await mkdtemp(path.join(tmpdir(), 'reviewer-bench-'));
const root = path.join(base, 'project'),
  data = path.join(base, 'data');
await mkdir(root);
await mkdir(data);
await createFixtures(path.join(base, 'source'));
const fixture = path.join(base, 'source/Furniture/Arc chair.glb');
console.log('Preparing 10,000 models and 40,000 dependency-like files…');
for (let folder = 0; folder < 100; folder++) {
  const dir = path.join(root, `folder-${folder.toString().padStart(3, '0')}`);
  await mkdir(dir);
  await Promise.all(
    Array.from({ length: 100 }, (_, i) =>
      copyFile(fixture, path.join(dir, `chair-${i.toString().padStart(3, '0')}.glb`)),
    ),
  );
  await Promise.all(
    Array.from({ length: 400 }, (_, i) =>
      writeFile(path.join(dir, `resource-${i}.txt`), 'fixture'),
    ),
  );
}
let firstResultMs: number | null = null;
const start = performance.now();
let catalog = new Catalog(data, () => {
  if (firstResultMs === null && catalog?.summary().total) firstResultMs = performance.now() - start;
});
await catalog.open(root);
await catalog.scanPromise;
const coldScanMs = performance.now() - start;
const queryTimes = [];
for (let i = 0; i < 100; i++) {
  const before = performance.now();
  catalog.query({ search: 'chair', offset: i * 90, limit: 100 });
  queryTimes.push(performance.now() - before);
}
const rssMb = process.memoryUsage().rss / 1048576;
await catalog.close();
const reopen = performance.now();
catalog = new Catalog(data, () => {});
await catalog.open(root);
const count = catalog.query({ limit: 100 }).total;
const warmResultsMs = performance.now() - reopen;
await catalog.close();
const report = {
  date: new Date().toISOString(),
  platform: process.platform,
  arch: process.arch,
  osRelease: release(),
  cpu: cpus()[0].model,
  memoryGb: totalmem() / 1073741824,
  node: process.version,
  storage: 'Local macOS temporary directory, APFS; disk model not measured',
  assets: count,
  totalFiles: 50000,
  firstResultMs,
  coldScanMs,
  warmResultsMs,
  queryMeanMs: queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length,
  queryMaxMs: Math.max(...queryTimes),
  nodeRssMb: rssMb,
  scope:
    'Catalog only. Repeated 72-triangle chair fixture; no GPU thumbnails or scrolling benchmark. Not a real-asset performance claim.',
};
await mkdir('docs', { recursive: true });
await writeFile('docs/benchmark.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
await rm(base, { recursive: true, force: true });
