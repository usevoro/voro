import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  DAY,
  visibleReleaseData,
  validateManifest,
  refreshManifest,
} from '../scripts/releases.mjs';
import { renderPage } from '../scripts/render.mjs';
import { resolveConfig } from '../scripts/config.mjs';
const baseline = JSON.parse(await readFile(new URL('../data/releases.json', import.meta.url)));
const config = resolveConfig(
  JSON.parse(await readFile(new URL('../data/site.json', import.meta.url))),
  {},
);
const now = Date.parse('2026-09-08T22:00:00Z');
function available() {
  const m = structuredClone(baseline);
  m.repository = 'usevoro/releases';
  Object.assign(m.targets[0], {
    status: 'available',
    version: '0.1.0',
    tag: 'v0.1.0',
    assetName: 'VORO-arm64.zip',
    minimumOS: 'macOS 14 or later',
    fileType: 'ZIP',
    signing: 'Unsigned early-access build',
    channel: 'prerelease',
    sizeBytes: 100000,
    url: 'https://github.com/usevoro/releases/releases/download/v0.1.0/VORO-arm64.zip',
    releaseNotesUrl: 'https://github.com/usevoro/releases/releases/tag/v0.1.0',
    verifiedAt: new Date(now).toISOString(),
  });
  m.stars = { repository: m.repository, count: 0, fetchedAt: new Date(now).toISOString() };
  return m;
}
test('private launch has all platform states and no private repo, fake download, or stars', () => {
  const html = renderPage(config, visibleReleaseData(baseline, null, now));
  assert.equal((html.match(/Not available yet/g) || []).length, 4);
  assert.match(html, /View platform availability/);
  assert.doesNotMatch(html, /href="https:\/\/github.com\/usevoro\/voro/);
  assert.doesNotMatch(html, /class="button download"|star-count/);
  assert.match(html, /href="https:\/\/github.com\/usevoro"/);
});
test('verified explicit public assets render usable direct links and real zero stars', () => {
  const m = available();
  const data = visibleReleaseData(m, m.repository, now);
  assert.equal(data.stars, 0);
  const html = renderPage({ ...config, publicRepository: m.repository }, data);
  assert.match(
    html,
    /href="https:\/\/github.com\/usevoro\/releases\/releases\/download\/v0.1.0\/VORO-arm64.zip"/,
  );
  assert.match(html, /0 stars/);
  assert.match(html, /Early access/);
  assert.match(html, /Unsigned early-access build/);
});
test('expired, future-dated, or unapproved verification never creates downloads', () => {
  const m = available();
  assert.equal(visibleReleaseData(m, null, now).targets[0].status, 'unavailable');
  for (const clock of [now + DAY + 1, now - 1]) {
    const result = visibleReleaseData(m, m.repository, clock);
    assert.equal(result.targets[0].status, 'unavailable');
    assert.equal(result.stars, null);
  }
});
test('validator rejects missing targets, duplicates, malicious URLs, and incomplete metadata', () => {
  const edits = [
    (m) => m.targets.pop(),
    (m) => m.targets.push(m.targets[0]),
    (m) => {
      delete m.targets[0].minimumOS;
    },
    (m) => {
      m.targets[0].url = 'https://evil.example/VORO.zip';
    },
    (m) => {
      m.targets[0].url = 'javascript:alert(1)';
    },
    (m) => {
      m.targets[0].url = 'https://github.com/another/repo/releases/download/v1/VORO.zip';
    },
    (m) => {
      m.targets[0].sizeBytes = 0;
    },
  ];
  for (const edit of edits) {
    const m = available();
    edit(m);
    assert.throws(() => validateManifest(m));
  }
});
test('anonymous refresh uses exact asset mapping, updates real size, and handles zero stars', async () => {
  const m = available();
  const calls = [];
  const result = await refreshManifest(
    m,
    m.repository,
    async (url, options) => {
      calls.push({ url, options });
      return Response.json(
        url.endsWith('/releases/tags/v0.1.0')
          ? {
              tag_name: 'v0.1.0',
              draft: false,
              prerelease: true,
              html_url: m.targets[0].releaseNotesUrl,
              assets: [
                {
                  name: 'VORO-arm64.zip',
                  state: 'uploaded',
                  size: 12345,
                  browser_download_url: m.targets[0].url,
                },
              ],
            }
          : { private: false, full_name: m.repository, stargazers_count: 0 },
      );
    },
    now + 1000,
  );
  assert.equal(result.targets[0].sizeBytes, 12345);
  assert.equal(result.stars.count, 0);
  assert.ok(calls.every((c) => !('Authorization' in c.options.headers)));
});
test('withdrawn or changed-channel releases become unavailable', async () => {
  for (const payload of [
    null,
    { tag_name: 'v0.1.0', draft: false, prerelease: false, assets: [] },
  ]) {
    const m = available();
    const result = await refreshManifest(
      m,
      m.repository,
      async (url) =>
        url.endsWith('/releases/tags/v0.1.0')
          ? payload
            ? Response.json(payload)
            : new Response('', { status: 404 })
          : Response.json({ private: false, full_name: m.repository, stargazers_count: 3 }),
      now,
    );
    assert.equal(result.targets[0].status, 'unavailable');
  }
});
test('API failures retain a bounded cache, not invented counts', async () => {
  const m = available();
  const result = await refreshManifest(
    m,
    m.repository,
    async () => {
      throw new Error('Offline');
    },
    now + DAY + 1,
  );
  assert.equal(visibleReleaseData(result, m.repository, now + DAY + 1).stars, null);
  assert.equal(
    visibleReleaseData(result, m.repository, now + DAY + 1).targets[0].status,
    'unavailable',
  );
});
test('static page has semantic SEO, no-JS content, safe JSON-LD and real asset paths', () => {
  const html = renderPage(config, visibleReleaseData(baseline, null, now));
  assert.equal((html.match(/<h1 /g) || []).length, 1);
  for (const expected of [
    'name="description"',
    'rel="canonical"',
    'property="og:image"',
    'name="twitter:card"',
    'name="robots" content="noindex, nofollow"',
    '<details>',
    'id="inspection"',
    'id="collection"',
    '/example-review.notes.json',
  ])
    assert.ok(html.includes(expected), expected);
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(json['@graph'][2]['@type'], 'SoftwareApplication');
  assert.ok(!('aggregateRating' in json['@graph'][2]));
  assert.ok(!('offers' in json['@graph'][2]));
  assert.doesNotMatch(html, /<figure[^>]*hidden|\/Users\/|\/var\/folders\//);
});
test('every shipped local image, font, script and example file exists', async () => {
  const html = renderPage(config, visibleReleaseData(baseline, null, now));
  const paths = [...html.matchAll(/(?:src|href)="(\/(?!\/)[^"#]*)"/g)]
    .map((m) => m[1])
    .filter((p) => p !== '/');
  for (const asset of new Set(paths)) await readFile(new URL('../public' + asset, import.meta.url));
});
