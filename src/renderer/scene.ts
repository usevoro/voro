import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gltfAdapter, disposeObject } from '../formats/gltf';
export class PreviewScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.01, 10000);
  controls: OrbitControls;
  adapter: ReturnType<typeof gltfAdapter>;
  model?: THREE.Object3D;
  mixer?: THREE.AnimationMixer;
  clips: THREE.AnimationClip[] = [];
  action?: THREE.AnimationAction;
  playing = false;
  disposed = false;
  vertices = 0;
  triangles = 0;
  constructor(canvas: HTMLCanvasElement, thumbnail = false) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: thumbnail,
    });
    this.renderer.setPixelRatio(thumbnail ? 1 : Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.scene.background = new THREE.Color('#e9e7e6');
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x86909e, 2.8));
    const key = new THREE.DirectionalLight(0xfff4e7, 3.5);
    key.position.set(4, 8, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xc7dbff, 2);
    fill.position.set(-5, 3, -4);
    this.scene.add(fill);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.adapter = gltfAdapter(this.renderer);
  }
  async load(url: string) {
    const gltf = await this.adapter.load(url);
    if (this.disposed) {
      disposeObject(gltf.scene);
      return;
    }
    this.model = gltf.scene;
    this.scene.add(gltf.scene);
    this.clips = gltf.animations;
    this.mixer = new THREE.AnimationMixer(gltf.scene);
    gltf.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        const instances = (mesh as THREE.InstancedMesh).isInstancedMesh
          ? (mesh as THREE.InstancedMesh).count
          : 1;
        this.vertices += (mesh.geometry.getAttribute('position')?.count ?? 0) * instances;
        this.triangles +=
          Math.floor(
            (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position')?.count ?? 0) / 3,
          ) * instances;
      }
    });
    if (this.vertices > 10_000_000)
      throw new Error('Preview exceeds the 10 million vertex safety limit.');
    this.frame();
    if (this.clips.length) this.selectClip(0);
    this.render(0);
  }
  frame() {
    if (!this.model) return;
    const box = new THREE.Box3().setFromObject(this.model);
    if (box.isEmpty()) throw new Error('This asset has no visible geometry');
    const center = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 0.001);
    if (!Number.isFinite(radius)) throw new Error('Invalid model bounds');
    const fov = Math.min(
      (this.camera.fov * Math.PI) / 180,
      2 * Math.atan(Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.aspect),
    );
    const distance = (radius / Math.sin(fov / 2)) * 1.15;
    this.camera.position
      .copy(center)
      .add(new THREE.Vector3(1, 0.65, 1).normalize().multiplyScalar(distance));
    this.camera.near = radius / 1000;
    this.camera.far = distance + radius * 100;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.minDistance = radius * 0.01;
    this.controls.maxDistance = radius * 100;
    this.controls.update();
  }
  resize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }
  wireframe(value: boolean) {
    this.model?.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.material)
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
          if ('wireframe' in material) (material as THREE.MeshStandardMaterial).wireframe = value;
    });
  }
  background(dark: boolean) {
    this.scene.background = new THREE.Color(dark ? '#332a3c' : '#e9e7e6');
  }
  selectClip(index: number) {
    this.action?.stop();
    this.action = this.mixer?.clipAction(this.clips[index]);
    this.action?.reset().play();
  }
  render(delta: number) {
    if (this.disposed) return;
    if (this.playing) this.mixer?.update(Math.min(delta, 0.1));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.disposed = true;
    this.action?.stop();
    this.mixer?.stopAllAction();
    if (this.model) {
      this.mixer?.uncacheRoot(this.model);
      disposeObject(this.model);
    }
    this.adapter.dispose();
    this.controls.dispose();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
