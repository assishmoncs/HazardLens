import type { SimEvent, Twin, TwinContext, TwinKind, TwinState, Vec3 } from "../core/types.js";
import { BaseTwin } from "./base.js";

const cloneState = <T>(value: T): T => structuredClone(value);

function meta(modelIds: string[], relationships: { targetId: string; type: "connected" | "nearby" | "depends_on" | "contained_by" }[] = []) {
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
  onEvent(event: SimEvent): void {
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
