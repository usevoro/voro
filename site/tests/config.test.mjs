import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveConfig } from '../scripts/config.mjs';
const input = { origin: null, indexable: false };
test('Vercel previews use deployment metadata and stay noindex', () => {
  const config = resolveConfig(input, {
    VERCEL_ENV: 'preview',
    VERCEL_URL: 'voro-preview.vercel.app',
    SITE_INDEXABLE: 'true',
  });
  assert.equal(config.indexable, false);
  assert.equal(config.origin, 'https://voro-preview.vercel.app');
});
test('public indexing requires an explicit production origin', () => {
  assert.throws(() =>
    resolveConfig(input, {
      VERCEL_ENV: 'production',
      SITE_INDEXABLE: 'true',
      VERCEL_URL: 'voro.vercel.app',
    }),
  );
  const config = resolveConfig(input, {
    VERCEL_ENV: 'production',
    SITE_INDEXABLE: 'true',
    SITE_ORIGIN: 'https://voro.example',
  });
  assert.equal(config.indexable, true);
  assert.equal(config.origin, 'https://voro.example');
});
test('preview cannot index even with production configuration', () => {
  const config = resolveConfig(
    { origin: 'https://voro.example', indexable: true },
    { VERCEL_ENV: 'preview' },
  );
  assert.equal(config.indexable, false);
});
test('invalid origins fail instead of emitting broken canonical links', () => {
  for (const origin of [
    'http://voro.example',
    'https://voro.example/path',
    'https://user:pass@voro.example',
    'https://voro.example/?a=b',
  ])
    assert.throws(() => resolveConfig(input, { SITE_ORIGIN: origin }));
});
