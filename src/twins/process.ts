import { SimEvent, Twin, TwinContext, TwinState, Vec3 } from "../core/types.js";
import { BaseTwin } from "./base.js";
import { estimateReleaseKgS, updateStructuralDamage, updateVesselRisk, calculateBleveOutcome } from "../models/consequences.js";
import { CHEMICAL_DATABASE } from "../models/substances.js";

const cloneState = (s: TwinState): TwinState => structuredClone(s);
const physical = (material: string, properties: Record<string, string | number | boolean>) => ({
  physicalProfile: { material, properties }, relationships: [], history: []
});
const modelMeta = (modelIds: string[]) => ({ relationships: [], history: [], modelIds });

export class WeatherTwin extends BaseTwin {
  constructor(id: string, public windX = 2, public windZ = 0) {
    super({ id, kind: "weather", position: { x: 0, y: 0, z: 0 }, fidelity: 1, active: true, integrity: 1, temperatureK: 303,
      metadata: { windX, windZ, stability: "D" } }, { ...physical("atmosphere", { windX, windZ, stability: "D" }), ...modelMeta(["plume-gaussian-v1"]) });
  }
  onEvent(_event: SimEvent, _context: TwinContext): void {}
  tick(): void {}
  clone(): Twin { const c = new WeatherTwin(this.state.id, this.windX, this.windZ); Object.assign(c.state, cloneState(this.state)); return c; }
}

export class PipeTwin extends BaseTwin {
  leakRateKgS = 0;
  failed = false;
  inventoryKg = 5000;
  constructor(id: string, position: TwinState["position"], public chemical = "propane") {
    super({ id, kind: "pipe", position, fidelity: 1, active: true, integrity: 1, temperatureK: 303,
      metadata: { chemical, upstreamPressureBar: 8, leakAreaMm2: 12, dischargeCoefficient: .62, isolationFactor: 1, inventoryKg: 5000 } },
      { ...physical("steel", { chemical, upstreamPressureBar: 8, leakAreaMm2: 12, inventoryKg: 5000 }), ...modelMeta(["release-orifice-v1", "structural-screen-v1"]) });
  }
  withdrawFuel(requestedKg: number): number {
    if (!Number.isFinite(requestedKg) || requestedKg <= 0) return 0;
    const amount = Math.min(this.inventoryKg, requestedKg);
    this.inventoryKg -= amount;
    this.state.metadata.inventoryKg = this.inventoryKg;
    return amount;
  }
  onEvent(event: SimEvent, context: TwinContext): void {
    this.record(event, `processed ${event.type}`);
    if (event.type === "fault.pipe_leak" && event.targetId === this.state.id) {
      const rate = event.payload.rateKgS == null ? estimateReleaseKgS({
        leakAreaMm2: Number(event.payload.leakAreaMm2 ?? this.state.metadata.leakAreaMm2 ?? 12),
        upstreamPressureBar: Number(event.payload.upstreamPressureBar ?? this.state.metadata.upstreamPressureBar ?? 8),
        temperatureK: this.state.temperatureK, dischargeCoefficient: Number(this.state.metadata.dischargeCoefficient ?? .62)
      }) : Number(event.payload.rateKgS);
      this.release(context, rate);
    }
    if (event.type === "thermal.exposure" && event.targetId === this.state.id) {
      const flux = Number(event.payload.heatFluxKwM2 ?? 0), seconds = Number(event.payload.exposureSeconds ?? event.payload.durationS ?? .25);
      this.state.temperatureK += flux * .025 * seconds;
      this.state.integrity = Math.max(0, this.state.integrity - flux * .00045 * seconds);
      this.state.metadata.damageState = updateStructuralDamage({ integrity: this.state.integrity, heatFluxKwM2: flux }).damageState;
      if (!this.failed && (this.state.integrity <= .55 || this.state.temperatureK >= 390)) {
        this.failed = true;
        context.emit({ type: "asset.failed", sourceId: this.state.id, payload: { kind: "pipe", mode: "thermal-rupture", model: "structural-screen-v1" }, causedBy: event.id });
        this.release(context, Math.max(.8, this.leakRateKgS * 2.5));
      }
    }
    if (event.type === "valve.command" && event.payload.pipeId === this.state.id && event.payload.closed === true) {
      this.leakRateKgS = 0;
      this.state.metadata.isolationFactor = .08;
      this.state.metadata.isolated = true;
    }
    if (event.type === "shutdown.command" && (!event.targetId || event.targetId === this.state.id)) {
      this.leakRateKgS = 0;
      this.state.metadata.isolationFactor = .05;
      this.state.metadata.shutdown = true;
    }
  }
  private release(context: TwinContext, rate: number) {
    if (!Number.isFinite(rate) || rate <= 0 || this.inventoryKg <= 0 || Number(this.state.metadata.isolationFactor ?? 1) <= 0) return;
    this.leakRateKgS = Math.max(this.leakRateKgS, rate);
    this.state.integrity = Math.max(0, this.state.integrity - .15);
    context.emit({ type: "release.created", sourceId: this.state.id,
      payload: { chemical: this.chemical, rateKgS: this.leakRateKgS * Number(this.state.metadata.isolationFactor ?? 1), origin: { ...this.state.position }, model: "release-orifice-v1" } });
  }
  tick(): void {}
  clone(): Twin { const c = new PipeTwin(this.state.id, { ...this.state.position }, this.chemical); c.leakRateKgS = this.leakRateKgS; c.failed = this.failed; c.inventoryKg = this.inventoryKg; Object.assign(c.state, cloneState(this.state)); return c; }
}

