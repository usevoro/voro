if (Number(process.versions.node.split('.')[0]) !== 22) {
  throw new Error(
    'Package VORO with Node 22 LTS (nvm use). The current Forge ZIP extractor is incompatible with Node 26.',
  );
}

module.exports = {
  packagerConfig: {
    asar: true,
    icon: 'brand/icons/voro',
    // No native addons: all runtime JS is bundled and SQLite ships with Electron.
    // Fail early instead of accepting Forge's silent ZIP-extraction exit on Node 26.
    appBundleId: 'local.asset-reviewer.app',
    ignore: [
      /^\/brand($|\/)/,
      /^\/\.impeccable($|\/)/,
      /^\/(PRODUCT|DESIGN)\.md$/,
      /^\/src($|\/)/,
      /^\/tests($|\/)/,
      /^\/scripts($|\/)/,
      /^\/docs($|\/)/,
      /^\/node_modules($|\/)/,
      /^\/\.playwright($|\/)/,
      /^\/test-results($|\/)/,
      /^\/\.github($|\/)/,
    ],
  },
  makers: [{ name: '@electron-forge/maker-zip', platforms: ['darwin'] }],
};
