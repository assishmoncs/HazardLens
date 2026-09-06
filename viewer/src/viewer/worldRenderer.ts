import * as THREE from 'three';
import type { TwinState, WorldSnapshot } from '../../../src/core/types.js';
import {
  alarmSirenAsset,
  buildingAsset,
  bundWallAsset,
  columnAsset,
  compressorAsset,
  controlAsset,
  delugeAsset,
  distillationColumnAsset,
  doorAsset,
  emergencyAsset,
  flameDetectorAsset,
  fireMonitorAsset,
  flareStackAsset,
  gasDetectorAsset,
  generatorAsset,
  heatExchangerAsset,
  hydrantAsset,
  ignitionAsset,
  musterStationAsset,
  pipeAsset,
  pressureVesselAsset,
  pumpAsset,
  reactorAsset,
  roadAsset,
  routeAsset,
  sensorAsset,
  sphereTankAsset,
  tankAsset,
  valveAsset,
  vehicleAsset,
  wallAsset,
  windowAsset,
  workerAsset
} from './assets.js';
import { IndustrialBlastEffect, IndustrialFireEffect } from './industrialEffects.js';

function materialOf(object: THREE.Object3D): THREE.MeshStandardMaterial | undefined {
  let found: THREE.MeshStandardMaterial | undefined;
  object.traverse(node => {
    if (!found && node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial) {
      found = node.material;
    }
  });
  return found;
}

export class WorldRenderer {
  private objects = new Map<string, THREE.Object3D>();
  private fireEffects = new Map<string, IndustrialFireEffect>();
  private blastEffects = new Map<string, IndustrialBlastEffect>();
  private threatZoneMeshes = new Map<string, THREE.Group>();
  private hazardClock = 0;
  public showThreatZones = true;

  constructor(private scene: THREE.Scene) {}

