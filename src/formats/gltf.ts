import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
export interface FormatAdapter {
  extensions: string[];
  load(url: string): Promise<GLTF>;
  dispose(): void;
}
export function gltfAdapter(renderer: THREE.WebGLRenderer): FormatAdapter {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    // Preserve relative .. segments until the trusted protocol resolves the physical path.
    // Native URL normalization would otherwise erase traversal above the project root.
    const asset = /^asset:\/\/([a-f\d]{32})\/([^?#]*)(?:[?#].*)?$/.exec(url);
    if (asset)
      return `asset://${asset[1]}/resource?path=${encodeURIComponent(decodeURIComponent(asset[2]))}`;
    const parsed = new URL(url, location.href);
    if (
      parsed.protocol === 'data:' ||
      parsed.protocol === 'blob:' ||
      (parsed.origin === location.origin && parsed.pathname.startsWith('/decoders/'))
    )
      return url;
    throw new Error(`External resource blocked: ${url}`);
  });
  const draco = new DRACOLoader(manager)
    .setDecoderPath('reviewer://app/decoders/draco/')
    .setWorkerLimit(1);
  const ktx = new KTX2Loader(manager)
    .setTranscoderPath('reviewer://app/decoders/basis/')
    .setWorkerLimit(1)
    .detectSupport(renderer);
  const initializeKtx = ktx.init.bind(ktx);
  let staticWorkerInstalled = false;
  ktx.init = () =>
    initializeKtx().then(() => {
      if (staticWorkerInstalled) return;
      staticWorkerInstalled = true;
      // Three.js exposes these implementation fields; this adapter is version-locked
      // and the packaged decoder smoke test protects the integration.
      const internal = ktx as unknown as {
        workerPool: { setWorkerCreator(create: () => Worker): void };
        transcoderBinary: ArrayBuffer;
        workerConfig: unknown;
      };
      internal.workerPool.setWorkerCreator(() => {
        const worker = new Worker('reviewer://app/ktx2-worker.js');
        const transcoderBinary = internal.transcoderBinary.slice(0);
        worker.postMessage({ type: 'init', config: internal.workerConfig, transcoderBinary }, [
          transcoderBinary,
        ]);
        return worker;
      });
    });
  const loader = new GLTFLoader(manager)
    .setDRACOLoader(draco)
    .setKTX2Loader(ktx)
    .setMeshoptDecoder(MeshoptDecoder);
  return {
    extensions: ['glb', 'gltf'],
    load: (url) => loader.loadAsync(url),
    dispose: () => {
      draco.dispose();
      ktx.dispose();
    },
  };
}
export function disposeObject(object: THREE.Object3D) {
  const textures = new Set<THREE.Texture>(),
    materials = new Set<THREE.Material>(),
    geometries = new Set<THREE.BufferGeometry>();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material)
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) textures.add(value);
      }
    if ((child as THREE.SkinnedMesh).skeleton) (child as THREE.SkinnedMesh).skeleton.dispose();
  });
  for (const texture of textures) {
    const source = texture.source?.data;
    if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close();
    texture.dispose();
  }
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}
