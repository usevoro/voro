import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import signing from './signing.cjs';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
if (process.versions.node.split('.')[0] !== '22') throw new Error('Use Node 22 for releases.');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const targets = [
  { id: 'mac-arm64', platform: 'darwin', arch: 'arm64' },
  { id: 'mac-x64', platform: 'darwin', arch: 'x64' },
  { id: 'windows-x64', platform: 'win32', arch: 'x64' },
  { id: 'linux-x64', platform: 'linux', arch: 'x64' },
];
const signed = process.argv.includes('--signed');
const requested = process.argv.slice(2).filter((arg) => arg !== '--signed');
if (requested.some((id) => !targets.some((target) => target.id === id)))
  throw new Error(`Choose targets from: ${targets.map((t) => t.id).join(', ')}`);
const selected = requested.length ? targets.filter((t) => requested.includes(t.id)) : targets;
if (selected.some((t) => t.platform === 'darwin') && process.platform !== 'darwin')
  throw new Error('Create macOS archives on macOS for signing.');
if (signed) {
  // Validate every requested signer before removing or building any output.
  if (selected.some((t) => t.platform === 'darwin')) {
    const options = signing.macSigning({ ...process.env, VORO_MAC_SIGNING: 'developer-id' });
    const identities = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], {
      encoding: 'utf8',
    });
    if (!identities.includes(options.osxSign.identity))
      throw new Error('The selected Developer ID identity is not installed in the Keychain.');
    try {
      execFileSync(
        'xcrun',
        ['notarytool', 'history', '--keychain-profile', process.env.VORO_NOTARY_PROFILE],
        { stdio: 'pipe' },
      );
    } catch {
      throw new Error(
        'Notary Keychain profile could not authenticate. Run notarytool store-credentials locally first.',
      );
    }
  }
  if (selected.some((t) => t.platform === 'win32'))
    signing.windowsSigning({ ...process.env, VORO_WINDOWS_SIGNING: 'certificate-store' });
}
const output = path.resolve('out/releases', pkg.version, signed ? 'signed' : 'development');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const artifacts = [];
for (const target of selected) {
  console.log(`Packaging ${target.id}…`);
  const original = path.resolve(
    'out/make/zip',
    target.platform,
    target.arch,
    `${pkg.productName}-${target.platform}-${target.arch}-${pkg.version}.zip`,
  );
  // ZIP tools can update an old archive in place; remove it to avoid retaining stale entries.
  await rm(original, { force: true });
  execFileSync(
    process.execPath,
    [
      'node_modules/@electron-forge/cli/dist/electron-forge.js',
      'make',
      '--platform',
      target.platform,
      '--arch',
      target.arch,
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        VORO_MAC_SIGNING: signed && target.platform === 'darwin' ? 'developer-id' : 'adhoc',
        VORO_WINDOWS_SIGNING: signed && target.platform === 'win32' ? 'certificate-store' : '',
      },
    },
  );
  if (target.platform === 'darwin') {
    execFileSync(
      'codesign',
      [
        '--verify',
        '--deep',
        '--strict',
        path.resolve('out', `VORO-darwin-${target.arch}`, 'VORO.app'),
      ],
      { stdio: 'inherit' },
    );
  }
  if (signed && target.platform === 'darwin') {
    const app = path.resolve('out', `VORO-darwin-${target.arch}`, 'VORO.app');
    execFileSync('xcrun', ['stapler', 'validate', app], { stdio: 'inherit' });
    execFileSync('spctl', ['--assess', '--type', 'execute', '--verbose=2', app], {
      stdio: 'inherit',
    });
  }
  if (signed && target.platform === 'win32') {
    const executable = path.resolve('out', 'VORO-win32-x64', 'VORO.exe');
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        "if ((Get-AuthenticodeSignature -LiteralPath $env:VORO_VERIFY_EXE).Status -ne 'Valid') { exit 1 }",
      ],
      { stdio: 'inherit', env: { ...process.env, VORO_VERIFY_EXE: executable } },
    );
  }
  const name = `VORO-${pkg.version}-${target.id}.zip`;
  const file = path.join(output, name);
  await copyFile(original, file);
  const bytes = await readFile(file);
  artifacts.push({
    ...target,
    signing:
      target.platform === 'darwin'
        ? signed
          ? 'developer-id-notarized'
          : 'adhoc'
        : signed && target.platform === 'win32'
          ? 'authenticode'
          : 'unsigned',
    name,
    sizeBytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
const manifest = {
  version: pkg.version,
  signedRelease: signed,
  electron: pkg.devDependencies.electron,
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  builtAt: new Date().toISOString(),
  artifacts,
};
await writeFile(path.join(output, 'build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(
  path.join(output, 'SHA256SUMS.txt'),
  artifacts.map((a) => `${a.sha256}  ${a.name}\n`).join(''),
);
console.log(`Built ${artifacts.length} archives in ${output}. This command does not publish them.`);
