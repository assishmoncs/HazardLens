import * as THREE from 'three';
import type { TwinState, WorldSnapshot } from '../../../src/core/types.js';
import { buildingAsset, columnAsset, compressorAsset, controlAsset, doorAsset, emergencyAsset, fireMonitorAsset, heatExchangerAsset, hydrantAsset, ignitionAsset, pipeAsset, pressureVesselAsset, pumpAsset, reactorAsset, roadAsset, routeAsset, sensorAsset, sensorTowerAsset, tankAsset, valveAsset, vehicleAsset, wallAsset, windowAsset, workerAsset } from './assets.js';
import { IndustrialBlastEffect, IndustrialFireEffect } from './industrialEffects.js';

function materialOf(object: THREE.Object3D): THREE.MeshStandardMaterial | undefined {
  let found: THREE.MeshStandardMaterial | undefined;
  object.traverse(node => { if (!found && node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial) found = node.material; });
  return found;
}

export class WorldRenderer {
  private objects = new Map<string, THREE.Object3D>();
  private fireEffects = new Map<string, IndustrialFireEffect>();
  private blastEffects = new Map<string, IndustrialBlastEffect>();
  private hazardClock = 0;

  constructor(private scene: THREE.Scene) {}

  sync(snapshot: WorldSnapshot) {
    this.hazardClock += 0.016;
    const alive = new Set<string>();
    for (const twin of snapshot.twins) {
      alive.add(twin.id);
      let object = this.objects.get(twin.id);
      if (!object) { object = this.create(twin); this.objects.set(twin.id, object); this.scene.add(object); }
      this.update(object, twin);
    }
    for (const [id, object] of this.objects) if (!alive.has(id)) {
      this.scene.remove(object); this.objects.delete(id);
      const fire = this.fireEffects.get(id); if (fire) { fire.dispose(); this.scene.remove(fire.root); this.fireEffects.delete(id); }
      const blast = this.blastEffects.get(id); if (blast) { this.scene.remove(blast.root); this.blastEffects.delete(id); }
    }
  }

