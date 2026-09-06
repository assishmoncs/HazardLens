import type { SimEvent, Twin, TwinContext, TwinKind, TwinState, Vec3 } from "../core/types.js";
import { BaseTwin } from "./base.js";

const cloneState = <T>(value: T): T => structuredClone(value);

function meta(modelIds: string[], relationships: { targetId: string; type: "connected" | "nearby" | "depends_on" | "contained_by" | "protects" }[] = []) {
  return { modelIds, relationships, physicalProfile: undefined, history: [] };
}

function state(id: string, kind: TwinKind, position: Vec3, metadata: Record<string, string | number | boolean> = {}): TwinState {
  return { id, kind, position: { ...position }, fidelity: 1, active: true, integrity: 1, temperatureK: 303, metadata };
}

abstract class StaticTwin extends BaseTwin {
  onEvent(event: SimEvent): void { this.record(event, `processed ${event.type}`); }
  tick(): void {}
}

export class ValveTwin extends BaseTwin {
  public open = true;
  public failed = false;
  constructor(id: string, position: Vec3, public readonly diameterMm = 100) {
    super(state(id, "valve", position, { open: true, diameterMm }), meta(["valve-state-v1"]));
  }
  onEvent(event: SimEvent, _context: TwinContext): void {
    if (event.targetId !== this.state.id) return;
    this.record(event, `processed ${event.type}`);
    if (event.type === "valve.command") {
      const action = String(event.payload.action ?? "");
      if (action === "close") this.open = false;
      if (action === "open") this.open = true;
      if (action === "fail") { this.failed = true; this.state.integrity = 0; this.state.active = false; }
      this.state.metadata.open = this.open;
      this.state.metadata.failed = this.failed;
    }
    if (event.type === "asset.failed") { this.state.integrity = Math.max(0, this.state.integrity - 0.1); }
  }
  tick(): void {}
  clone(): Twin { const x = new ValveTwin(this.state.id, this.state.position, this.diameterMm); x.open = this.open; x.failed = this.failed; Object.assign(x.state, cloneState(this.state)); return x; }
}

export class PumpTwin extends BaseTwin {
  public running = true;
  public rpm = 1800;
  constructor(id: string, position: Vec3) { super(state(id, "pump", position, { running: true, rpm: 1800 }), meta(["pump-state-v1"])); }
  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.targetId !== this.state.id) return;
    this.record(event, `processed ${event.type}`);
    if (event.type === "pump.command") {
      const action = String(event.payload.action ?? "");
      if (action === "stop") { this.running = false; this.rpm = 0; }
      if (action === "start") { this.running = true; this.rpm = Number(event.payload.rpm ?? 1800); }
      if (action === "fail") { this.running = false; this.rpm = 0; this.state.integrity = 0; this.state.active = false; context.emit({ type: "asset.failed", sourceId: this.state.id, payload: { kind: "pump", mode: "mechanical" } }); }
      this.state.metadata.running = this.running;
      this.state.metadata.rpm = this.rpm;
    }
  }
  tick(dt: number): void { if (this.running) this.state.temperatureK += Math.max(0, this.rpm - 1600) * dt * 0.002; }
  clone(): Twin { const x = new PumpTwin(this.state.id, this.state.position); x.running = this.running; x.rpm = this.rpm; Object.assign(x.state, cloneState(this.state)); return x; }
}

