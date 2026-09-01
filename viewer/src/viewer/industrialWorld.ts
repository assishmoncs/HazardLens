import * as THREE from 'three';

export interface IndustrialZone {
  id: string;
  name: string;
  position: THREE.Vector3;
  scale: THREE.Vector3;
}

export interface IndustrialWorldConfig {
  tankCount: number;
  pipeCount: number;
  zones: IndustrialZone[];
}

/**
 * Creates a large industrial-scale world layout.
 * Geometry remains renderer-owned; this layer only describes the twin world.
 */
export class IndustrialWorld {
  readonly zones: IndustrialZone[];
  readonly config: IndustrialWorldConfig;

  constructor(config: IndustrialWorldConfig) {
    this.config = config;
    this.zones = config.zones;
  }

  createDefaultZones(): IndustrialZone[] {
    return [
      { id: 'storage', name: 'Storage Tank Farm', position: new THREE.Vector3(0, 0, 0), scale: new THREE.Vector3(200, 1, 200) },
      { id: 'process', name: 'Processing Unit', position: new THREE.Vector3(250, 0, 0), scale: new THREE.Vector3(150, 1, 150) },
      { id: 'control', name: 'Control Center', position: new THREE.Vector3(-250, 0, 0), scale: new THREE.Vector3(80, 1, 80) },
      { id: 'emergency', name: 'Emergency Response Zone', position: new THREE.Vector3(0, 0, 300), scale: new THREE.Vector3(100, 1, 100) }
    ];
  }
}
