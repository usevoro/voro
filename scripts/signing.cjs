// Only public certificate selectors and Keychain profile names belong in configuration.
function macSigning(env = process.env) {
  const mode = env.VORO_MAC_SIGNING || 'adhoc';
  if (!['adhoc', 'developer-id'].includes(mode)) throw new Error('Unknown Mac signing mode.');
  const base = {
    preAutoEntitlements: false,
    continueOnError: false,
    optionsForFile: () => ({ hardenedRuntime: true }),
  };
  if (mode === 'adhoc') {
    return { osxSign: { ...base, identity: '-', identityValidation: false } };
  }
  const identity = env.VORO_MAC_SIGNING_IDENTITY;
  if (
    !identity ||
    !(/^[A-Fa-f0-9]{40}$/.test(identity) || /^Developer ID Application: .+/.test(identity))
  )
    throw new Error(
      'Set VORO_MAC_SIGNING_IDENTITY to a Developer ID Application identity or certificate SHA-1.',
    );
  if (!env.VORO_NOTARY_PROFILE?.trim())
    throw new Error('Set VORO_NOTARY_PROFILE to a validated notarytool Keychain profile.');
  return {
    osxSign: { ...base, identity, identityValidation: true },
    osxNotarize: { keychainProfile: env.VORO_NOTARY_PROFILE },
  };
}
function windowsSigning(env = process.env, platform = process.platform) {
  if (!env.VORO_WINDOWS_SIGNING) return {};
  if (env.VORO_WINDOWS_SIGNING !== 'certificate-store')
    throw new Error('Unknown Windows signing mode.');
  if (platform !== 'win32')
    throw new Error('Certificate-store signing requires a Windows build host.');
  const fingerprint = env.VORO_WINDOWS_CERT_SHA1;
  if (!/^[A-Fa-f0-9]{40}$/.test(fingerprint || ''))
    throw new Error('Set VORO_WINDOWS_CERT_SHA1 to the code-signing certificate thumbprint.');
  return {
    windowsSign: {
      signWithParams: `/sha1 ${fingerprint} /fd SHA256 /tr http://timestamp.digicert.com /td SHA256`,
      continueOnError: false,
    },
  };
}
module.exports = { macSigning, windowsSigning };
