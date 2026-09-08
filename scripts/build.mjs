import { build as bundle } from 'esbuild';
import { build } from 'vite';
import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/renderer/decoders', { recursive: true });
await bundle({
  entryPoints: {
    'main/index': 'src/main/index.ts',
    'preload/index': 'src/preload/index.ts',
    'catalog/worker': 'src/catalog/worker.ts',
  },
  outdir: 'dist',
  outExtension: { '.js': '.cjs' },
  platform: 'node',
  format: 'cjs',
  bundle: true,
  external: ['electron', 'node:sqlite'],
  sourcemap: true,
  target: 'node24',
});
await build({
  configFile: false,
  base: './',
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: false,
    rollupOptions: {
      input: { index: 'src/renderer/index.html', thumbnail: 'src/renderer/thumbnail.html' },
    },
  },
});
await cp('node_modules/three/examples/jsm/libs/draco/gltf', 'dist/renderer/decoders/draco', {
  recursive: true,
});
await cp('node_modules/three/examples/jsm/libs/basis', 'dist/renderer/decoders/basis', {
  recursive: true,
});
// Basis uses generated JavaScript bindings. Isolate that requirement to a static,
// bundled worker with its own CSP instead of enabling eval in the UI renderer.
const { KTX2Loader } = await import('three/addons/loaders/KTX2Loader.js');
const { readFile, writeFile } = await import('node:fs/promises');
const basisSource = await readFile(
  'node_modules/three/examples/jsm/libs/basis/basis_transcoder.js',
  'utf8',
);
const workerFunction = KTX2Loader.BasisWorker.toString();
const workerSource = [
  `const _EngineFormat = ${JSON.stringify(KTX2Loader.EngineFormat)};`,
  `const _EngineType = ${JSON.stringify(KTX2Loader.EngineType)};`,
  `const _TranscoderFormat = ${JSON.stringify(KTX2Loader.TranscoderFormat)};`,
  `const _BasisFormat = ${JSON.stringify(KTX2Loader.BasisFormat)};`,
  basisSource,
  workerFunction.slice(workerFunction.indexOf('{') + 1, workerFunction.lastIndexOf('}')),
].join('\n');
await writeFile('dist/renderer/ktx2-worker.js', workerSource);
const { readdir } = await import('node:fs/promises');
const { execFileSync } = await import('node:child_process');
const runtimePackages = execFileSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['ls', '--omit=dev', '--all', '--parseable'],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .slice(1);
const notices = [];
for (const directory of runtimePackages) {
  const pkg = JSON.parse(await readFile(`${directory}/package.json`, 'utf8'));
  notices.push(`${pkg.name} ${pkg.version} — ${pkg.license || 'See license below'}`);
  for (const file of await readdir(directory)) {
    if (/^(license|copying|notice)(\.|$)/i.test(file))
      notices.push(await readFile(`${directory}/${file}`, 'utf8'));
  }
}
for (const file of [
  'brand/fonts/bricolage-grotesque-LICENSE.txt',
  'brand/fonts/dm-sans-LICENSE.txt',
  'node_modules/three/examples/jsm/libs/draco/README.md',
  'node_modules/three/examples/jsm/libs/basis/README.md',
]) {
  notices.push(await readFile(file, 'utf8'));
}
await writeFile('dist/THIRD_PARTY_NOTICES.txt', notices.join('\n\n--------------------\n\n'));
