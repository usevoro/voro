import { mkdir } from 'node:fs/promises';
import { Catalog } from './catalog';
const port = (
  process as unknown as {
    parentPort: {
      on(event: string, callback: (event: { data: any }) => void): void;
      postMessage(message: unknown): void;
    };
  }
).parentPort;
let catalog: Catalog;
port.on('message', async ({ data: message }) => {
  const { id, method, args } = message;
  try {
    if (method === 'init') {
      await mkdir(args[0], { recursive: true });
      catalog = new Catalog(args[0], () => port.postMessage({ event: 'change' }));
      port.postMessage({ id, result: true });
      return;
    }
    const methods: Record<string, (...args: any[]) => any> = {
      open: (root) => catalog.open(root),
      recent: () => catalog.recent(),
      query: (q) => catalog.query(q),
      summary: () => catalog.summary(),
      get: (id) => catalog.get(id),
      exportReviews: () => catalog.exportReviews(),
      review: (id) => catalog.review(id),
      save: (value) => catalog.save(value),
      source: (id) => catalog.source(id),
      rescan: () => catalog.startScan(),
      cancel: () => catalog.cancel(),
      preview: (...a) => catalog.preview(a[0], a[1], a[2], a[3], a[4]),
      clearCache: () => catalog.clearCache(),
      cacheThumbnail: (key, data) => catalog.cacheThumbnail(key, data),
      exclusions: (x) => catalog.setExclusions(x),
      externalRoots: (x) => catalog.setExternalRoots(x),
      reattach: (orphan, asset) => catalog.reattach(orphan, asset),
    };
    if (!methods[method]) throw new Error('Unknown catalog operation');
    const result = await methods[method](...args);
    port.postMessage({ id, result });
  } catch (error) {
    port.postMessage({ id, error: (error as Error).message });
  }
});
