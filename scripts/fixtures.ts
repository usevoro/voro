import * as THREE from 'three';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
type Part = { geometry: THREE.BufferGeometry; position?: number[]; color: string };
export function model(parts: Part[], animated = false) {
  const buffers: Buffer[] = [],
    bufferViews: any[] = [],
    accessors: any[] = [];
  let length = 0;
  const add = (array: Float32Array | Uint32Array, type: string, bounds = false) => {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const view = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length });
    buffers.push(bytes);
    length += bytes.length;
    const width = type === 'VEC3' ? 3 : type === 'VEC4' ? 4 : type === 'VEC2' ? 2 : 1;
    const accessor: any = {
      bufferView: view,
      componentType: array instanceof Float32Array ? 5126 : 5125,
      count: array.length / width,
      type,
    };
    if (bounds) {
      accessor.min = Array.from({ length: width }, (_, i) => {
        let min = Infinity;
        for (let j = i; j < array.length; j += width) min = Math.min(min, array[j]);
        return min;
      });
      accessor.max = Array.from({ length: width }, (_, i) => {
        let max = -Infinity;
        for (let j = i; j < array.length; j += width) max = Math.max(max, array[j]);
        return max;
      });
    }
    accessors.push(accessor);
    return accessors.length - 1;
  };
  const materials: any[] = [],
    meshes: any[] = [],
    nodes: any[] = [];
  for (const part of parts) {
    const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry;
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const position = add(new Float32Array(geometry.getAttribute('position').array), 'VEC3', true),
      normal = add(new Float32Array(geometry.getAttribute('normal').array), 'VEC3');
    const color = new THREE.Color(part.color);
    materials.push({
      pbrMetallicRoughness: {
        baseColorFactor: [color.r, color.g, color.b, 1],
        metallicFactor: 0.1,
        roughnessFactor: 0.62,
      },
      doubleSided: true,
    });
    const uv = geometry.getAttribute('uv')
      ? add(new Float32Array(geometry.getAttribute('uv').array), 'VEC2')
      : undefined;
    meshes.push({
      primitives: [
        {
          attributes: {
            POSITION: position,
            NORMAL: normal,
            ...(uv !== undefined ? { TEXCOORD_0: uv } : {}),
          },
          material: materials.length - 1,
        },
      ],
    });
    nodes.push({ mesh: meshes.length - 1, translation: part.position || [0, 0, 0] });
  }
  const animations: any[] = [];
  if (animated) {
    const input = add(new Float32Array([0, 1, 2]), 'SCALAR', true),
      output = add(new Float32Array([0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1]), 'VEC4');
    animations.push({
      name: 'Turntable',
      samplers: [{ input, output, interpolation: 'LINEAR' }],
      channels: [{ sampler: 0, target: { node: 0, path: 'rotation' } }],
    });
  }
  const binary = Buffer.concat(buffers);
  return {
    json: {
      asset: { version: '2.0', generator: 'VORO deterministic fixtures' },
      scene: 0,
      scenes: [{ nodes: nodes.map((_, i) => i) }],
      nodes,
      meshes,
      materials,
      buffers: [
        {
          byteLength: binary.length,
          uri: `data:application/octet-stream;base64,${binary.toString('base64')}`,
        },
      ],
      bufferViews,
      accessors,
      ...(animated ? { animations } : {}),
    },
    binary,
  };
}
export function glb(json: any, binary: Buffer) {
  const copy = structuredClone(json);
  delete copy.buffers[0].uri;
  const raw = Buffer.from(JSON.stringify(copy));
  const jsonBuffer = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 0x20);
  raw.copy(jsonBuffer);
  const bin = Buffer.alloc(Math.ceil(binary.length / 4) * 4);
  binary.copy(bin);
  const header = Buffer.alloc(20);
  header.write('glTF');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonBuffer.length + bin.length, 8);
  header.writeUInt32LE(jsonBuffer.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonBuffer, binHeader, bin]);
}
export async function createFixtures(root: string) {
  const box = (x: number, y: number, z: number, position: number[], color: string): Part => ({
    geometry: new THREE.BoxGeometry(x, y, z),
    position,
    color,
  });
  const collections: Record<string, Part[]> = {
    'Furniture/Arc chair': [
      box(1.8, 0.22, 1.65, [0, 1.6, 0], '#b09174'),
      box(1.8, 1.4, 0.16, [0, 2.25, -0.7], '#b09174'),
      ...[-0.7, 0.7].flatMap((x) =>
        [-0.6, 0.6].map((z) => box(0.15, 1.6, 0.15, [x, 0.8, z], '#525f62')),
      ),
    ],
    'Furniture/Low table': [
      box(2.8, 0.22, 1.8, [0, 1, 0], '#9e7c61'),
      ...[-1.15, 1.15].flatMap((x) =>
        [-0.65, 0.65].map((z) => box(0.18, 1, 0.18, [x, 0.5, z], '#9e7c61')),
      ),
    ],
    'Furniture/Soft stool': [
      {
        geometry: new THREE.CylinderGeometry(0.8, 0.8, 0.4, 48),
        position: [0, 1.3, 0],
        color: '#8ca8a1',
      },
      ...[-0.45, 0.45].flatMap((x) =>
        [-0.45, 0.45].map((z) => box(0.15, 1.2, 0.15, [x, 0.6, z], '#c1aa8b')),
      ),
    ],
    'Lighting/Studio lamp': [
      { geometry: new THREE.CylinderGeometry(0.7, 0.7, 0.12, 48), color: '#647278' },
      {
        geometry: new THREE.CylinderGeometry(0.06, 0.06, 2.5, 16),
        position: [0, 1.25, 0],
        color: '#647278',
      },
      {
        geometry: new THREE.ConeGeometry(0.75, 1, 48, 1, true),
        position: [0, 2.5, 0],
        color: '#d9af79',
      },
    ],
    'Objects/Clay vessel': [
      { geometry: new THREE.TorusGeometry(0.72, 0.3, 24, 48), color: '#b78368' },
    ],
    'Objects/Sculpture': [
      { geometry: new THREE.TorusKnotGeometry(0.75, 0.22, 96, 16), color: '#7f9a9a' },
    ],
    'Objects/Faceted stone': [{ geometry: new THREE.IcosahedronGeometry(1, 1), color: '#a0a496' }],
    'Objects/Orb': [{ geometry: new THREE.SphereGeometry(1, 48, 32), color: '#d8b578' }],
  };
  for (const [name, parts] of Object.entries(collections)) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    const generated = model(parts, name.endsWith('Sculpture'));
    await writeFile(path.join(root, `${name}.glb`), glb(generated.json, generated.binary));
    for (const p of parts) p.geometry.dispose();
  }
  const generated = model([{ geometry: new THREE.BoxGeometry(1, 1, 1), color: '#8299ab' }]);
  await mkdir(path.join(root, 'Validation'), { recursive: true });
  const external: any = structuredClone(generated.json);
  external.buffers[0].uri = 'geometry.bin';
  external.images = [{ uri: 'checker.png' }];
  external.textures = [{ source: 0 }];
  external.materials[0].pbrMetallicRoughness.baseColorTexture = { index: 0 };
  await writeFile(
    path.join(root, 'Validation/checker.png'),
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV2kAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  await writeFile(path.join(root, 'Validation/Textured-space #1.gltf'), JSON.stringify(external));
  await writeFile(path.join(root, 'Validation/geometry.bin'), generated.binary);
  const missing = structuredClone(external);
  missing.buffers[0].uri = 'missing-buffer.bin';
  await writeFile(path.join(root, 'Validation/Missing dependency.gltf'), JSON.stringify(missing));
  await writeFile(path.join(root, 'Validation/Broken.glb'), 'malformed fixture');
  await writeFile(
    path.join(root, 'Validation/Unsupported.obj'),
    '# Deliberately unsupported adapter\nv 0 0 0\n',
  );
  return root;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(process.argv[2] || '/tmp/asset-reviewer-sample');
  await createFixtures(root);
  console.log(root);
}