  sync(snapshot: WorldSnapshot) {
    this.hazardClock += 0.016;
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

        const fire = this.fireEffects.get(id);
        if (fire) {
          fire.dispose();
          this.scene.remove(fire.root);
          this.fireEffects.delete(id);
        }

        const blast = this.blastEffects.get(id);
        if (blast) {
          this.scene.remove(blast.root);
          this.blastEffects.delete(id);
        }

        const tz = this.threatZoneMeshes.get(id);
        if (tz) {
          this.scene.remove(tz);
          this.threatZoneMeshes.delete(id);
        }
      }
    }
  }

  private create(twin: TwinState): THREE.Object3D {
    let object: THREE.Object3D;
    switch (twin.kind) {
      case 'tank': object = tankAsset(); break;
      case 'sphere-tank': object = sphereTankAsset(); break;
      case 'distillation-column': object = distillationColumnAsset(); break;
      case 'flare-stack': object = flareStackAsset(); break;
      case 'deluge-system': object = delugeAsset(); break;
      case 'gas-detector': object = gasDetectorAsset(); break;
      case 'flame-detector': object = flameDetectorAsset(); break;
      case 'bund-wall': object = bundWallAsset(); break;
      case 'muster-station': object = musterStationAsset(); break;
      case 'siren': object = alarmSirenAsset(); break;
      case 'generator': object = generatorAsset(); break;
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
      default:
        object = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0xd6b34a, metalness: 0.35, roughness: 0.5 }));
        break;
    }
    object.userData.twinId = twin.id;
    return object;
  }

  private releaseAsset() {
    const group = new THREE.Group();
    const plume = new THREE.Mesh(
      new THREE.SphereGeometry(1, 28, 20),
      new THREE.MeshStandardMaterial({
        color: 0x86d7e8,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        emissive: 0x0b3440,
        emissiveIntensity: 0.35
      })
    );
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 22, 16),
      new THREE.MeshStandardMaterial({ color: 0x9ae4ef, transparent: true, opacity: 0.15, depthWrite: false })
    );
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.03, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0x55d7ff, transparent: true, opacity: 0.45, depthWrite: false })
    );
    marker.rotation.x = Math.PI / 2;
    group.add(plume, core, marker);
    return group;
  }

  private update(object: THREE.Object3D, twin: TwinState) {
    object.position.set(twin.position.x, twin.position.y, twin.position.z);
    const persistent = [
      'tank', 'sphere-tank', 'distillation-column', 'flare-stack', 'deluge-system',
      'gas-detector', 'flame-detector', 'bund-wall', 'muster-station', 'siren', 'generator',
      'pipe', 'wall', 'valve', 'pump', 'compressor', 'reactor', 'pressure-vessel',
      'heat-exchanger', 'building', 'worker', 'vehicle', 'sensor', 'hydrant', 'fire-monitor',
      'column', 'window', 'door', 'route', 'ignition', 'shutdown', 'road', 'cooling', 'control', 'emergency'
    ];
    object.visible = twin.active || persistent.includes(twin.kind);

    if (twin.kind === 'release') {
      const radius = Number(twin.metadata.radiusM ?? 1);
      const spread = Math.max(radius, Number(twin.metadata.spreadM ?? radius));
      object.scale.set(Math.max(0.35, spread * 0.72), Math.max(0.35, radius * 0.48), Math.max(0.35, spread * 0.72));
      object.rotation.y += 0.003;
      const marker = object.children[2];
      if (marker) marker.rotation.z += 0.018;
    }

    if (twin.kind === 'fire') {
      let effect = this.fireEffects.get(twin.id);
      if (!effect) {
        effect = new IndustrialFireEffect();
        this.fireEffects.set(twin.id, effect);
        this.scene.add(effect.root);
      }
      effect.root.position.copy(object.position);
      const intensity = Number(twin.metadata.intensityMw ?? 1);
      effect.update(this.hazardClock + twin.id.length, intensity);
      object.visible = false;

      // DER-02 Threat-Zone Ground Decal Rings
      this.syncThreatZones(twin.id, object.position, intensity);
    } else {
      const effect = this.fireEffects.get(twin.id);
      if (effect) {
        effect.dispose();
        this.scene.remove(effect.root);
        this.fireEffects.delete(twin.id);
      }
      const tz = this.threatZoneMeshes.get(twin.id);
      if (tz) {
        this.scene.remove(tz);
        this.threatZoneMeshes.delete(twin.id);
      }
    }

    if (twin.kind === 'overpressure' || twin.kind === 'blast') {
      let effect = this.blastEffects.get(twin.id);
      if (!effect) {
        effect = new IndustrialBlastEffect();
        this.blastEffects.set(twin.id, effect);
        this.scene.add(effect.root);
      }
      effect.root.position.copy(object.position);
      effect.update(0.65, Number(twin.metadata.radiusM ?? 2));
    }

    // Thermal / Damage progressive visual state
    if (['tank', 'sphere-tank', 'distillation-column', 'pipe', 'wall', 'reactor', 'pressure-vessel', 'heat-exchanger', 'column', 'building', 'compressor', 'pump'].includes(twin.kind)) {
      const heat = THREE.MathUtils.clamp((twin.temperatureK - 303) / 300, 0, 1);
      const integrity = THREE.MathUtils.clamp(twin.integrity, 0, 1);
      object.rotation.z = (1 - integrity) * 0.08;
      const material = materialOf(object);
      if (material) {
        material.emissive.setRGB(heat * 0.85, heat * 0.14, 0);
        material.emissiveIntensity = heat * 2.5;
        if (integrity < 0.55) material.roughness = Math.min(1, material.roughness + 0.22);
      }
    }

    // Gas detector beacon response
    if (twin.kind === 'gas-detector') {
      const lel = Number(twin.metadata.lelPct ?? 0);
      object.traverse(child => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (lel >= 50) {
            mat.color.setHex(0xff2222);
            mat.emissive.setHex(0xff0000);
            mat.emissiveIntensity = 2.5;
          } else if (lel >= 20) {
            mat.color.setHex(0xffaa00);
            mat.emissive.setHex(0xff8800);
            mat.emissiveIntensity = 1.8;
          } else {
            mat.color.setHex(0x55ff77);
            mat.emissive.setHex(0x22cc44);
            mat.emissiveIntensity = 1.0;
          }
        }
      });
    }

    if (twin.kind === 'worker') {
      const exposure = Number(twin.metadata.exposure ?? 0);
      object.scale.setScalar(exposure > 40 ? 1.15 : 1);
      object.visible = twin.active;
    }
    if (twin.kind === 'route') {
      const risk = Number(twin.metadata.risk ?? 0);
      object.scale.y = Math.max(0.35, 1 - risk * 0.4);
    }
  }

  /**
   * DER-02 Threat-Zone Ground Ring Visualizer.
   * Renders ISO-radiant zones: 37.5 kW/m² (Red), 12.5 kW/m² (Orange), 4.7 kW/m² (Yellow).
   */
  private syncThreatZones(id: string, center: THREE.Vector3, intensityMw: number) {
    if (!this.showThreatZones) {
      const existing = this.threatZoneMeshes.get(id);
      if (existing) existing.visible = false;
      return;
    }

    let tzGroup = this.threatZoneMeshes.get(id);
    if (!tzGroup) {
      tzGroup = new THREE.Group();
      tzGroup.position.set(center.x, 0.03, center.z);

      const makeRing = (color: number, opacity: number) => {
        const mesh = new THREE.Mesh(
          new THREE.RingGeometry(0.96, 1.0, 48),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
        );
        mesh.rotation.x = -Math.PI / 2;
        return mesh;
      };

      const zone37 = makeRing(0xff2222, 0.75); // Red 37.5 kW/m2
      const zone12 = makeRing(0xff8800, 0.65); // Orange 12.5 kW/m2
      const zone4 = makeRing(0xffdd00, 0.55);  // Yellow 4.7 kW/m2

      tzGroup.add(zone37, zone12, zone4);
      this.threatZoneMeshes.set(id, tzGroup);
      this.scene.add(tzGroup);
    }

    tzGroup.position.set(center.x, 0.03, center.z);
    tzGroup.visible = true;

    // Radii: R = sqrt(Q_kw / (4 * pi * q))
    const q37Radius = Math.max(1, Math.sqrt((intensityMw * 1000) / (4 * Math.PI * 37.5)));
    const q12Radius = Math.max(1.5, Math.sqrt((intensityMw * 1000) / (4 * Math.PI * 12.5)));
    const q4Radius = Math.max(2, Math.sqrt((intensityMw * 1000) / (4 * Math.PI * 4.7)));

    const r37 = tzGroup.children[0] as THREE.Mesh;
    const r12 = tzGroup.children[1] as THREE.Mesh;
    const r4 = tzGroup.children[2] as THREE.Mesh;

    r37.scale.setScalar(q37Radius);
    r12.scale.setScalar(q12Radius);
    r4.scale.setScalar(q4Radius);
  }

  pick(raycaster: THREE.Raycaster, camera: THREE.Camera, pointer: THREE.Vector2): TwinState | undefined {
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects([...this.objects.values()], true);
    const object = intersections[0]?.object;
    if (!object) return undefined;
    let node: THREE.Object3D | null = object;
    let twinId: string | undefined;
    while (node) {
      twinId = node.userData.twinId;
      if (twinId) break;
      node = node.parent;
    }
    return twinId ? ({ id: twinId } as TwinState) : undefined;
  }

  getObject(id: string) {
    return this.objects.get(id);
  }
}