  private create(twin: TwinState): THREE.Object3D {
    let object: THREE.Object3D;
    switch (twin.kind) {
      case 'tank': object = tankAsset(); break;
      case 'pressure-vessel': object = pressureVesselAsset(); break;
      case 'reactor': object = reactorAsset(); break;
      case 'pipe': object = pipeAsset(); break;
      case 'wall': object = wallAsset(); break;
      case 'valve': object = valveAsset(); break;
      case 'pump': object = pumpAsset(); break;
      case 'compressor': object = compressorAsset(); break;
      case 'cooling': object = controlAsset(); break;
      case 'control': object = controlAsset(); break;
      case 'emergency': object = emergencyAsset(); break;
      case 'heat-exchanger': object = heatExchangerAsset(); break;
      case 'column': object = columnAsset(); break;
      case 'window': object = windowAsset(); break;
      case 'door': object = doorAsset(); break;
      case 'route': object = routeAsset(); break;
      case 'building': object = buildingAsset(); break;
      case 'hydrant': object = hydrantAsset(); break;
      case 'fire-monitor': object = fireMonitorAsset(); break;
      case 'worker': object = workerAsset(); break;
      case 'vehicle': object = vehicleAsset(); break;
      case 'sensor': object = sensorAsset(); break;
      case 'fire': object = new THREE.Group(); break;
      case 'release': object = this.releaseAsset(); break;
      case 'ignition': object = ignitionAsset(); break;
      case 'shutdown': object = emergencyAsset(); break;
      case 'road': object = roadAsset(8, 2.4); break;
      default: object = new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.7), new THREE.MeshStandardMaterial({ color:0xd6b34a, metalness:.35, roughness:.5 })); break;
    }
    object.userData.twinId = twin.id;
    return object;
  }

  private releaseAsset() {
    const group = new THREE.Group();
    const plume = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), new THREE.MeshStandardMaterial({ color:0x86d7e8, transparent:true, opacity:.13, depthWrite:false, emissive:0x0b3440, emissiveIntensity:.3 }));
    const core = new THREE.Mesh(new THREE.SphereGeometry(.62, 22, 16), new THREE.MeshStandardMaterial({ color:0x9ae4ef, transparent:true, opacity:.11, depthWrite:false }));
    const marker = new THREE.Mesh(new THREE.TorusGeometry(.7,.025,8,40), new THREE.MeshBasicMaterial({ color:0x65d8f2, transparent:true, opacity:.35, depthWrite:false })); marker.rotation.x=Math.PI/2;
    group.add(plume, core, marker); return group;
  }

  private update(object: THREE.Object3D, twin: TwinState) {
    object.position.set(twin.position.x, twin.position.y, twin.position.z);
    const persistent = ['tank','pipe','wall','valve','pump','compressor','reactor','pressure-vessel','heat-exchanger','building','worker','vehicle','sensor','hydrant','fire-monitor','column','window','door','route','ignition','shutdown','road','cooling','control','emergency'];
    object.visible = twin.active || persistent.includes(twin.kind);

    if (twin.kind === 'release') {
      const radius = Number(twin.metadata.radiusM ?? 1), spread = Math.max(radius, Number(twin.metadata.spreadM ?? radius));
      object.scale.set(Math.max(.35, spread * .72), Math.max(.35, radius * .48), Math.max(.35, spread * .72));
      object.rotation.y += .003;
      const marker = object.children[2]; if (marker) marker.rotation.z += .018;
    }

    if (twin.kind === 'fire') {
      let effect = this.fireEffects.get(twin.id);
      if (!effect) { effect = new IndustrialFireEffect(); this.fireEffects.set(twin.id, effect); this.scene.add(effect.root); }
      effect.root.position.copy(object.position);
      effect.update(this.hazardClock + twin.id.length, Number(twin.metadata.intensityMw ?? 1));
      object.visible = false;
    } else {
      const effect = this.fireEffects.get(twin.id);
      if (effect) { effect.dispose(); this.scene.remove(effect.root); this.fireEffects.delete(twin.id); }
    }

    if (twin.kind === 'overpressure' || twin.kind === 'blast') {
      let effect = this.blastEffects.get(twin.id);
      if (!effect) { effect = new IndustrialBlastEffect(); this.blastEffects.set(twin.id, effect); this.scene.add(effect.root); }
      effect.root.position.copy(object.position);
      effect.update(0.65, Number(twin.metadata.radiusM ?? 2));
    }

    if (['tank','pipe','wall','reactor','pressure-vessel','heat-exchanger','column','building','compressor','pump'].includes(twin.kind)) {
      const heat = THREE.MathUtils.clamp((twin.temperatureK - 303) / 300, 0, 1);
      const integrity = THREE.MathUtils.clamp(twin.integrity, 0, 1);
      object.rotation.z = (1 - integrity) * .08;
      const material = materialOf(object);
      if (material) { material.emissive.setRGB(heat * .8, heat * .13, 0); material.emissiveIntensity = heat * 2.4; if (integrity < .55) material.roughness = Math.min(1, material.roughness + .2); }
    }
    if (twin.kind === 'worker') { const exposure=Number(twin.metadata.exposure??0); object.scale.setScalar(exposure>40?1.15:1); object.visible=twin.active; }
    if (twin.kind === 'route') { const risk=Number(twin.metadata.risk??0); object.scale.y=Math.max(.35,1-risk*.4); }
  }

  pick(raycaster: THREE.Raycaster, camera: THREE.Camera, pointer: THREE.Vector2): TwinState | undefined {
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects([...this.objects.values()], true);
    const object = intersections[0]?.object;
    if (!object) return undefined;
    let node: THREE.Object3D | null = object;
    let twinId: string | undefined;
    while (node) { twinId = node.userData.twinId; if (twinId) break; node = node.parent; }
    return twinId ? ({ id:twinId } as TwinState) : undefined;
  }
  getObject(id:string) { return this.objects.get(id); }
}
