const { test } = require('node:test');
const assert = require('node:assert/strict');
const { macSigning, windowsSigning } = require('../../scripts/signing.cjs');

test('development signing is ad-hoc and never requests notarization', () => {
  const config = macSigning({});
  assert.equal(config.osxSign.identity, '-');
  assert.equal(config.osxSign.continueOnError, false);
  assert.equal(config.osxNotarize, undefined);
});
test('distribution mode cannot silently fall back when credentials are incomplete', () => {
  for (const env of [
    { VORO_MAC_SIGNING: 'developer-id' },
    { VORO_MAC_SIGNING: 'developer-id', VORO_MAC_SIGNING_IDENTITY: '-' },
    { VORO_MAC_SIGNING: 'developer-id', VORO_MAC_SIGNING_IDENTITY: 'Apple Development: Example' },
    { VORO_MAC_SIGNING: 'developer-id', VORO_MAC_SIGNING_IDENTITY: 'A'.repeat(40) },
    { VORO_MAC_SIGNING: 'typo' },
  ])
    assert.throws(() => macSigning(env));
});
test('Developer ID builds use validated identities, hardened runtime and Keychain notarization', () => {
  const config = macSigning({
    VORO_MAC_SIGNING: 'developer-id',
    VORO_MAC_SIGNING_IDENTITY: 'Developer ID Application: Example (TEAMID)',
    VORO_NOTARY_PROFILE: 'voro-notary',
  });
  assert.equal(config.osxSign.identityValidation, true);
  assert.equal(config.osxSign.continueOnError, false);
  assert.equal(config.osxSign.optionsForFile('helper.app').hardenedRuntime, true);
  assert.deepEqual(config.osxNotarize, { keychainProfile: 'voro-notary' });
});
test('Windows distribution requires a Windows host and a fixed certificate selector', () => {
  assert.deepEqual(windowsSigning({}, 'darwin'), {});
  const env = { VORO_WINDOWS_SIGNING: 'certificate-store', VORO_WINDOWS_CERT_SHA1: 'B'.repeat(40) };
  assert.throws(() => windowsSigning(env, 'darwin'));
  assert.throws(() => windowsSigning({ ...env, VORO_WINDOWS_CERT_SHA1: 'bad /a' }, 'win32'));
  const config = windowsSigning(env, 'win32').windowsSign;
  assert.match(config.signWithParams, /\/fd SHA256/);
  assert.match(config.signWithParams, /\/tr http:\/\/timestamp.digicert.com \/td SHA256/);
  assert.equal(config.continueOnError, false);
});

test('packaging excludes local signing configuration and private key containers', () => {
  const config = require('../../forge.config.cjs');
  for (const file of [
    '/.env.signing',
    '/.env',
    '/AuthKey_TEST.p8',
    '/certificate.p12',
    '/keys/key.pem',
  ])
    assert.ok(
      config.packagerConfig.ignore.some((pattern) => pattern.test(file)),
      file,
    );
  assert.ok(!config.packagerConfig.ignore.some((pattern) => pattern.test('/LICENSE')));
});
