import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { visibleReleaseData, repositoryName } from './releases.mjs';
import { renderPage } from './render.mjs';
import { resolveConfig } from './config.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const config = resolveConfig(JSON.parse(await readFile(path.join(root, 'data/site.json'))));
if (config.publicRepository) repositoryName(config.publicRepository);
if (config.organizationUrl !== 'https://github.com/usevoro')
  throw new Error('Unexpected organization.');
for (const key of ['docsUrl', 'issuesUrl'])
  if (
    config[key] &&
    (!config.publicRepository ||
      !config[key].startsWith(`https://github.com/${config.publicRepository}/`))
  )
    throw new Error('Public links must use the approved public repository.');
const manifest = JSON.parse(await readFile(path.join(root, 'data/releases.json')));
const releases = visibleReleaseData(manifest, config.publicRepository);
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(path.join(root, 'public'), dist, { recursive: true });
await writeFile(path.join(dist, 'index.html'), renderPage(config, releases));
await writeFile(
  path.join(dist, 'robots.txt'),
  config.indexable
    ? `User-agent: *\nAllow: /\nSitemap: ${config.origin}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n',
);
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${config.indexable ? `<url><loc>${config.origin}/</loc></url>` : ''}</urlset>\n`,
);
await writeFile(
  path.join(dist, '404.html'),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found — VORO</title><link rel="stylesheet" href="/styles.css"><main class="wrap section"><h1>A little off the path.</h1><p>This page isn’t here.</p><a class="button" href="/">Back to VORO</a></main></html>`,
);
console.log(
  `Built VORO landing page (${config.indexable ? 'indexable' : 'private preview / noindex'}).`,
);
