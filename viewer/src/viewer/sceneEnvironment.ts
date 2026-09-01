import * as THREE from 'three';

export function createIndustrialEnvironment(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x182127);
  scene.fog = new THREE.Fog(0x182127, 75, 150);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(256, 256);
  let seed = 91;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = 155 + seed % 22;
    pixels.data.set([n, n + 2, n, 255], i);
  }
  ctx.putImageData(pixels, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 8);
  texture.colorSpace = THREE.SRGBColorSpace;

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(52, 0.7, 36),
    new THREE.MeshStandardMaterial({ color: 0x8a918c, map: texture, roughness: 0.88 }),
  );
  slab.position.y = -0.36;
  slab.receiveShadow = true;
  scene.add(slab);

  const mark = (w: number, d: number, x: number, z: number, color: number) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.015, z);
    scene.add(mesh);
  };

  mark(48, 3, 0, 4, 0x586f65);
  for (const z of [2.4, 5.6]) mark(48, 0.12, 0, z, 0xdac45e);
  for (let x = -24; x <= 24; x += 4) mark(0.025, 32, x, 0, 0x717972);
  for (let z = -16; z <= 16; z += 4) mark(48, 0.025, 0, z, 0x717972);

  const steel = new THREE.MeshStandardMaterial({ color: 0x46575e, metalness: 0.55, roughness: 0.55 });
  for (const z of [-15.5, 14.5]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(49, 0.4, 0.3), steel);
    beam.position.set(0, 8.2, z);
    beam.castShadow = true;
    scene.add(beam);
  }

  for (const x of [-22, -7.5, 7, 21.5]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 30), steel);
    beam.position.set(x, 8.1, -0.5);
    scene.add(beam);

    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.08, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xf1eddd, emissive: 0xf1eddd, emissiveIntensity: 1.4 }),
    );
    fixture.position.set(x, 7.8, -1);
    scene.add(fixture);
  }

  scene.add(new THREE.HemisphereLight(0xf4f3ed, 0x4f5d63, 2.1));

  const key = new THREE.DirectionalLight(0xffe8c9, 3);
  key.position.set(-14, 28, 16);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -38;
  key.shadow.camera.right = 38;
  key.shadow.camera.top = 28;
  key.shadow.camera.bottom = -28;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x91bdd4, 1.5);
  fill.position.set(20, 12, -18);
  scene.add(fill);

  return { ground: slab };
}
