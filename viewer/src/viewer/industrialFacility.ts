import * as THREE from "three";

export type FacilityAssetKind = "tank" | "pipe" | "pump" | "reactor" | "valve" | "building";

export interface FacilityAsset {
  id: string;
  kind: FacilityAssetKind;
  position: THREE.Vector3;
}

export interface IndustrialFacilityConfig {
  tanks?: number;
  pipes?: number;
  processingUnits?: number;
}

/**
 * Generates a large industrial layout.
 * Visual assets remain separate from twins; every generated asset gets a stable id
 * that can later bind to a Digital Twin.
 */
export function generateIndustrialFacility(config: IndustrialFacilityConfig = {}): FacilityAsset[] {
  const assets: FacilityAsset[] = [];
  const tanks = config.tanks ?? 24;
  const pipes = config.pipes ?? 80;
  const processingUnits = config.processingUnits ?? 6;

  for (let i = 0; i < tanks; i++) {
    const row = Math.floor(i / 6);
    const col = i % 6;
    assets.push({
      id: `T-${String(i + 1).padStart(3, "0")}`,
      kind: "tank",
      position: new THREE.Vector3(col * 18 - 45, 0, row * 18 - 30)
    });
  }

  for (let i = 0; i < pipes; i++) {
    assets.push({
      id: `P-${String(i + 1).padStart(3, "0")}`,
      kind: "pipe",
      position: new THREE.Vector3((i % 20) * 8 - 80, 1, Math.floor(i / 20) * 12)
    });
  }

  for (let i = 0; i < processingUnits; i++) {
    assets.push({
      id: `PROCESS-${i + 1}`,
      kind: "reactor",
      position: new THREE.Vector3(i * 22 - 55, 0, 70)
    });
  }

  assets.push({
    id: "CONTROL-CENTER",
    kind: "building",
    position: new THREE.Vector3(0, 0, 110)
  });

  return assets;
}
