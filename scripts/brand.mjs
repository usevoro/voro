import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { Resvg } from '@resvg/resvg-js';
const identity = JSON.parse(await readFile('brand/identity.json', 'utf8'));
// Keep provenance inside raster exports, including after regeneration.
function withOrigin(png, origin) {
  const data = Buffer.from(`impeccable:prompt\0Origin: ${origin}`);
  const payload = Buffer.concat([Buffer.from('tEXt'), data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  const length = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([
    png.subarray(0, png.length - 12),
    length,
    payload,
    checksum,
    png.subarray(png.length - 12),
  ]);
}

const palette = {
  ink: '#332a3c',
  muted: '#6b626c',
  paper: '#fffdfa',
  ground: '#f5f1ee',
  stage: '#e9e7e6',
  line: '#d8cfd6',
  plum: '#755087',
  apricot: '#ef9a79',
  success: '#346348',
  warning: '#85452d',
  error: '#a03949',
};
const mark = (color, accent = palette.apricot) =>
  `<path fill="${color}" fill-rule="evenodd" d="${identity.bodyPath}"/><path fill="${accent}" d="${identity.accentPath}"/>`;
const svg = (width, height, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>`;
const fonts = {
  fontFiles: ['brand/fonts/BricolageGrotesque.ttf'],
  loadSystemFonts: false,
  defaultFontFamily: 'Bricolage Grotesque',
};
await mkdir('brand/logos', { recursive: true });
await mkdir('brand/icons', { recursive: true });
await mkdir('brand/templates', { recursive: true });
for (const [name, color, accent] of [
  ['plum', palette.plum, palette.apricot],
  ['white', '#fffdfa', palette.apricot],
  ['mono', palette.ink, palette.ink],
]) {
  await writeFile(
    `brand/logos/mark-${name}.svg`,
    svg(96, 80, mark(color, accent), `VORO ${name} mark`),
  );
}
for (const [name, color] of [
  ['dark', palette.ink],
  ['light', '#fffdfa'],
]) {
  const lockup = svg(
    410,
    110,
    `<g transform="translate(0 6) scale(1.2)">${mark(color)}</g><text x="135" y="72" font-family="Bricolage Grotesque" font-size="80" font-weight="800" letter-spacing="-2" fill="${color}">voro</text><text x="136" y="96" font-family="Bricolage Grotesque" font-size="16" font-weight="800" letter-spacing="1" fill="${color}">A LOCAL 3D REVIEW WORKSPACE</text>`,
    'VORO horizontal wordmark',
  );
  await writeFile(
    `brand/logos/wordmark-${name}.svg`,
    new Resvg(lockup, { font: fonts }).toString(),
  );
  const compact = svg(
    340,
    90,
    `<g transform="translate(0 2)">${mark(color)}</g><text x="112" y="66" font-family="Bricolage Grotesque" font-size="70" font-weight="800" letter-spacing="-2" fill="${color}">voro</text>`,
    'VORO compact wordmark',
  );
  await writeFile(
    `brand/logos/wordmark-compact-${name}.svg`,
    new Resvg(compact, { font: fonts }).toString(),
  );
}
const icon = svg(
  1024,
  1024,
  `<rect x="80" y="80" width="864" height="864" rx="190" fill="#332a3c"/><g transform="translate(176 232) scale(7)">${mark('#fffdfa')}</g>`,
  'VORO application icon',
);
await writeFile('brand/icons/voro.svg', icon);
// Windows ICO container with PNG payloads, using the same authored icon geometry.
const iconSizes = [16, 32, 48, 256];
const icoHeader = Buffer.alloc(6 + iconSizes.length * 16);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(iconSizes.length, 4);
const icoImages = [];
let icoOffset = icoHeader.length;
for (const [index, size] of iconSizes.entries()) {
  const png = new Resvg(icon, { fitTo: { mode: 'width', value: size } }).render().asPng();
  const offset = 6 + index * 16;
  icoHeader[offset] = icoHeader[offset + 1] = size === 256 ? 0 : size;
  icoHeader.writeUInt16LE(1, offset + 4);
  icoHeader.writeUInt16LE(32, offset + 6);
  icoHeader.writeUInt32LE(png.length, offset + 8);
  icoHeader.writeUInt32LE(icoOffset, offset + 12);
  icoImages.push(png);
  icoOffset += png.length;
}
await writeFile('brand/icons/voro.ico', Buffer.concat([icoHeader, ...icoImages]));

await mkdir('brand/icons/voro.iconset', { recursive: true });
for (const size of [16, 32, 128, 256, 512]) {
  for (const scale of [1, 2]) {
    const png = withOrigin(
      new Resvg(icon, { fitTo: { mode: 'width', value: size * scale } }).render().asPng(),
      'Authored vector brand/identity.json and scripts/brand.mjs. Plum macOS icon with butter-yellow sprout mascot and apricot leaf. Deterministically rasterized using Resvg; no image generation.',
    );
    await writeFile(
      `brand/icons/voro.iconset/icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`,
      png,
    );
    if (size === 512 && scale === 2) await writeFile('brand/icons/voro-1024.png', png);
  }
}
if (process.platform === 'darwin')
  execFileSync('iconutil', [
    '-c',
    'icns',
    'brand/icons/voro.iconset',
    '-o',
    'brand/icons/voro.icns',
  ]);
await rm('brand/icons/voro.iconset', { recursive: true });
const worldArt = (await readFile('brand/art/little-world.png')).toString('base64');
const cover = svg(
  1600,
  900,
  `<rect width="1600" height="900" fill="#fffdfa"/><image x="700" y="0" width="900" height="900" href="data:image/png;base64,${worldArt}"/><g transform="translate(58 58) scale(.9)">${mark('#755087')}</g><text x="164" y="119" font-family="Bricolage Grotesque" font-size="70" font-weight="800" letter-spacing="-2" fill="#332a3c">voro</text><text x="66" y="394" font-family="Bricolage Grotesque" font-size="76" font-weight="800" letter-spacing="-2" fill="#332a3c">Small details.</text><text x="66" y="486" font-family="Bricolage Grotesque" font-size="76" font-weight="800" letter-spacing="-2" fill="#755087">Bigger worlds.</text><text x="70" y="742" font-family="Bricolage Grotesque" font-size="26" font-weight="600" fill="#6b626c">A little room for your next world.</text>`,
  'VORO game development artbook cover',
);
const outlinedCover = new Resvg(cover, { font: fonts }).toString();
await writeFile('brand/templates/presentation-cover.svg', outlinedCover);
await writeFile(
  'brand/templates/presentation-cover.png',
  withOrigin(
    new Resvg(outlinedCover).render().asPng(),
    'Authored vector brand/templates/presentation-cover.svg from scripts/brand.mjs, combines generated key art brand/art/little-world.png with authored mascot paths and Bricolage Grotesque typography; composition rasterized using Resvg. The key art has its exact generation prompt in brand/art/provenance.json.',
  ),
);
// Export the actual UI token values, keeping CSS as the canonical source.
const css = await readFile('brand/tokens.css', 'utf8');
const tokens = Object.fromEntries(
  [...css.matchAll(/--voro-([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
    name,
    {
      $value: value.trim(),
      $type: value.startsWith('#')
        ? 'color'
        : name.startsWith('font-')
          ? 'fontFamily'
          : /^(radius|space)-/.test(name)
            ? 'dimension'
            : 'string',
    },
  ]),
);
await writeFile(
  'brand/tokens.json',
  JSON.stringify(
    {
      $description:
        'VORO game-jam artbook identity. Generated from tokens.css by npm run brand:build.',
      tokens,
    },
    null,
    2,
  ) + '\n',
);
console.log('Brand exports ready: 7 logo variants, app icon, presentation cover, and tokens.');
