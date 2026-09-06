import * as THREE from 'three';

const metal = (color: number) => new THREE.MeshStandardMaterial({ color, metalness: 0.68, roughness: 0.34 });
const concrete = (color: number) => new THREE.MeshStandardMaterial({ color, metalness: 0.18, roughness: 0.76 });

function box(scene: THREE.Scene, size: [number, number, number], position: [number, number, number], material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

export function createFacility(scene: THREE.Scene) {
  // Main reinforced concrete plant slab
  box(scene, [110, 0.35, 90], [5, -0.2, 5], concrete(0x161e25));

  const addZoneBoundary = (x: number, z: number, w: number, d: number, color = 0x223647) => {
    const zone = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.08, d),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.38 })
    );
    zone.position.set(x, 0, z);
    zone.receiveShadow = true;
    scene.add(zone);

    // Yellow safety perimeter stripe
    const outline = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.55, 4),
      new THREE.MeshBasicMaterial({ color: 0xd9a834, wireframe: true })
    );
    outline.rotation.x = -Math.PI / 2;
    outline.position.set(x, 0.02, z);
    outline.scale.set(w, d, 1);
    scene.add(outline);
  };

  // Plant Area Designations
  addZoneBoundary(-22, -10, 28, 26, 0x1f3442); // Fractionation & Separation
  addZoneBoundary(18, -12, 34, 28, 0x3d2b22);  // LPG Sphere & Tank Farm (Flammable High Risk)
  addZoneBoundary(-6, 16, 44, 20, 0x1e2f38);   // Compression & Process Units
  addZoneBoundary(25, 26, 26, 18, 0x1f3d2b);   // Safety Muster & Fire Protection

  // Multi-tier Pipe Racks with structural steel bents
  for (let row = 0; row < 3; row++) {
    const z = -2 + row * 2.6;
    // Longitudinal pipe stringers
    box(scene, [88, 0.16, 0.18], [-2, z + 2.2, -18], metal(0x64727d));
    box(scene, [88, 0.16, 0.18], [-2, z + 3.4, -18], metal(0x758591));
    for (const x of [-42, -28, -14, 0, 14, 28, 42]) {
      box(scene, [0.22, 4.2, 0.22], [x, 2.1, -18], metal(0x4a5863));
      box(scene, [1.8, 0.14, 0.14], [x, 3.4, -18], metal(0x4a5863));
    }
  }

  // Interconnecting North-South Pipe Bridge
  box(scene, [0.22, 0.22, 36], [-10, 4.2, 2], metal(0x64727d));
  box(scene, [0.22, 0.22, 36], [-9.5, 4.2, 2], metal(0x758591));
  for (const z of [-12, 0, 12, 20]) {
    box(scene, [0.2, 4.2, 0.2], [-9.75, 2.1, z], metal(0x4a5863));
  }

  // Central Control Room & Blast-Resistant Operator Shelter
  box(scene, [18, 5.2, 8], [-2, 2.6, 36], concrete(0x2d3740));
  box(scene, [18.6, 0.35, 8.6], [-2, 5.35, 36], metal(0x475661));
  for (let x = -8; x <= 4; x += 3) {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 1.25, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0x5bbbd2,
        emissive: 0x154b5b,
        emissiveIntensity: 0.65,
        metalness: 0.2,
        roughness: 0.2
      })
    );
    win.position.set(x, 2.9, 40.06);
    scene.add(win);
  }

  // Electrical Substation & MCC Building
  box(scene, [12, 4.2, 6], [-24, 2.1, 32], concrete(0x283138));
  box(scene, [12.4, 0.25, 6.4], [-24, 4.3, 32], metal(0x3e4d57));

  // Facility perimeter safety fencing with barbed wire top
  const fenceMat = new THREE.MeshBasicMaterial({ color: 0x556773, wireframe: true });
  for (let x = -50; x <= 50; x += 10) {
    box(scene, [0.12, 2.4, 0.12], [x, 1.2, -38], metal(0x7c8a94));
    box(scene, [0.12, 2.4, 0.12], [x, 1.2, 46], metal(0x7c8a94));
  }
  const northFence = new THREE.Mesh(new THREE.PlaneGeometry(102, 2.2), fenceMat);
  northFence.position.set(0, 1.2, -38);
  const southFence = new THREE.Mesh(new THREE.PlaneGeometry(102, 2.2), fenceMat);
  southFence.position.set(0, 1.2, 46);
  scene.add(northFence, southFence);
}
