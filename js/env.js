// Shared studio environment so every module is judged under the same light.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function makeRenderer(canvas, opts = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!opts.preserve });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

export function makeStudio(renderer, scene, opts = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = opts.envIntensity ?? 0.6;
  scene.background = new THREE.Color(opts.bg ?? 0xd9d9d6);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(900, 2600, 1400);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  Object.assign(key.shadow.camera, { left: -1400, right: 1400, top: 1400, bottom: -1400, near: 200, far: 7000 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 1.5;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe4ebff, 0.35); fill.position.set(-1600, 1000, -500); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshStandardMaterial({ color: opts.floor ?? 0xcfcfcc, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = 'floor'; scene.add(floor);
  return { key, fill, floor };
}
