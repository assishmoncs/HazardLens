export interface FacilityZone {
  id: string;
  name: string;
  assets: string[];
  safetyRadius: number;
}

export interface FacilityConnection {
  from: string;
  to: string;
  type: 'pipe' | 'walkway' | 'emergency_route' | 'control' | 'suppression' | 'instrumentation';
}

export class FacilityGraph {
  zones: FacilityZone[] = [
    {
      id: 'fractionation',
      name: 'Fractionation & Separation Train',
      assets: ['C-01', 'HX-01', 'P-17', 'P-18', 'V-17', 'GD-01'],
      safetyRadius: 32
    },
    {
      id: 'lpg_storage',
      name: 'Pressurized LPG Sphere Farm (High BLEVE Risk)',
      assets: ['S-01', 'DEL-01', 'GD-02', 'FD-01', 'BUND-01'],
      safetyRadius: 45
    },
    {
      id: 'pumping_station',
      name: 'Pumping & Compression Bay',
      assets: ['PUMP-01', 'COMP-01', 'M-04', 'GEN-01'],
      safetyRadius: 22
    },
    {
      id: 'atmospheric_storage',
      name: 'Bulk Hydrocarbon Tank Battery',
      assets: ['T-04', 'T-05', 'BUND-01'],
      safetyRadius: 30
    },
    {
      id: 'critical_process',
      name: 'High-Pressure Synthesis & Reactor Bay',
      assets: ['V-01', 'R-01'],
      safetyRadius: 35
    },
    {
      id: 'flare_relief',
      name: 'Emergency Relief & Flare Subsystem',
      assets: ['FL-01', 'ESD-01'],
      safetyRadius: 50
    },
    {
      id: 'safety_muster',
      name: 'Safety Muster Station & Emergency Operations',
      assets: ['MUSTER-01', 'SIREN-01', 'ROUTE-A', 'EVAC', 'HYD-01', 'MON-01', 'TRUCK-01'],
      safetyRadius: 60
    },
    {
      id: 'personnel',
      name: 'Operations Personnel',
      assets: ['WORKER-01', 'WORKER-02'],
      safetyRadius: 15
    }
  ];

  connections: FacilityConnection[] = [
    // Hydrocarbon Process Stream
    { from: 'C-01', to: 'HX-01', type: 'pipe' },
    { from: 'HX-01', to: 'P-17', type: 'pipe' },
    { from: 'P-17', to: 'V-17', type: 'pipe' },
    { from: 'V-17', to: 'P-18', type: 'pipe' },
    { from: 'P-18', to: 'PUMP-01', type: 'pipe' },
    { from: 'PUMP-01', to: 'COMP-01', type: 'pipe' },
    { from: 'COMP-01', to: 'S-01', type: 'pipe' },
    { from: 'PUMP-01', to: 'T-04', type: 'pipe' },
    { from: 'T-04', to: 'T-05', type: 'pipe' },
    { from: 'COMP-01', to: 'V-01', type: 'pipe' },
    { from: 'V-01', to: 'R-01', type: 'pipe' },

    // Emergency Relief Lines to Flare Stack
    { from: 'S-01', to: 'FL-01', type: 'pipe' },
    { from: 'C-01', to: 'FL-01', type: 'pipe' },
    { from: 'V-01', to: 'FL-01', type: 'pipe' },

    // Safety Instrumentation Systems (SIS) & Interlocks
    { from: 'GD-01', to: 'ESD-01', type: 'instrumentation' },
    { from: 'GD-02', to: 'ESD-01', type: 'instrumentation' },
    { from: 'FD-01', to: 'DEL-01', type: 'instrumentation' },
    { from: 'ESD-01', to: 'PUMP-01', type: 'control' },
    { from: 'ESD-01', to: 'COMP-01', type: 'control' },
    { from: 'ESD-01', to: 'V-17', type: 'control' },
    { from: 'ESD-01', to: 'SIREN-01', type: 'control' },
    { from: 'DEL-01', to: 'S-01', type: 'suppression' },
    { from: 'HYD-01', to: 'MON-01', type: 'suppression' },
    { from: 'MON-01', to: 'T-04', type: 'suppression' },
    { from: 'MON-01', to: 'S-01', type: 'suppression' },

    // Personnel Evacuation Routes
    { from: 'WORKER-01', to: 'ROUTE-A', type: 'emergency_route' },
    { from: 'WORKER-02', to: 'ROUTE-A', type: 'emergency_route' },
    { from: 'ROUTE-A', to: 'MUSTER-01', type: 'emergency_route' },
    { from: 'ROUTE-A', to: 'EVAC', type: 'emergency_route' }
  ];

  findZone(assetId: string) {
    return this.zones.find(zone => zone.assets.includes(assetId));
  }

  neighbors(assetId: string) {
    return this.connections
      .filter(c => c.from === assetId || c.to === assetId)
      .map(c => (c.from === assetId ? c.to : c.from));
  }
}
