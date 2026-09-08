import * as THREE from 'three';
import draco from 'draco3d';
import { MeshoptEncoder } from 'meshoptimizer';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { glb, model } from './fixtures';
export async function createCodecFixtures(root: string) {
  await mkdir(root, { recursive: true });
  const generated = model([
    { geometry: new THREE.TorusKnotGeometry(0.75, 0.2, 64, 12), color: '#7f9a9a' },
  ]);
  const json: any = structuredClone(generated.json);
  await MeshoptEncoder.ready;
  const encoded: Buffer[] = [];
  let offset = 0;
  for (let i = 0; i < json.bufferViews.length; i++) {
    const view = json.bufferViews[i],
      accessor = json.accessors[i],
      width = accessor.type === 'VEC3' ? 12 : 8;
    const data = MeshoptEncoder.encodeGltfBuffer(
      new Uint8Array(generated.binary.subarray(view.byteOffset, view.byteOffset + view.byteLength)),
      accessor.count,
      width,
      'ATTRIBUTES',
    );
    view.byteOffset = 0;
    view.buffer = 1;
    view.byteStride = width;
    view.extensions = {
      EXT_meshopt_compression: {
        buffer: 0,
        byteOffset: offset,
        byteLength: data.length,
        byteStride: width,
        count: accessor.count,
        mode: 'ATTRIBUTES',
        filter: 'NONE',
      },
    };
    encoded.push(Buffer.from(data));
    offset += data.length;
  }
  json.extensionsUsed = ['EXT_meshopt_compression'];
  json.extensionsRequired = ['EXT_meshopt_compression'];
  json.buffers = [
    {
      byteLength: offset,
      uri: `data:application/octet-stream;base64,${Buffer.concat(encoded).toString('base64')}`,
    },
    {
      byteLength: generated.binary.length,
      extensions: { EXT_meshopt_compression: { fallback: true } },
    },
  ];
  await writeFile(path.join(root, 'Meshopt knot.gltf'), JSON.stringify(json));
  const module = await draco.createEncoderModule({});
  const builder = new module.MeshBuilder(),
    mesh = new module.Mesh(),
    encoder = new module.Encoder(),
    output = new module.DracoInt8Array();
  const posView = generated.json.bufferViews[0],
    normalView = generated.json.bufferViews[1];
  const positions = new Float32Array(
    generated.binary.buffer,
    generated.binary.byteOffset + posView.byteOffset,
    posView.byteLength / 4,
  );
  const normals = new Float32Array(
    generated.binary.buffer,
    generated.binary.byteOffset + normalView.byteOffset,
    normalView.byteLength / 4,
  );
  const vertices = positions.length / 3;
  const posId = builder.AddFloatAttributeToMesh(mesh, module.POSITION, vertices, 3, positions),
    normalId = builder.AddFloatAttributeToMesh(mesh, module.NORMAL, vertices, 3, normals);
  builder.AddFacesToMesh(
    mesh,
    vertices / 3,
    Uint32Array.from({ length: vertices }, (_, i) => i),
  );
  encoder.SetSpeedOptions(5, 5);
  encoder.SetAttributeQuantization(module.POSITION, 14);
  encoder.SetEncodingMethod(module.MESH_EDGEBREAKER_ENCODING);
  const size = encoder.EncodeMeshToDracoBuffer(mesh, output);
  if (size <= 0) throw new Error('Draco fixture encoding failed');
  const binary = Buffer.alloc(size);
  for (let i = 0; i < size; i++) binary[i] = output.GetValue(i);
  const compressed: any = structuredClone(generated.json);
  compressed.bufferViews = [{ buffer: 0, byteLength: size }];
  compressed.buffers = [{ byteLength: size }];
  compressed.accessors = compressed.accessors.slice(0, 2);
  delete compressed.meshes[0].primitives[0].attributes.TEXCOORD_0;
  for (const a of compressed.accessors) delete a.bufferView;
  compressed.meshes[0].primitives[0].extensions = {
    KHR_draco_mesh_compression: {
      bufferView: 0,
      attributes: { POSITION: posId, NORMAL: normalId },
    },
  };
  compressed.extensionsUsed = ['KHR_draco_mesh_compression'];
  compressed.extensionsRequired = ['KHR_draco_mesh_compression'];
  await writeFile(path.join(root, 'Draco knot.glb'), glb(compressed, binary));
  for (const object of [builder, mesh, encoder, output]) module.destroy(object);
  const textured: any = model([
    { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#ffffff' },
  ]).json;
  textured.images = [{ uri: 'normal.ktx2' }];
  textured.textures = [{ extensions: { KHR_texture_basisu: { source: 0 } } }];
  textured.materials[0].pbrMetallicRoughness.baseColorTexture = { index: 0 };
  textured.extensionsUsed = ['KHR_texture_basisu'];
  textured.extensionsRequired = ['KHR_texture_basisu'];
  await copyFile('tests/fixtures/flight-helmet-normal.ktx2', path.join(root, 'normal.ktx2'));
  await writeFile(path.join(root, 'KTX2 cube.gltf'), JSON.stringify(textured));
}