export class CompressorTwin extends PumpTwin {
  constructor(id: string, position: Vec3) { super(id, position); (this.state as TwinState).kind = "compressor"; }
  clone(): Twin { const x = new CompressorTwin(this.state.id, this.state.position); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class PressureVesselTwin extends BaseTwin {
  public pressureBar = 12;
  public maxPressureBar = 24;
  constructor(id: string, position: Vec3, public readonly chemical = "ammonia") {
    super(state(id, "pressure-vessel", position, { chemical, pressureBar: 12, maxPressureBar: 24 }), meta(["pressure-vessel-v1"]));
  }
  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.targetId !== this.state.id) return;
    this.record(event, `processed ${event.type}`);
    if (event.type === "thermal.exposure") {
      const flux = Number(event.payload.heatFluxKwM2 ?? 0);
      this.pressureBar += flux * 0.02;
      this.state.temperatureK += flux * 0.012;
      this.state.integrity = Math.max(0, 1 - Math.max(0, this.pressureBar - 10) * 0.035);
      this.state.metadata.pressureBar = this.pressureBar;
      if (this.pressureBar >= this.maxPressureBar || this.state.integrity <= 0.45) {
        this.state.active = false;
        context.emit({ type: "asset.failed", sourceId: this.state.id, payload: { kind: "pressure-vessel", mode: "overpressure" } });
        context.emit({ type: "release.created", sourceId: this.state.id, payload: { chemical: this.chemical, rateKgS: 3.2, origin: { ...this.state.position } } });
      }
    }
  }
  tick(): void {}
  clone(): Twin { const x = new PressureVesselTwin(this.state.id, this.state.position, this.chemical); x.pressureBar = this.pressureBar; Object.assign(x.state, cloneState(this.state)); return x; }
}

