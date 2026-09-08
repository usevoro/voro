import { readFile, writeFile, rename } from 'node:fs/promises';
import { refreshManifest } from './releases.mjs';
const config = JSON.parse(await readFile(new URL('../data/site.json', import.meta.url)));
const file = new URL('../data/releases.json', import.meta.url);
const manifest = JSON.parse(await readFile(file));
const refreshed = await refreshManifest(manifest, config.publicRepository);
await writeFile(
  new URL('../data/releases.json.tmp', import.meta.url),
  JSON.stringify(refreshed, null, 2) + '\n',
);
await rename(new URL('../data/releases.json.tmp', import.meta.url), file);
console.log(
  config.publicRepository
    ? 'Public release data refreshed; stale assets fail closed at build.'
    : 'No public release repository configured; platform availability preserved.',
);
