export interface FacilityZone {
  id: string;
  name: string;
  assets: string[];
  safetyRadius: number;
}

export interface FacilityConnection {
  from: string;
  to: string;
  type: 'pipe' | 'walkway' | 'emergency_route';
}

export class FacilityGraph {
  zones: FacilityZone[] = [
    { id: 'processing', name: 'Processing Area', assets: ['P-17', 'M-04'], safetyRadius: 18 },
    { id: 'storage', name: 'Storage Area', assets: ['T-04', 'T-05'], safetyRadius: 25 }
  ];

  connections: FacilityConnection[] = [
    { from: 'P-17', to: 'T-04', type: 'pipe' },
    { from: 'T-04', to: 'T-05', type: 'emergency_route' }
  ];

  findZone(assetId: string) {
    return this.zones.find(zone => zone.assets.includes(assetId));
  }

  neighbors(assetId: string) {
    return this.connections
      .filter(c => c.from === assetId || c.to === assetId)
      .map(c => c.from === assetId ? c.to : c.from);
  }
}