export class IgnitionSourceTwin extends BaseTwin {
  constructor(id: string, position: TwinState["position"], public enabled = true) {
    super({ id, kind: "ignition", position, fidelity: 1, active: true, integrity: 1, temperatureK: 650, metadata: { enabled } },
      { ...physical("ignition-source", { enabled }), ...modelMeta(["ignition-screen-v1"]) });
  }
  onEvent(_event: SimEvent, _context: TwinContext): void {}
  tick(): void {}
  clone(): Twin { const c = new IgnitionSourceTwin(this.state.id, { ...this.state.position }, this.enabled); Object.assign(c.state, cloneState(this.state)); return c; }
}

export class TankTwin extends BaseTwin {
  heatDose = 0;
  failed = false;
  inventoryKg = 5000;
  constructor(id: string, position: TwinState["position"], public chemical = "propane") {
    super({ id, kind: "tank", position, fidelity: 1, active: true, integrity: 1, temperatureK: 303,
      metadata: { chemical, failureRisk: 0, pressureBar: 12, maxPressureBar: 24, thermalDose: 0, coolingRateKw: 0, inventoryKg: 5000 } },
      { ...physical("steel", { chemical, capacity: 5000, inventoryKg: 5000 }), ...modelMeta(["vessel-degradation-v1", "thermal-point-source-v1"]) });
  }
  withdrawFuel(requestedKg: number): number {
    if (!Number.isFinite(requestedKg) || requestedKg <= 0) return 0;
    const amount = Math.min(this.inventoryKg, requestedKg);
    this.inventoryKg -= amount;
    this.state.metadata.inventoryKg = this.inventoryKg;
    return amount;
  }
  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.targetId !== this.state.id) return;
    if (event.type === "cooling.command" || event.type === "deluge.activated") {
      const rate = Math.max(0, Number(event.payload.rateKw ?? 450));
      this.state.metadata.coolingRateKw = Math.max(Number(this.state.metadata.coolingRateKw ?? 0), rate);
      this.record(event, "deluge/cooling active on tank");
      return;
    }
    if (event.type !== "thermal.exposure" || this.failed) return;
    this.record(event, "thermal exposure received");
    const flux = Math.max(0, Number(event.payload.heatFluxKwM2 ?? 0));
    const seconds = Number(event.payload.exposureSeconds ?? event.payload.durationS ?? .25);
    const cooling = Number(this.state.metadata.coolingRateKw ?? 0), netFlux = Math.max(0, flux - cooling * 0.05);
    this.heatDose += netFlux * seconds;
    this.state.temperatureK = Math.max(303, this.state.temperatureK + netFlux * .018 * seconds);
    const pressureBar = Number(this.state.metadata.pressureBar ?? 12) + netFlux * .0015 * seconds;
    this.state.metadata.pressureBar = pressureBar;
    this.state.metadata.thermalDose = this.heatDose;
    this.state.integrity = Math.max(0, this.state.integrity - netFlux * .00008 * seconds);
    const risk = updateVesselRisk({ pressureBar, maxPressureBar: Number(this.state.metadata.maxPressureBar ?? 24), temperatureK: this.state.temperatureK, integrity: this.state.integrity, thermalDose: this.heatDose });
    this.state.metadata.failureRisk = risk.risk;
    if (risk.failureThreshold || this.heatDose >= 300 || this.state.integrity <= .35) {
      this.failed = true; this.state.active = false; this.state.integrity = 0;
      context.emit({ type: "asset.failed", sourceId: this.state.id, payload: { kind: "tank", mode: "thermal-rupture", heatDose: this.heatDose, model: "vessel-degradation-v1" }, causedBy: event.id });
      context.emit({ type: "release.created", sourceId: this.state.id, payload: { chemical: this.chemical, rateKgS: 2.4, origin: { ...this.state.position }, model: "release-orifice-v1" }, causedBy: event.id });
      context.emit({ type: "fire.created", sourceId: this.state.id, payload: { origin: { ...this.state.position }, intensityMw: 7 }, causedBy: event.id });
    }
  }
  tick(): void {}
  clone(): Twin { const c = new TankTwin(this.state.id, { ...this.state.position }, this.chemical); c.heatDose = this.heatDose; c.failed = this.failed; c.inventoryKg = this.inventoryKg; Object.assign(c.state, cloneState(this.state)); return c; }
}

