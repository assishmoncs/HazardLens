export interface FacilityZone { id: string; name: string; assets: string[]; safetyRadius: number; }
export interface FacilityConnection { from: string; to: string; type: 'pipe' | 'walkway' | 'emergency_route' | 'control' | 'suppression'; }

export class FacilityGraph {
  zones: FacilityZone[] = [
    { id: 'processing', name: 'Processing Area', assets: ['P-17', 'M-04', 'P-18', 'V-17'], safetyRadius: 18 },
    { id: 'pumping_station', name: 'Pumping & Compression Station', assets: ['PUMP-01', 'COMP-01'], safetyRadius: 20 },
    { id: 'storage', name: 'Storage Area', assets: ['T-04', 'T-05'], safetyRadius: 25 },
    { id: 'critical_process', name: 'Pressure & Reaction Area', assets: ['V-01', 'R-01', 'HX-01'], safetyRadius: 28 },
    { id: 'safety_perimeter', name: 'Fire Protection & Muster', assets: ['HYD-01', 'MON-01', 'ESD-01', 'ROUTE-A', 'EVAC'], safetyRadius: 40 },
    { id: 'personnel', name: 'Personnel Zones', assets: ['WORKER-01', 'WORKER-02'], safetyRadius: 15 }
  ];

  connections: FacilityConnection[] = [
    { from: 'P-17', to: 'P-18', type: 'pipe' },
    { from: 'P-18', to: 'PUMP-01', type: 'pipe' },
    { from: 'PUMP-01', to: 'COMP-01', type: 'pipe' },
    { from: 'COMP-01', to: 'V-01', type: 'pipe' },
    { from: 'V-01', to: 'R-01', type: 'pipe' },
    { from: 'PUMP-01', to: 'T-04', type: 'pipe' },
    { from: 'T-04', to: 'T-05', type: 'pipe' },
    { from: 'HYD-01', to: 'MON-01', type: 'suppression' },
    { from: 'MON-01', to: 'T-04', type: 'suppression' },
    { from: 'MON-01', to: 'P-17', type: 'suppression' },
    { from: 'ESD-01', to: 'PUMP-01', type: 'control' },
    { from: 'ESD-01', to: 'COMP-01', type: 'control' },
    { from: 'WORKER-01', to: 'processing', type: 'walkway' },
    { from: 'WORKER-02', to: 'pumping_station', type: 'walkway' },
    { from: 'WORKER-01', to: 'ROUTE-A', type: 'emergency_route' },
    { from: 'WORKER-02', to: 'ROUTE-A', type: 'emergency_route' }
  ];

  findZone(assetId: string) { return this.zones.find(zone => zone.assets.includes(assetId)); }
  neighbors(assetId: string) { return this.connections.filter(c => c.from === assetId || c.to === assetId).map(c => c.from === assetId ? c.to : c.from); }
}
