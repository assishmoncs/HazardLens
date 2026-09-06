import { SimulationRuntime } from '../../../src/core/runtime.js';
import type { WorldSnapshot, TwinState } from '../../../src/core/types.js';
import {
  DistillationColumnTwin,
  IgnitionSourceTwin,
  PipeTwin,
  SphereTankTwin,
  TankTwin,
  WallTwin,
  WeatherTwin
} from '../../../src/twins/process.js';
import {
  AlarmSirenTwin,
  BuildingTwin,
  BundWallTwin,
  ColumnTwin,
  CompressorTwin,
  DelugeSystemTwin,
  DoorTwin,
  EmergencyShutdownTwin,
  FireMonitorTwin,
  FlameDetectorTwin,
  FlareStackTwin,
  GasDetectorTwin,
  GeneratorTwin,
  HeatExchangerTwin,
  HydrantTwin,
  MusterStationTwin,
  PressureVesselTwin,
  PumpTwin,
  ReactorTwin,
  RouteTwin,
  SensorTwin,
  ValveTwin,
  VehicleTwin,
  WindowTwin,
  WorkerTwin
} from '../../../src/twins/infrastructure.js';
import { EvacuationTwin } from '../../../src/interventions/index.js';

export type FaultMode =
  | 'leak'
  | 'rupture'
  | 'overheat'
  | 'overpressure'
  | 'valve_fail'
  | 'pump_fail'
  | 'power_loss'
  | 'fire'
  | 'structural_damage'
  | 'bleve'
  | 'toxic_release';

export type InterventionMode =
  | 'isolate'
  | 'cool'
  | 'suppress'
  | 'evacuate'
  | 'shutdown'
  | 'fire_monitor'
  | 'deluge'
  | 'blowdown';

export interface IncidentConfig {
  assetId: string;
  mode: FaultMode;
  severity: number;
  windX: number;
  windZ: number;
  chemical?: string;
}

export class ViewerSimulation {
  runtime: SimulationRuntime;
  running = false;
  speed = 1;
  private accumulator = 0;
  private lastIncident: IncidentConfig | null = null;

  constructor() {
    this.runtime = this.makeWorld();
  }

  private makeWorld() {
    return new SimulationRuntime([
      // Environmental Twin
      new WeatherTwin('WEATHER', 3, 0),

      // Fractionation & Process Units
      new DistillationColumnTwin('C-01', { x: -22, y: 0, z: -10 }, 'crude_oil'),
      new HeatExchangerTwin('HX-01', { x: -14, y: 1.5, z: -10 }),
      new PipeTwin('P-17', { x: -6, y: 1, z: -4 }, 'methane'),
      new PipeTwin('P-18', { x: 2, y: 1, z: -4 }, 'propane'),
      new ValveTwin('V-17', { x: -2, y: 1, z: -4 }),

      // Pumping & Compression Bay
      new PumpTwin('PUMP-01', { x: 6, y: 1.2, z: 4 }),
      new CompressorTwin('COMP-01', { x: 12, y: 1.2, z: 4 }),
      new GeneratorTwin('GEN-01', { x: -18, y: 0, z: 18 }),

      // Pressurized LPG Sphere & Tank Battery
      new SphereTankTwin('S-01', { x: 24, y: 0, z: -12 }, 'propane'),
      new TankTwin('T-04', { x: 10, y: 2, z: 0 }, 'propane'),
      new TankTwin('T-05', { x: 16, y: 2, z: 2 }, 'crude_oil'),
      new BundWallTwin('BUND-01', { x: 13, y: 0, z: 1 }, ['T-04', 'T-05', 'S-01']),

      // High-Pressure Reaction & Synthesis
      new PressureVesselTwin('V-01', { x: 22, y: 2, z: -4 }, 'ammonia'),
      new ReactorTwin('R-01', { x: 28, y: 2.5, z: -4 }, 'ammonia'),

      // Safety Instrumented Systems (SIS) & Emergency Mitigation
      new DelugeSystemTwin('DEL-01', { x: 24, y: 1, z: -12 }, 'S-01', 3800),
      new FlareStackTwin('FL-01', { x: 38, y: 0, z: -26 }),
      new EmergencyShutdownTwin('ESD-01', { x: -4, y: 1, z: 26 }),
      new AlarmSirenTwin('SIREN-01', { x: -2, y: 0, z: 26 }),

      // Gas & Optical Flame Detection Network
      new GasDetectorTwin('GD-01', { x: -18, y: 1.2, z: -6 }, 'methane'),
      new GasDetectorTwin('GD-02', { x: 20, y: 1.2, z: -8 }, 'propane'),
      new FlameDetectorTwin('FD-01', { x: 26, y: 2.2, z: -4 }),
      new SensorTwin('SENSOR-TEMP-01', { x: 11, y: 3, z: 0 }, 'temperature'),
      new SensorTwin('SENSOR-GAS-01', { x: 8, y: 2, z: 1 }, 'gas'),

      // Ignition Sources & Barriers
      new IgnitionSourceTwin('M-04', { x: 7, y: 1, z: 0 }),
      new WallTwin('W-07', { x: 8, y: 2, z: -5 }),
      new ColumnTwin('COL-01', { x: 12, y: 3, z: -6 }),
      new WindowTwin('WIN-01', { x: 18, y: 2, z: -7 }),

      // Buildings & Life Safety Infrastructure
      new DoorTwin('DOOR-01', { x: 4, y: 1, z: 32 }),
      new BuildingTwin('BLDG-01', { x: -2, y: 3, z: 36 }),
      new MusterStationTwin('MUSTER-01', { x: 26, y: 0, z: 28 }, 'MUSTER POINT ALPHA'),
      new HydrantTwin('HYD-01', { x: -2, y: 0.5, z: 12 }),
      new FireMonitorTwin('MON-01', { x: 14, y: 1, z: 10 }),
      new VehicleTwin('TRUCK-01', { x: -8, y: 0.5, z: 16 }, 'fire-engine'),
      new WorkerTwin('WORKER-01', { x: -10, y: 1, z: -2 }),
      new WorkerTwin('WORKER-02', { x: 14, y: 1, z: 6 }),
      new RouteTwin('ROUTE-A', { x: 6, y: 0, z: 16 }),
      new EvacuationTwin('EVAC', { x: 24, y: 0, z: 26 }, 'zone-a')
    ]);
  }

