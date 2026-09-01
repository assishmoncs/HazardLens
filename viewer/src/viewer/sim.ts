import { SimulationRuntime } from '../../../src/core/runtime.js';
import type { WorldSnapshot, TwinState, Vec3 } from '../../../src/core/types.js';
import { IgnitionSourceTwin, PipeTwin, TankTwin, WallTwin, WeatherTwin } from '../../../src/twins/process.js';
import { WorkerTwin, RouteTwin } from '../../../src/twins/infrastructure.js';
import { EvacuationTwin } from '../../../src/interventions/index.js';

export type FaultMode = 'leak' | 'rupture' | 'overheat' | 'failure';

export interface IncidentConfig {
  assetId: string;
  mode: FaultMode;
  severity: number;
  windX: number;
  windZ: number;
}

export class ViewerSimulation {
  runtime: SimulationRuntime;
  running = false;
  speed = 1;
  private accumulator = 0;
  private lastIncident: IncidentConfig | null = null;

  constructor() { this.runtime = this.makeWorld(); }

  private makeWorld() {
    return new SimulationRuntime([
      new WeatherTwin('WEATHER', 3, 0),
      new PipeTwin('P-17', { x: 0, y: 1, z: 0 }),
      new PipeTwin('P-18', { x: 5, y: 1, z: 0 }),
      new IgnitionSourceTwin('M-04', { x: 7, y: 1, z: 0 }),
      new TankTwin('T-04', { x: 10, y: 2, z: 0 }),
      new TankTwin('T-05', { x: 15, y: 2, z: 2 }),
      new WallTwin('W-07', { x: 8, y: 2, z: -5 }),
      new WorkerTwin('WORKER-01', { x: 3, y: 1, z: 2 }),
      new WorkerTwin('WORKER-02', { x: 11, y: 1, z: 4 }),
      new RouteTwin('ROUTE-A', { x: 0, y: 0, z: 8 }),
      new EvacuationTwin('EVAC', { x: -5, y: 0, z: 8 }, 'zone-a'),
    ]);
  }

  reset() {
    this.runtime = this.makeWorld();
    this.running = false;
    this.accumulator = 0;
    this.lastIncident = null;
  }

  injectIncident(config: IncidentConfig) {
    const weather = this.runtime.get('WEATHER') as (import('../../../src/core/types.js').Twin & { windX?: number; windZ?: number }) | undefined;
    if (weather) {
      weather.windX = config.windX;
      weather.windZ = config.windZ;
      weather.state.metadata.windX = config.windX;
      weather.state.metadata.windZ = config.windZ;
    }

    const severity = Math.max(0.1, Math.min(1, config.severity));
    if (config.assetId.startsWith('P-')) {
      const rateKgS = config.mode === 'rupture' ? 1.2 + severity * 2.2 : 0.25 + severity * 0.85;
      this.runtime.emit({ type: 'fault.pipe_leak', sourceId: 'operator', targetId: config.assetId, payload: { rateKgS } });
    } else if (config.assetId.startsWith('T-')) {
      this.runtime.emit({ type: 'thermal.exposure', sourceId: 'operator', targetId: config.assetId, payload: { heatFluxKwM2: 120 + severity * 300, exposureSeconds: 1 } });
    } else {
      this.runtime.emit({ type: 'fault.asset', sourceId: 'operator', targetId: config.assetId, payload: { severity, mode: config.mode } });
    }
    this.lastIncident = { ...config };
    this.running = true;
  }

  breakPipe() { this.injectIncident({ assetId: 'P-17', mode: 'leak', severity: .5, windX: 3, windZ: 0 }); }

  suppress() {
    for (const t of this.runtime.snapshot().twins.filter(t => t.kind === 'fire' && t.active)) {
      this.runtime.emit({ type:'suppression.command', sourceId:'operator', targetId:t.id, payload:{strength:10} });
    }
  }

  intervene(mode: 'isolate' | 'cool' | 'suppress' | 'evacuate') {
    const snap = this.runtime.snapshot();
    if (mode === 'isolate') {
      const pipe = snap.twins.find(t => t.kind === 'pipe' && t.active);
      if (pipe) this.runtime.emit({ type:'valve.command', sourceId:'operator', targetId:pipe.id, payload:{action:'close', pipeId:pipe.id} });
    }
    if (mode === 'cool') {
      for (const t of snap.twins.filter(t => t.kind === 'tank' && t.active)) {
        this.runtime.emit({ type:'cooling.command', sourceId:'operator', targetId:t.id, payload:{enabled:true,rateKw:350,targetId:t.id} });
      }
    }
    if (mode === 'suppress') this.suppress();
    if (mode === 'evacuate') this.runtime.emit({ type:'evacuation.command', sourceId:'operator', targetId:'EVAC', payload:{zoneId:'zone-a'} });
  }

  getIncident(): IncidentConfig | null { return this.lastIncident ? { ...this.lastIncident } : null; }
  selectableAssets(): TwinState[] { return this.runtime.snapshot().twins.filter(t => ['pipe','tank'].includes(t.kind)); }

  update(realDt:number) { if(!this.running) return; this.accumulator += Math.min(realDt,.1)*this.speed; while(this.accumulator >= .05){ this.runtime.step(.05); this.accumulator -= .05; } }
  snapshot():WorldSnapshot { return this.runtime.snapshot(); }
}