/**
 * High-Pressure Horton Sphere Storage Twin.
 * Dedicated pressurized liquefied gas asset with severe BLEVE potential when unwetted plate overheats.
 */
export class SphereTankTwin extends BaseTwin {
  heatDose = 0;
  failed = false;
  inventoryKg = 15000;
  pressureBar = 16;
  maxPressureBar = 28;
  prvOpening = false;

  constructor(id: string, position: Vec3, public chemical = "propane") {
    super(
      {
        id, kind: "sphere-tank", position: { ...position }, fidelity: 2, active: true, integrity: 1, temperatureK: 300,
        metadata: {
          chemical,
          inventoryKg: 15000,
          capacityKg: 20000,
          pressureBar: 16,
          maxPressureBar: 28,
          prvLiftPressureBar: 22,
          thermalDose: 0,
          delugeActive: false,
          bleveRisk: 0,
          pAndIdTag: `V-SPHERE-${id}`
        }
      },
      {
        ...physical("high-strength-steel", { chemical, capacityKg: 20000, wallThicknessMm: 38 }),
        ...modelMeta(["vessel-degradation-v1", "bleve-fireball-v1", "der02-threat-zones-v2"])
      }
    );
  }

  withdrawFuel(requestedKg: number): number {
    const amount = Math.min(this.inventoryKg, Math.max(0, requestedKg));
    this.inventoryKg -= amount;
    this.state.metadata.inventoryKg = this.inventoryKg;
    return amount;
  }

  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.targetId !== this.state.id && !event.targetId?.includes(this.state.id)) return;

    if (event.type === "deluge.activated" || event.type === "cooling.command") {
      this.state.metadata.delugeActive = true;
      this.record(event, "emergency deluge water spray active (NFPA 15 rate: 10.2 L/min/m2)");
      return;
    }

    if (event.type === "blowdown.command") {
      this.pressureBar = Math.max(1, this.pressureBar - 4);
      this.state.metadata.pressureBar = this.pressureBar;
      this.record(event, "depressurization to flare executed");
      return;
    }

    if (event.type === "thermal.exposure" && !this.failed) {
      const incidentFlux = Number(event.payload.heatFluxKwM2 ?? 0);
      const seconds = Number(event.payload.exposureSeconds ?? event.payload.durationS ?? 0.25);
      const delugeAttenuation = this.state.metadata.delugeActive ? 0.22 : 1.0;
      const effectiveFlux = incidentFlux * delugeAttenuation;

      this.heatDose += effectiveFlux * seconds;
      this.state.temperatureK += effectiveFlux * 0.015 * seconds;
      this.pressureBar += effectiveFlux * 0.0035 * seconds;
      this.state.metadata.pressureBar = this.pressureBar;
      this.state.metadata.thermalDose = this.heatDose;

      // PRV (Pressure Relief Valve) lift behavior
      if (this.pressureBar >= Number(this.state.metadata.prvLiftPressureBar ?? 22)) {
        this.prvOpening = true;
        this.state.metadata.prvStatus = "RELIEVING";
        context.emit({
          type: "release.created",
          sourceId: this.state.id,
          payload: {
            chemical: this.chemical,
            rateKgS: 4.5,
            origin: { x: this.state.position.x, y: this.state.position.y + 6, z: this.state.position.z },
            model: "release-orifice-v1"
          }
        });
      }

      const risk = updateVesselRisk({
        pressureBar: this.pressureBar,
        maxPressureBar: this.maxPressureBar,
        temperatureK: this.state.temperatureK,
        integrity: this.state.integrity,
        thermalDose: this.heatDose
      });
      this.state.metadata.bleveRisk = risk.risk;

      // Unwetted steel roof rupture causing catastrophic BLEVE
      if (this.pressureBar >= this.maxPressureBar || risk.failureThreshold || this.heatDose > 550) {
        this.triggerBleve(context, event.id);
      }
    }
  }

  private triggerBleve(context: TwinContext, causingEventId: string) {
    this.failed = true;
    this.state.active = false;
    this.state.integrity = 0;
    this.state.metadata.status = "BLEVE_RUPTURED";

    const bleve = calculateBleveOutcome({ massKg: this.inventoryKg, chemicalId: this.chemical });
    this.state.metadata.bleveOutcome = JSON.stringify({
      diameterM: bleve.fireballDiameterM.toFixed(1),
      durationS: bleve.fireballDurationS.toFixed(1),
      radiantMw: bleve.totalRadiativePowerMw.toFixed(1),
      r37_5M: bleve.threatDistances.zone37_5KwM2.toFixed(1)
    });

    // Emit BLEVE consequence event
    context.emit({
      type: "bleve.occurred",
      sourceId: this.state.id,
      payload: {
        chemical: this.chemical,
        fireballDiameterM: bleve.fireballDiameterM,
        durationS: bleve.fireballDurationS,
        totalPowerMw: bleve.totalRadiativePowerMw,
        origin: { ...this.state.position },
        threatDistances: bleve.threatDistances,
        blastRadiiKpa: bleve.blastRadiiKpa
      },
      causedBy: causingEventId
    });

    // Immediate secondary fireball
    context.emit({
      type: "fire.created",
      sourceId: this.state.id,
      payload: { origin: { ...this.state.position }, intensityMw: bleve.totalRadiativePowerMw, isBleveFireball: true },
      causedBy: causingEventId
    });

    // Intense blast wave
    context.emit({
      type: "overpressure.received",
      sourceId: this.state.id,
      payload: { overpressureKpa: 120, damageClass: "severe", model: "cascade-consequence-v1" },
      causedBy: causingEventId
    });
  }

  tick(): void {}
  clone(): Twin {
    const c = new SphereTankTwin(this.state.id, { ...this.state.position }, this.chemical);
    c.heatDose = this.heatDose;
    c.failed = this.failed;
    c.inventoryKg = this.inventoryKg;
    c.pressureBar = this.pressureBar;
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

/**
 * Distillation Column / Fractionation Tower Twin.
 * Multi-stage vertical separation tower with reboiler, overhead condenser, and tray hydrodynamics.
 */
export class DistillationColumnTwin extends BaseTwin {
  feedRateKgS = 18;
  reboilerTempK = 440;
  overheadPressureBar = 4.2;
  failed = false;

  constructor(id: string, position: Vec3, public chemical = "crude_oil") {
    super(
      {
        id, kind: "distillation-column", position: { ...position }, fidelity: 2, active: true, integrity: 1, temperatureK: 370,
        metadata: {
          chemical,
          trayCount: 42,
          reboilerDutyMw: 4.8,
          differentialPressureMbar: 220,
          floodingPercent: 68,
          overheadVented: false,
          pAndIdTag: `C-FRACT-${id}`
        }
      },
      {
        ...physical("carbon-steel", { chemical, trayCount: 42, diameterM: 3.2, heightM: 32 }),
        ...modelMeta(["vessel-degradation-v1", "structural-screen-v1"])
      }
    );
  }

  onEvent(event: SimEvent, context: TwinContext): void {
    if (event.targetId !== this.state.id) return;
    this.record(event, `processed ${event.type}`);

    if (event.type === "shutdown.command") {
      this.feedRateKgS = 0;
      this.state.metadata.feedRateKgS = 0;
      this.state.metadata.status = "EMERGENCY_SHUTDOWN";
      return;
    }

    if (event.type === "thermal.exposure") {
      const flux = Number(event.payload.heatFluxKwM2 ?? 0);
      const seconds = Number(event.payload.exposureSeconds ?? event.payload.durationS ?? 0.25);
      this.state.temperatureK += flux * 0.02 * seconds;
      this.overheadPressureBar += flux * 0.005 * seconds;
      this.state.integrity = Math.max(0, this.state.integrity - flux * 0.0003 * seconds);
      this.state.metadata.overheadPressureBar = this.overheadPressureBar;

      if (!this.failed && (this.overheadPressureBar > 9.5 || this.state.integrity < 0.4)) {
        this.failed = true;
        this.state.active = false;
        context.emit({
          type: "asset.failed",
          sourceId: this.state.id,
          payload: { kind: "distillation-column", mode: "tray-collapse-and-column-rupture" },
          causedBy: event.id
        });
        context.emit({
          type: "release.created",
          sourceId: this.state.id,
          payload: {
            chemical: this.chemical,
            rateKgS: 12.0,
            origin: { x: this.state.position.x, y: this.state.position.y + 12, z: this.state.position.z },
            model: "release-orifice-v1"
          },
          causedBy: event.id
        });
      }
    }
  }

  tick(): void {}
  clone(): Twin {
    const c = new DistillationColumnTwin(this.state.id, { ...this.state.position }, this.chemical);
    c.feedRateKgS = this.feedRateKgS;
    c.overheadPressureBar = this.overheadPressureBar;
    c.failed = this.failed;
    Object.assign(c.state, cloneState(this.state));
    return c;
  }
}

export class WallTwin extends BaseTwin {
  constructor(id: string, position: TwinState["position"]) {
    super({ id, kind: "wall", position, fidelity: 0, active: true, integrity: 1, temperatureK: 303, metadata: { damageState: "normal" } },
      { ...physical("concrete", {}), ...modelMeta(["structural-screen-v1"]) });
  }
  onEvent(event: SimEvent, _context: TwinContext): void {
    if (event.type !== "thermal.exposure" || event.targetId !== this.state.id) return;
    this.record(event, "wall thermal exposure");
    const flux = Number(event.payload.heatFluxKwM2 ?? 0);
    this.state.temperatureK += flux * .01 * Number(event.payload.exposureSeconds ?? event.payload.durationS ?? .25);
    const damage = updateStructuralDamage({ integrity: this.state.integrity, heatFluxKwM2: flux });
    this.state.integrity = damage.integrity; this.state.metadata.damageState = damage.damageState;
  }
  tick(): void {}
  clone(): Twin { const c = new WallTwin(this.state.id, { ...this.state.position }); Object.assign(c.state, cloneState(this.state)); return c; }
}
