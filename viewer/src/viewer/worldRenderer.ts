import * as THREE from 'three';
import type { TwinState, WorldSnapshot } from '../../../src/core/types.js';
import { buildingAsset, fireMonitorAsset, hydrantAsset, pipeAsset, pumpAsset, reactorAsset, sensorAsset, tankAsset, valveAsset, vehicleAsset, wallAsset, workerAsset } from './assets.js';

function materialOf(object: THREE.Object3D): THREE.MeshStandardMaterial | undefined {
  let found: THREE.MeshStandardMaterial | undefined;
  object.traverse(node => {
    if (found) return;
    if (node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial) found = node.material;
  });
  return found;
}

export class WorldRenderer {
  private objects = new Map<string, THREE.Object3D>();

  constructor(private scene: THREE.Scene) {}

  sync(snapshot: WorldSnapshot) {
    const alive = new Set<string>();
    for (const twin of snapshot.twins) {
      alive.add(twin.id);
      let object = this.objects.get(twin.id);
      if (!object) {
        object = this.create(twin);
        this.objects.set(twin.id, object);
        this.scene.add(object);
      }
      this.update(object, twin);
    }
    for (const [id, object] of this.objects) {
      if (!alive.has(id)) {
        this.scene.remove(object);
        this.objects.delete(id);
      }
    }
  }

  private create(twin: TwinState): THREE.Object3D {
    let object: THREE.Object3D;
    switch (twin.kind) {
      case 'tank': object = tankAsset(); break;
      case 'reactor': object = reactorAsset(); break;
      case 'pipe': object = pipeAsset(); break;
      case 'wall': object = wallAsset(); break;
      case 'valve': object = valveAsset(); break;
      case 'pump':
      case 'compressor': object = pumpAsset(); break;
      case 'building': object = buildingAsset(); break;
      case 'hydrant': object = hydrantAsset(); break;
      case 'fire-monitor': object = fireMonitorAsset(); break;
      case 'worker': object = workerAsset(); break;
      case 'vehicle': object = vehicleAsset(); break;
      case 'sensor': object = sensorAsset(); break;
      case 'fire': object = this.fireAsset(); break;
      case 'release': object = this.releaseAsset(); break;
      default: object = new THREE.Mesh(new THREE.BoxGeometry(.7, .7, .7), new THREE.MeshStandardMaterial({ color: 0xd6b34a, metalness: .35, roughness: .5 })); break;
    }
    object.userData.twinId = twin.id;
    return object;
  }

  private fireAsset() {
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(.65, 20, 16), new THREE.MeshStandardMaterial({ color: 0xffb52e, emissive: 0xff3300, emissiveIntensity: 3.2, transparent: true, opacity: .92 }));
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.9, 2.1, 24), new THREE.MeshStandardMaterial({ color: 0xff6a18, emissive: 0xff1a00, emissiveIntensity: 2.5, transparent: true, opacity: .72 }));
    flame.position.y = .55;
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(.7, 20, 16), new THREE.MeshStandardMaterial({ color: 0x4b4f55, transparent: true, opacity: .28, depthWrite: false }));
    smoke.position.set(.15, 1.8, .05);
    group.add(core, flame, smoke);
    return group;
  }

  private releaseAsset() {
    const group = new THREE.Group();
    const plume = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0x86d7e8, transparent: true, opacity: .14, depthWrite: false, emissive: 0x0b3440, emissiveIntensity: .25 }));
    const core = new THREE.Mesh(new THREE.SphereGeometry(.65, 20, 14), new THREE.MeshStandardMaterial({ color: 0x9ae4ef, transparent: true, opacity: .12, depthWrite: false }));
    group.add(plume, core);
    return group;
  }

  private update(object: THREE.Object3D, twin: TwinState) {
    object.position.set(twin.position.x, twin.position.y, twin.position.z);
    const persistent = ['tank', 'pipe', 'wall', 'valve', 'pump', 'compressor', 'reactor', 'building', 'worker', 'vehicle', 'sensor', 'hydrant', 'fire-monitor', 'column', 'window', 'door', 'route'];
    object.visible = twin.active || persistent.includes(twin.kind);

    if (twin.kind === 'release') {
      const radius = Number(twin.metadata.radiusM ?? 1);
      const spread = Math.max(radius, Number(twin.metadata.spreadM ?? radius));
      object.scale.set(Math.max(.35, spread * .7), Math.max(.35, radius * .45), Math.max(.35, spread * .7));
    }

    if (twin.kind === 'fire') {
      const intensity = Number(twin.metadata.intensityMw ?? 1);
      const scale = Math.max(.4, 1 + intensity * .08);
      object.scale.set(scale, scale * 1.25, scale);
      object.rotation.y += .015;
    }

    if (twin.kind === 'tank' || twin.kind === 'pipe' || twin.kind === 'wall' || twin.kind === 'reactor' || twin.kind === 'column' || twin.kind === 'building') {
      const heat = THREE.MathUtils.clamp((twin.temperatureK - 303) / 300, 0, 1);
      const integrity = THREE.MathUtils.clamp(twin.integrity, 0, 1);
      object.rotation.z = (1 - integrity) * .08;
      const material = materialOf(object);
      if (material) {
        material.emissive.setRGB(heat * .8, heat * .13, 0);
        material.emissiveIntensity = heat * 2.4;
      }
    }

    if (twin.kind === 'worker') {
      const exposure = Number(twin.metadata.exposure ?? 0);
      object.scale.setScalar(exposure > 40 ? 1.15 : 1);
      object.visible = twin.active;
    }

    if (twin.kind === 'route') {
      const risk = Number(twin.metadata.risk ?? 0);
      object.scale.y = Math.max(.35, 1 - risk * .4);
    }
  }

  pick(raycaster: THREE.Raycaster, camera: THREE.Camera, pointer: THREE.Vector2): TwinState | undefined {
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects([...this.objects.values()], true);
    const object = intersections[0]?.object;
    if (!object) return undefined;
    const twinId = object.parent?.userData.twinId ?? object.userData.twinId;
    return twinId ? ({ id: twinId } as TwinState) : undefined;
  }

  getObject(id: string) { return this.objects.get(id); }
}
