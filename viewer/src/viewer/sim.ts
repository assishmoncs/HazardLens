import { SimulationRuntime } from '../../../src/core/runtime.js';
import type { WorldSnapshot, TwinState } from '../../../src/core/types.js';
import { IgnitionSourceTwin, PipeTwin, TankTwin, WallTwin, WeatherTwin } from '../../../src/twins/process.js';
import { WorkerTwin, RouteTwin, PumpTwin, CompressorTwin, PressureVesselTwin, ReactorTwin, HeatExchangerTwin, ValveTwin, ColumnTwin, WindowTwin, DoorTwin, BuildingTwin, HydrantTwin, FireMonitorTwin, EmergencyShutdownTwin, VehicleTwin, SensorTwin } from '../../../src/twins/infrastructure.js';
import { EvacuationTwin } from '../../../src/interventions/index.js';

export type FaultMode = 'leak' | 'rupture' | 'overheat' | 'overpressure' | 'valve_fail' | 'pump_fail' | 'power_loss' | 'fire' | 'structural_damage';
export type InterventionMode = 'isolate' | 'cool' | 'suppress' | 'evacuate' | 'shutdown' | 'fire_monitor';

export interface IncidentConfig { assetId: string; mode: FaultMode; severity: number; windX: number; windZ: number; }

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
      new ValveTwin('V-17', { x: 2.5, y: 1, z: 0 }),
      new PumpTwin('PUMP-01', { x: 6, y: 1.2, z: 4 }),
      new CompressorTwin('COMP-01', { x: 10, y: 1.2, z: 4 }),
      new PressureVesselTwin('V-01', { x: 20, y: 2, z: -4 }),
      new ReactorTwin('R-01', { x: 26, y: 2.5, z: -4 }),
      new HeatExchangerTwin('HX-01', { x: 16, y: 1.5, z: 5 }),
      new IgnitionSourceTwin('M-04', { x: 7, y: 1, z: 0 }),
      new TankTwin('T-04', { x: 10, y: 2, z: 0 }),
      new TankTwin('T-05', { x: 15, y: 2, z: 2 }),
      new WallTwin('W-07', { x: 8, y: 2, z: -5 }),
      new ColumnTwin('COL-01', { x: 12, y: 3, z: -6 }),
      new WindowTwin('WIN-01', { x: 18, y: 2, z: -7 }),
      new DoorTwin('DOOR-01', { x: 4, y: 1, z: 9 }),
      new BuildingTwin('BLDG-01', { x: 4, y: 3, z: 10 }),
      new HydrantTwin('HYD-01', { x: -2, y: 0.5, z: 7 }),
      new FireMonitorTwin('MON-01', { x: 12, y: 1, z: 9 }),
      new EmergencyShutdownTwin('ESD-01', { x: -4, y: 1, z: 9 }),
      new VehicleTwin('TRUCK-01', { x: -8, y: 0.5, z: 9 }),
      new SensorTwin('SENSOR-TEMP-01', { x: 11, y: 3, z: 0 }, 'temperature'),
      new SensorTwin('SENSOR-GAS-01', { x: 8, y: 2, z: 1 }, 'gas'),
      new WorkerTwin('WORKER-01', { x: 3, y: 1, z: 2 }),
      new WorkerTwin('WORKER-02', { x: 11, y: 1, z: 4 }),
      new RouteTwin('ROUTE-A', { x: 0, y: 0, z: 8 }),
      new EvacuationTwin('EVAC', { x: -5, y: 0, z: 8 }, 'zone-a'),
    ]);
  }

  reset() { this.runtime = this.makeWorld(); this.running = false; this.accumulator = 0; this.lastIncident = null; }

  setWeather(windX: number, windZ: number) {
    const weather = this.runtime.get('WEATHER') as WeatherTwin | undefined;
    if (!weather) return;
    weather.windX = windX;
    weather.windZ = windZ;
    weather.state.metadata.windX = windX;
    weather.state.metadata.windZ = windZ;
  }

  injectIncident(config: IncidentConfig) {
    this.setWeather(config.windX, config.windZ);
    const severity = Math.max(0.1, Math.min(1, config.severity));
    const target = this.runtime.get(config.assetId);
    if (!target) return;
    const targetKind = target.state.kind;

    switch (config.mode) {
      case 'leak':
      case 'rupture': {
        if (targetKind === 'pipe') {
          const rateKgS = config.mode === 'rupture' ? 1.2 + severity * 2.2 : 0.25 + severity * 0.85;
          this.runtime.emit({ type: 'fault.pipe_leak', sourceId: 'operator', targetId: config.assetId, payload: { rateKgS } });
        } else if (targetKind === 'pressure-vessel' || targetKind === 'reactor' || targetKind === 'tank') {
          this.runtime.emit({ type: 'release.created', sourceId: 'operator', targetId: config.assetId, payload: { chemical: String(target.state.metadata.chemical ?? 'fuel'), rateKgS: 0.8 + severity * 3, origin: { ...target.state.position } } });
        }
        break;
      }
      case 'fire':
        this.runtime.emit({ type: 'fire.created', sourceId: 'operator', targetId: config.assetId, payload: { origin: { ...target.state.position }, intensityMw: 3 + severity * 8 } });
        break;
      case 'overheat':
        this.runtime.emit({ type: 'thermal.exposure', sourceId: 'operator', targetId: config.assetId, payload: { heatFluxKwM2: 120 + severity * 420, exposureSeconds: 1 + severity * 3 } });
        break;
      case 'overpressure':
      case 'structural_damage':
        this.runtime.emit({ type: 'overpressure.received', sourceId: 'operator', targetId: config.assetId, payload: { overpressureKpa: 10 + severity * 50 } });
        break;
      case 'valve_fail':
        if (targetKind === 'valve') this.runtime.emit({ type: 'valve.command', sourceId: 'operator', targetId: config.assetId, payload: { action: 'fail' } });
        break;
      case 'pump_fail':
        if (targetKind === 'pump' || targetKind === 'compressor') this.runtime.emit({ type: 'pump.command', sourceId: 'operator', targetId: config.assetId, payload: { action: 'fail' } });
        break;
      case 'power_loss':
        target.state.metadata.power = 'lost';
        if (targetKind === 'pump' || targetKind === 'compressor') this.runtime.emit({ type: 'pump.command', sourceId: 'operator', targetId: config.assetId, payload: { action: 'stop' } });
        break;
    }
    this.lastIncident = { ...config };
    this.running = true;
  }

  breakPipe() { this.injectIncident({ assetId: 'P-17', mode: 'leak', severity: .5, windX: 3, windZ: 0 }); }
  suppress() { this.intervene('suppress'); }

  intervene(mode: InterventionMode) {
    const snap = this.runtime.snapshot();
    if (mode === 'isolate') {
      const pipe = snap.twins.find(t => t.kind === 'pipe' && t.active);
      if (pipe) this.runtime.emit({ type:'valve.command', sourceId:'operator', targetId:pipe.id, payload:{action:'close', pipeId:pipe.id} });
    }
    if (mode === 'cool') {
      for (const t of snap.twins.filter(t => t.kind === 'tank' || t.kind === 'pressure-vessel' || t.kind === 'reactor')) this.runtime.emit({ type:'cooling.command', sourceId:'operator', targetId:t.id, payload:{enabled:true,rateKw:400,targetId:t.id} });
    }
    if (mode === 'suppress') this.suppressActiveFires();
    if (mode === 'evacuate') {
      this.runtime.emit({ type:'evacuation.command', sourceId:'operator', targetId:'EVAC', payload:{zoneId:'zone-a'} });
      for (const worker of snap.twins.filter(t => t.kind === 'worker')) this.runtime.emit({ type:'evacuation.command', sourceId:'operator', targetId:worker.id, payload:{zoneId:'zone-a'} });
    }
    if (mode === 'shutdown') {
      for (const id of ['PUMP-01','COMP-01']) this.runtime.emit({ type:'pump.command', sourceId:'ESD-01', targetId:id, payload:{action:'stop'} });
      this.runtime.emit({ type:'shutdown.command', sourceId:'operator', targetId:'ESD-01', payload:{targets:['PUMP-01','COMP-01'],action:'stop'} });
    }
    if (mode === 'fire_monitor') {
      for (const fire of snap.twins.filter(t => t.kind === 'fire' && t.active)) this.runtime.emit({ type:'suppression.command', sourceId:'MON-01', targetId:fire.id, payload:{strength:5} });
    }
  }

  private suppressActiveFires() { for (const t of this.runtime.snapshot().twins.filter(t => t.kind === 'fire' && t.active)) this.runtime.emit({ type:'suppression.command', sourceId:'operator', targetId:t.id, payload:{strength:10} }); }
  getIncident(): IncidentConfig | null { return this.lastIncident ? { ...this.lastIncident } : null; }
  selectableAssets(): TwinState[] { return this.runtime.snapshot().twins.filter(t => ['pipe','tank','valve','pump','compressor','pressure-vessel','reactor','heat-exchanger','wall','column','window'].includes(t.kind)); }
  update(realDt:number) { if(!this.running) return; this.accumulator += Math.min(realDt,.1)*this.speed; while(this.accumulator >= .05){ this.runtime.step(.05); this.accumulator -= .05; } }
  snapshot():WorldSnapshot { return this.runtime.snapshot(); }
}