  reset() {
    this.runtime = this.makeWorld();
    this.running = false;
    this.accumulator = 0;
    this.lastIncident = null;
  }

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
    const chemical = config.chemical ?? String(target.state.metadata.chemical ?? 'propane');

    switch (config.mode) {
      case 'leak':
      case 'rupture': {
        if (targetKind === 'pipe') {
          const rateKgS = config.mode === 'rupture' ? 1.5 + severity * 3.5 : 0.25 + severity * 1.0;
          this.runtime.emit({
            type: 'fault.pipe_leak',
            sourceId: 'operator',
            targetId: config.assetId,
            payload: { rateKgS, chemical }
          });
        } else {
          this.runtime.emit({
            type: 'release.created',
            sourceId: 'operator',
            targetId: config.assetId,
            payload: {
              chemical,
              rateKgS: config.mode === 'rupture' ? 5.0 + severity * 10 : 0.8 + severity * 2.5,
              origin: { ...target.state.position }
            }
          });
        }
        break;
      }
      case 'bleve': {
        // Direct thermal escalation triggering BLEVE conditions
        this.runtime.emit({
          type: 'thermal.exposure',
          sourceId: 'operator',
          targetId: config.assetId,
          payload: { heatFluxKwM2: 250 + severity * 400, exposureSeconds: 5, model: 'thermal-point-source-v1' }
        });
        break;
      }
      case 'toxic_release': {
        this.runtime.emit({
          type: 'release.created',
          sourceId: 'operator',
          targetId: config.assetId,
          payload: {
            chemical: 'ammonia',
            rateKgS: 3.5 + severity * 6.5,
            origin: { ...target.state.position }
          }
        });
        break;
      }
      case 'fire':
        this.runtime.emit({
          type: 'fire.created',
          sourceId: 'operator',
          targetId: config.assetId,
          payload: { origin: { ...target.state.position }, intensityMw: 4 + severity * 14 }
        });
        break;
      case 'overheat':
        this.runtime.emit({
          type: 'thermal.exposure',
          sourceId: 'operator',
          targetId: config.assetId,
          payload: { heatFluxKwM2: 150 + severity * 450, exposureSeconds: 2 + severity * 4 }
        });
        break;
      case 'overpressure':
      case 'structural_damage':
        this.runtime.emit({
          type: 'overpressure.received',
          sourceId: 'operator',
          targetId: config.assetId,
          payload: { overpressureKpa: 15 + severity * 85 }
        });
        break;
      case 'valve_fail':
        if (targetKind === 'valve') {
          this.runtime.emit({ type: 'valve.command', sourceId: 'operator', targetId: config.assetId, payload: { action: 'fail' } });
        }
        break;
      case 'pump_fail':
        if (targetKind === 'pump' || targetKind === 'compressor') {
          this.runtime.emit({ type: 'pump.command', sourceId: 'operator', targetId: config.assetId, payload: { action: 'fail' } });
        }
        break;
      case 'power_loss':
        target.state.metadata.power = 'lost';
        this.runtime.emit({ type: 'power.loss', sourceId: 'operator', payload: { substation: 'SUB-01' } });
        break;
    }
    this.lastIncident = { ...config };
    this.running = true;
  }

  intervene(mode: InterventionMode) {
    const snap = this.runtime.snapshot();

    if (mode === 'deluge') {
      // Activate all deluge systems and water curtains
      for (const t of snap.twins.filter(t => t.kind === 'deluge-system')) {
        this.runtime.emit({
          type: 'deluge.activated',
          sourceId: 'operator',
          targetId: t.id,
          payload: { flowRateLpm: 3800 }
        });
      }
      for (const t of snap.twins.filter(t => t.kind === 'sphere-tank' || t.kind === 'tank')) {
        this.runtime.emit({
          type: 'cooling.command',
          sourceId: 'operator',
          targetId: t.id,
          payload: { enabled: true, rateKw: 900 }
        });
      }
    }

    if (mode === 'blowdown') {
      // Depressurize high pressure equipment to flare
      this.runtime.emit({
        type: 'blowdown.command',
        sourceId: 'operator',
        targetId: 'FL-01',
        payload: { source: 'EMERGENCY_DEPRESSURIZATION' }
      });
      for (const t of snap.twins.filter(t => t.kind === 'sphere-tank' || t.kind === 'distillation-column' || t.kind === 'pressure-vessel')) {
        this.runtime.emit({
          type: 'blowdown.command',
          sourceId: 'operator',
          targetId: t.id,
          payload: { destination: 'FL-01' }
        });
      }
    }

    if (mode === 'isolate') {
      const activePipes = snap.twins.filter(t => t.kind === 'pipe' && t.active);
      for (const pipe of activePipes) {
        this.runtime.emit({
          type: 'valve.command',
          sourceId: 'operator',
          targetId: pipe.id,
          payload: { action: 'close', pipeId: pipe.id }
        });
      }
      this.runtime.emit({ type: 'valve.command', sourceId: 'operator', targetId: 'V-17', payload: { action: 'close' } });
    }

    if (mode === 'cool') {
      for (const t of snap.twins.filter(t => ['tank', 'sphere-tank', 'pressure-vessel', 'reactor', 'distillation-column'].includes(t.kind))) {
        this.runtime.emit({
          type: 'cooling.command',
          sourceId: 'operator',
          targetId: t.id,
          payload: { enabled: true, rateKw: 600, targetId: t.id }
        });
      }
    }

    if (mode === 'suppress') {
      for (const t of snap.twins.filter(t => t.kind === 'fire' && t.active)) {
        this.runtime.emit({
          type: 'suppression.command',
          sourceId: 'operator',
          targetId: t.id,
          payload: { strength: 12 }
        });
      }
    }

    if (mode === 'evacuate') {
      this.runtime.emit({ type: 'evacuation.command', sourceId: 'operator', targetId: 'EVAC', payload: { zoneId: 'zone-a' } });
      this.runtime.emit({ type: 'evacuation.command', sourceId: 'operator', targetId: 'SIREN-01', payload: { audible: true } });
      this.runtime.emit({ type: 'evacuation.command', sourceId: 'operator', targetId: 'MUSTER-01', payload: { activate: true } });
      for (const worker of snap.twins.filter(t => t.kind === 'worker')) {
        this.runtime.emit({ type: 'evacuation.command', sourceId: 'operator', targetId: worker.id, payload: { destination: 'MUSTER-01' } });
      }
    }

    if (mode === 'shutdown') {
      this.runtime.emit({ type: 'shutdown.command', sourceId: 'operator', targetId: 'ESD-01', payload: { action: 'stop' } });
      for (const id of ['PUMP-01', 'COMP-01', 'C-01']) {
        this.runtime.emit({ type: 'pump.command', sourceId: 'ESD-01', targetId: id, payload: { action: 'stop' } });
        this.runtime.emit({ type: 'shutdown.command', sourceId: 'ESD-01', targetId: id, payload: { action: 'stop' } });
      }
    }

    if (mode === 'fire_monitor') {
      for (const fire of snap.twins.filter(t => t.kind === 'fire' && t.active)) {
        this.runtime.emit({
          type: 'suppression.command',
          sourceId: 'MON-01',
          targetId: fire.id,
          payload: { strength: 8 }
        });
      }
    }
  }

  getIncident(): IncidentConfig | null {
    return this.lastIncident ? { ...this.lastIncident } : null;
  }

  selectableAssets(): TwinState[] {
    return this.runtime
      .snapshot()
      .twins.filter(t =>
        [
          'sphere-tank', 'distillation-column', 'flare-stack', 'deluge-system', 'gas-detector',
          'flame-detector', 'pipe', 'tank', 'valve', 'pump', 'compressor', 'pressure-vessel',
          'reactor', 'heat-exchanger', 'muster-station', 'siren', 'generator', 'wall', 'column', 'window'
        ].includes(t.kind)
      );
  }

  update(realDt: number) {
    if (!this.running) return;
    this.accumulator += Math.min(realDt, 0.1) * this.speed;
    while (this.accumulator >= 0.05) {
      this.runtime.step(0.05);
      this.accumulator -= 0.05;
    }
  }

  snapshot(): WorldSnapshot {
    return this.runtime.snapshot();
  }
}