export class ReactorTwin extends PressureVesselTwin {
  constructor(id: string, position: Vec3, chemical = "reactive-feed") { super(id, position, chemical); this.state.kind = "reactor"; }
  clone(): Twin { const x = new ReactorTwin(this.state.id, this.state.position, this.chemical); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class HeatExchangerTwin extends BaseTwin {
  public dutyMw = 2;
  constructor(id: string, position: Vec3) { super(state(id, "heat-exchanger", position, { dutyMw: 2 }), meta(["heat-exchanger-v1"])); }
  onEvent(event: SimEvent): void {
    if (event.targetId !== this.state.id) return;
    this.record(event, `processed ${event.type}`);
    if (event.type === "thermal.exposure") {
      const flux = Number(event.payload.heatFluxKwM2 ?? 0);
      this.state.temperatureK += flux * 0.01;
      this.dutyMw = Math.max(0, this.dutyMw - flux * 0.002);
      this.state.metadata.dutyMw = this.dutyMw;
    }
  }
  tick(): void {}
  clone(): Twin { const x = new HeatExchangerTwin(this.state.id, this.state.position); x.dutyMw = this.dutyMw; Object.assign(x.state, cloneState(this.state)); return x; }
}

export class PipeJunctionTwin extends StaticTwin {
  constructor(id: string, position: Vec3) { super(state(id, "pipe-junction", position, { connectedBranches: 3 }), meta(["junction-state-v1"])); }
  clone(): Twin { const x = new PipeJunctionTwin(this.state.id, this.state.position); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class ColumnTwin extends BaseTwin {
  constructor(id: string, position: Vec3) { super(state(id, "column", position, { damageState: "normal" }), meta(["structural-column-v1"])); }
  onEvent(event: SimEvent): void {
    if (event.targetId !== this.state.id) return;
    if (event.type === "thermal.exposure" || event.type === "overpressure.received") {
      const load = Number(event.payload.heatFluxKwM2 ?? event.payload.overpressureKpa ?? 0);
      this.state.integrity = Math.max(0, this.state.integrity - load * 0.00003);
      this.state.metadata.damageState = this.state.integrity < 0.35 ? "failed" : this.state.integrity < 0.7 ? "damaged" : "normal";
      this.record(event, `structural response to ${event.type}`);
    }
  }
  tick(): void {}
  clone(): Twin { const x = new ColumnTwin(this.state.id, this.state.position); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class WindowTwin extends BaseTwin {
  constructor(id: string, position: Vec3) { super(state(id, "window", position, { intact: true }), meta(["blast-window-v1"])); }
  onEvent(event: SimEvent): void {
    if (event.targetId !== this.state.id || event.type !== "overpressure.received") return;
    const p = Number(event.payload.overpressureKpa ?? 0);
    if (p >= 5) { this.state.integrity = 0; this.state.metadata.intact = false; this.state.active = false; }
    this.record(event, `window response at ${p} kPa`);
  }
  tick(): void {}
  clone(): Twin { const x = new WindowTwin(this.state.id, this.state.position); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class DoorTwin extends BaseTwin {
  constructor(id: string, position: Vec3) { super(state(id, "door", position, { open: false }), meta(["door-state-v1"])); }
  onEvent(event: SimEvent): void { if (event.targetId === this.state.id && event.type === "evacuation.command") this.state.metadata.open = true; }
  tick(): void {}
  clone(): Twin { const x = new DoorTwin(this.state.id, this.state.position); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class BuildingTwin extends BaseTwin {
  constructor(id: string, position: Vec3) { super(state(id, "building", position, { occupancy: 0, access: "open", damageState: "normal" }), meta(["building-state-v1"])); }
  onEvent(event: SimEvent): void {
    if (event.targetId !== this.state.id) return;
    if (event.type === "geometry.changed" || event.type === "asset.failed") this.state.metadata.damageState = "damaged";
  }
  tick(): void {}
  clone(): Twin { const x = new BuildingTwin(this.state.id, this.state.position); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class HydrantTwin extends StaticTwin {
  constructor(id: string, position: Vec3) { super(state(id, "hydrant", position, { pressureBar: 7, flowLpm: 1200, available: true }), meta(["hydrant-v1"])); }
  clone(): Twin { const x = new HydrantTwin(this.state.id, this.state.position); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class FireMonitorTwin extends StaticTwin {
  constructor(id: string, position: Vec3) { super(state(id, "fire-monitor", position, { rangeM: 45, flowLpm: 1800, available: true }), meta(["fire-monitor-v1"])); }
  clone(): Twin { const x = new FireMonitorTwin(this.state.id, this.state.position); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class EmergencyShutdownTwin extends StaticTwin {
  constructor(id: string, position: Vec3) { super(state(id, "shutdown", position, { armed: true, triggered: false }), meta(["esd-v1"])); }
  clone(): Twin { const x = new EmergencyShutdownTwin(this.state.id, this.state.position); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class WorkerTwin extends BaseTwin {
  constructor(id: string, position: Vec3) { super(state(id, "worker", position, { exposure: 0, evacuation: "none", role: "operator" }), meta(["worker-exposure-v1"])); }
  onEvent(event: SimEvent): void {
    if (event.type === "evacuation.command" && (!event.targetId || event.targetId === this.state.id)) this.state.metadata.evacuation = "moving";
    if (event.type === "thermal.exposure" && event.targetId === this.state.id) this.state.metadata.exposure = Number(this.state.metadata.exposure ?? 0) + Number(event.payload.heatFluxKwM2 ?? 0);
  }
  tick(): void {}
  clone(): Twin { const x = new WorkerTwin(this.state.id, this.state.position); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class VehicleTwin extends BaseTwin {
  constructor(id: string, position: Vec3, public readonly role = "fire-engine") { super(state(id, "vehicle", position, { role, available: true }), meta(["vehicle-response-v1"])); }
  onEvent(event: SimEvent): void { if (event.type === "evacuation.command" && event.targetId === this.state.id) this.state.metadata.destination = String(event.payload.destination ?? "staging"); }
  tick(): void {}
  clone(): Twin { const x = new VehicleTwin(this.state.id, this.state.position, this.role); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class SensorTwin extends StaticTwin {
  constructor(id: string, position: Vec3, public readonly measurement = "temperature") { super(state(id, "sensor", position, { measurement, quality: 1, online: true }), meta(["sensor-quality-v1"])); }
  clone(): Twin { const x = new SensorTwin(this.state.id, this.state.position, this.measurement); Object.assign(x.state, cloneState(this.state)); return x; }
}

export class RouteTwin extends StaticTwin {
  constructor(id: string, position: Vec3) { super(state(id, "route", position, { open: true, risk: 0, capacity: 50 }), meta(["route-risk-v1"])); }
  onEvent(event: SimEvent): void { if (event.type === "route.blocked" && event.targetId === this.state.id) { this.state.metadata.open = false; this.state.metadata.risk = 1; } }
  clone(): Twin { const x = new RouteTwin(this.state.id, this.state.position); Object.assign(x.state, cloneState(this.state)); return x; }
}

/**
 * Automated Fixed Deluge Water Spray Twin (NFPA 15 standard).
 * Protects vessels and equipment with high-rate water curtain cooling.
 */
export class DelugeSystemTwin extends BaseTwin {
  public activated = false;
  constructor(id: string, position: Vec3, public targetProtectedAssetId: string, public flowRateLpm = 3200) {
    super(
      state(id, "deluge-system", position, {
        targetProtectedAssetId,
        flowRateLpm,
        activated: false,
        waterPressureBar: 9.5,
        coverageAreaM2: 280
      }),
      meta(["deluge-protection-v1"], [{ targetId: targetProtectedAssetId, type: "protects" }])
    );
  }

  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.type === "deluge.activated" && (event.targetId === this.state.id || event.targetId === this.targetProtectedAssetId)) {
      this.activate(context);
    }
    if (event.type === "alarm.triggered" && event.payload.severity === "CRITICAL" && !this.activated) {
      // Automatic executive interlock: activate deluge if optical flame detector confirmed
      this.activate(context);
    }
  }

  private activate(context: TwinContext) {
    if (this.activated) return;
    this.activated = true;
    this.state.metadata.activated = true;
    context.emit({
      type: "deluge.activated",
      sourceId: this.state.id,
      targetId: this.targetProtectedAssetId,
      payload: { flowRateLpm: this.flowRateLpm, rateKw: 850, protectionFactor: 0.75 }
    });
  }

  tick(): void {}
  clone(): Twin {
    const x = new DelugeSystemTwin(this.state.id, this.state.position, this.targetProtectedAssetId, this.flowRateLpm);
    x.activated = this.activated;
    Object.assign(x.state, cloneState(this.state));
    return x;
  }
}

/**
 * Catalytic Bead / Optical Flammable Gas Detector Twin.
 * Monitors local Lower Explosive Limit (% LEL) and triggers plant safety interlocks.
 */
export class GasDetectorTwin extends BaseTwin {
  public currentLel = 0;
  public alarmLevel: "NORMAL" | "LOW_ALARM" | "HIGH_ALARM" = "NORMAL";

  constructor(id: string, position: Vec3, public chemical = "propane") {
    super(
      state(id, "gas-detector", position, {
        chemical,
        lelPct: 0,
        alarmLevel: "NORMAL",
        tripLelLow: 20,
        tripLelHigh: 50,
        online: true
      }),
      meta(["gas-detection-v1"])
    );
  }

  onEvent(_event: SimEvent): void {}

  tick(_dt: number, context: TwinContext): void {
    // Sample surrounding releases
    let highestLel = 0;
    for (const twin of context.twins()) {
      if (twin.state.kind === "release" && twin.state.active) {
        const dist = Math.hypot(
          this.state.position.x - twin.state.position.x,
          this.state.position.y - twin.state.position.y,
          this.state.position.z - twin.state.position.z
        );
        const radius = Number(twin.state.metadata.radiusM ?? 5);
        if (dist <= radius) {
          const intensity = (1 - dist / Math.max(1, radius)) * 100;
          highestLel = Math.max(highestLel, intensity);
        }
      }
    }
    this.currentLel = highestLel;
    this.state.metadata.lelPct = Math.round(highestLel);

    if (highestLel >= 50 && this.alarmLevel !== "HIGH_ALARM") {
      this.alarmLevel = "HIGH_ALARM";
      this.state.metadata.alarmLevel = "HIGH_ALARM";
      context.emit({
        type: "alarm.triggered",
        sourceId: this.state.id,
        payload: { alarmType: "GAS_HIGH_HIGH", lelPct: highestLel, severity: "CRITICAL", assetId: this.state.id }
      });
      // Executive trip ESD
      context.emit({ type: "shutdown.command", sourceId: this.state.id, payload: { reason: "GAS_50PCT_LEL" } });
    } else if (highestLel >= 20 && this.alarmLevel === "NORMAL") {
      this.alarmLevel = "LOW_ALARM";
      this.state.metadata.alarmLevel = "LOW_ALARM";
      context.emit({
        type: "alarm.triggered",
        sourceId: this.state.id,
        payload: { alarmType: "GAS_LOW_WARNING", lelPct: highestLel, severity: "WARNING", assetId: this.state.id }
      });
    } else if (highestLel < 15 && this.alarmLevel !== "NORMAL") {
      this.alarmLevel = "NORMAL";
      this.state.metadata.alarmLevel = "NORMAL";
    }
  }

  clone(): Twin {
    const x = new GasDetectorTwin(this.state.id, this.state.position, this.chemical);
    x.currentLel = this.currentLel;
    x.alarmLevel = this.alarmLevel;
    Object.assign(x.state, cloneState(this.state));
    return x;
  }
}

/**
 * Optical Multi-Spectrum UV/IR Flame Detector Twin.
 * Line-of-sight optical detection for instantaneous fire sensing.
 */
export class FlameDetectorTwin extends BaseTwin {
  public flameDetected = false;

  constructor(id: string, position: Vec3, public fovDegrees = 120, public rangeM = 35) {
    super(
      state(id, "flame-detector", position, {
        flameDetected: false,
        fovDegrees,
        rangeM,
        opticalHealth: 1.0
      }),
      meta(["flame-detection-v1"])
    );
  }

  onEvent(_event: SimEvent): void {}

  tick(_dt: number, context: TwinContext): void {
    let fireInSight = false;
    for (const twin of context.twins()) {
      if (twin.state.kind === "fire" && twin.state.active) {
        const dist = Math.hypot(
          this.state.position.x - twin.state.position.x,
          this.state.position.y - twin.state.position.y,
          this.state.position.z - twin.state.position.z
        );
        if (dist <= this.rangeM) {
          fireInSight = true;
          break;
        }
      }
    }

    if (fireInSight && !this.flameDetected) {
      this.flameDetected = true;
      this.state.metadata.flameDetected = true;
      context.emit({
        type: "alarm.triggered",
        sourceId: this.state.id,
        payload: { alarmType: "OPTICAL_FLAME_CONFIRMED", severity: "CRITICAL", detectorId: this.state.id }
      });
    } else if (!fireInSight && this.flameDetected) {
      this.flameDetected = false;
      this.state.metadata.flameDetected = false;
    }
  }

  clone(): Twin {
    const x = new FlameDetectorTwin(this.state.id, this.state.position, this.fovDegrees, this.rangeM);
    x.flameDetected = this.flameDetected;
    Object.assign(x.state, cloneState(this.state));
    return x;
  }
}

/**
 * Industrial Flare Stack & Emergency Relief System Twin.
 * Incinerates emergency blowdown hydrocarbons to depressurize process units.
 */
export class FlareStackTwin extends BaseTwin {
  public flaringMw = 0.5; // Pilot flame base
  constructor(id: string, position: Vec3) {
    super(
      state(id, "flare-stack", position, {
        heightM: 45,
        tipFlameIntensityMw: 0.5,
        purgeGasActive: true,
        smokelessSteamRateKgH: 1200
      }),
      meta(["flare-relief-v1"])
    );
  }

  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.type === "blowdown.command") {
      this.flaringMw = 18.0;
      this.state.metadata.tipFlameIntensityMw = 18.0;
      this.state.metadata.status = "FULL_EMERGENCY_DEPRESSURIZING";
      context.emit({
        type: "fire.created",
        sourceId: this.state.id,
        payload: { origin: { x: this.state.position.x, y: this.state.position.y + 45, z: this.state.position.z }, intensityMw: 18.0 }
      });
    }
  }

  tick(): void {}
  clone(): Twin {
    const x = new FlareStackTwin(this.state.id, this.state.position);
    x.flaringMw = this.flaringMw;
    Object.assign(x.state, cloneState(this.state));
    return x;
  }
}

/**
 * Secondary Containment Dike / Bund Wall Twin.
 * Encloses hazardous tank farms, retains liquid releases, and bounds pool fire footprints.
 */
export class BundWallTwin extends BaseTwin {
  public liquidContainedM3 = 0;
  public capacityM3 = 1200;
  constructor(id: string, position: Vec3, public enclosedTanks: string[]) {
    super(
      state(id, "bund-wall", position, {
        capacityM3: 1200,
        liquidContainedM3: 0,
        heightM: 1.8,
        wallIntegrity: 1.0,
        overflow: false
      }),
      meta(["bund-containment-v1"])
    );
  }

  onEvent(event: SimEvent, _context: TwinContext): void {
    if (event.type === "release.created" && this.enclosedTanks.includes(String(event.sourceId))) {
      const addedVolume = Number(event.payload.rateKgS ?? 1) * 0.002;
      this.liquidContainedM3 += addedVolume;
      this.state.metadata.liquidContainedM3 = Math.min(this.capacityM3, this.liquidContainedM3);
      if (this.liquidContainedM3 >= this.capacityM3) {
        this.state.metadata.overflow = true;
      }
    }
  }

  tick(): void {}
  clone(): Twin {
    const x = new BundWallTwin(this.state.id, this.state.position, [...this.enclosedTanks]);
    x.liquidContainedM3 = this.liquidContainedM3;
    Object.assign(x.state, cloneState(this.state));
    return x;
  }
}

/**
 * Safe Evacuation Muster Station Twin.
 * Tracks accounted personnel and evacuation status.
 */
export class MusterStationTwin extends StaticTwin {
  public musteredCount = 0;
  constructor(id: string, position: Vec3, public musterZoneName = "MUSTER POINT ALPHA") {
    super(
      state(id, "muster-station", position, {
        zoneName: musterZoneName,
        musteredCount: 0,
        safeStatus: "SECURE",
        radiantLoadKwM2: 0.1
      }),
      meta(["muster-station-v1"])
    );
  }

  onEvent(event: SimEvent): void {
    if (event.type === "evacuation.command") {
      this.musteredCount += 1;
      this.state.metadata.musteredCount = this.musteredCount;
    }
  }

  clone(): Twin {
    const x = new MusterStationTwin(this.state.id, this.state.position, this.musterZoneName);
    x.musteredCount = this.musteredCount;
    Object.assign(x.state, cloneState(this.state));
    return x;
  }
}

/**
 * Plant-Wide Emergency Alarm Siren Twin.
 */
export class AlarmSirenTwin extends StaticTwin {
  public sounding = false;
  constructor(id: string, position: Vec3) {
    super(state(id, "siren", position, { sounding: false, dbRating: 135 }), meta(["alarm-siren-v1"]));
  }

  onEvent(event: SimEvent): void {
    if (event.type === "alarm.triggered" || event.type === "shutdown.command" || event.type === "evacuation.command") {
      this.sounding = true;
      this.state.metadata.sounding = true;
    }
  }

  clone(): Twin {
    const x = new AlarmSirenTwin(this.state.id, this.state.position);
    x.sounding = this.sounding;
    Object.assign(x.state, cloneState(this.state));
    return x;
  }
}

/**
 * Emergency Standby Power Diesel Generator Twin.
 */
export class GeneratorTwin extends BaseTwin {
  public generating = true;
  constructor(id: string, position: Vec3) {
    super(state(id, "generator", position, { generating: true, loadKw: 750, fuelHours: 48 }), meta(["generator-v1"]));
  }

  onEvent(event: SimEvent): void {
    if (event.type === "power.loss") {
      this.state.metadata.status = "AUTO_START_CRITICAL_POWER";
      this.generating = true;
    }
  }

  tick(): void {}
  clone(): Twin {
    const x = new GeneratorTwin(this.state.id, this.state.position);
    x.generating = this.generating;
    Object.assign(x.state, cloneState(this.state));
    return x;
  }
}
