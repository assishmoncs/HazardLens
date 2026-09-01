import type { TwinState } from "./types.js";
import { SimulationRuntime } from "./runtime.js";

export type InterventionAction =
  | { type: "isolate"; twinId: string; targetPipeId?: string }
  | { type: "cool"; twinId: string; targetId: string; rateKw?: number }
  | { type: "suppress"; twinId: string; targetFireId: string; strength?: number }
  | { type: "shutdown"; twinId: string; targets: string[] }
  | { type: "evacuate"; twinId: string; zoneId?: string };

export interface CounterfactualPlan {
  id: string;
  label: string;
  actions: InterventionAction[];
}

export interface CounterfactualMetrics {
  fireCount: number;
  activeFireCount: number;
  releaseCount: number;
  failedAssetCount: number;
  criticalAssetCount: number;
  blockedRouteCount: number;
  workerExposure: number;
  hazardAreaM2: number;
  cascadeDepth: number;
  riskScore: number;
}

export interface CounterfactualResult {
  plan: CounterfactualPlan;
  snapshot: ReturnType<SimulationRuntime["snapshot"]>;
  metrics: CounterfactualMetrics;
}

function emitAction(runtime: SimulationRuntime, action: InterventionAction) {
  switch (action.type) {
    case "isolate":
      runtime.emit({
        type: "shutdown.command",
        sourceId: action.twinId,
        targetId: action.twinId,
        payload: { targetId: action.targetPipeId ?? action.twinId }
      });
      break;
    case "cool":
      runtime.emit({
        type: "cooling.command",
        sourceId: action.twinId,
        targetId: action.twinId,
        payload: { targetId: action.targetId, rateKw: action.rateKw ?? 250, enabled: true }
      });
      break;
    case "suppress":
      runtime.emit({
        type: "suppression.command",
        sourceId: action.twinId,
        targetId: action.twinId,
        payload: { targetFireId: action.targetFireId, strength: action.strength ?? 1 }
      });
      break;
    case "shutdown":
      runtime.emit({
        type: "shutdown.command",
        sourceId: action.twinId,
        targetId: action.twinId,
        payload: { targets: action.targets, action: "stop" }
      });
      break;
    case "evacuate":
      runtime.emit({
        type: "evacuation.command",
        sourceId: action.twinId,
        targetId: action.twinId,
        payload: { zoneId: action.zoneId ?? "zone-a" }
      });
      break;
  }
}

function getNumber(state: TwinState, key: string): number {
  const value = state.metadata[key];
  return typeof value === "number" ? value : 0;
}

export function measureCounterfactual(snapshot: ReturnType<SimulationRuntime["snapshot"]>): CounterfactualMetrics {
  const fireStates = snapshot.twins.filter(t => t.kind === "fire");
  const releases = snapshot.twins.filter(t => t.kind === "release");
  const failed = snapshot.twins.filter(t => !t.active || t.integrity <= 0.01);
  const critical = snapshot.twins.filter(t => getNumber(t, "failureRisk") >= 0.7 || getNumber(t, "risk") >= 0.7);
  const blockedRoutes = snapshot.twins.filter(t => t.kind === "route" && t.metadata.open === false);
  const workerExposure = snapshot.twins
    .filter(t => t.kind === "worker")
    .reduce((sum, t) => sum + getNumber(t, "exposure"), 0);
  const hazardAreaM2 = releases.reduce((sum, t) => {
    const radius = getNumber(t, "radiusM");
    return sum + Math.PI * radius * radius;
  }, 0);
  const fireDepth = fireStates.reduce((max, fire) => Math.max(max, getNumber(fire, "cascadeDepth")), 0);
  const cascadeEvents = snapshot.events.filter(e => e.type === "asset.failed" || e.type === "release.created" || e.type === "fire.created");
  const cascadeDepth = Math.max(fireDepth, Math.min(10, cascadeEvents.length));
  const riskScore =
    fireStates.length * 18 +
    releases.length * 12 +
    failed.length * 20 +
    critical.length * 8 +
    blockedRoutes.length * 8 +
    workerExposure * 0.1 +
    hazardAreaM2 * 0.02 +
    cascadeDepth * 4;

  return {
    fireCount: fireStates.length,
    activeFireCount: fireStates.filter(t => t.active).length,
    releaseCount: releases.length,
    failedAssetCount: failed.length,
    criticalAssetCount: critical.length,
    blockedRouteCount: blockedRoutes.length,
    workerExposure,
    hazardAreaM2,
    cascadeDepth,
    riskScore
  };
}

export function runCounterfactuals(
  baseline: SimulationRuntime,
  plans: CounterfactualPlan[],
  duration: number,
  dt = 0.25
): CounterfactualResult[] {
  return plans.map(plan => {
    const branch = baseline.clone();
    for (const action of plan.actions) emitAction(branch, action);
    branch.run(duration, dt);
    const snapshot = branch.snapshot();
    return { plan, snapshot, metrics: measureCounterfactual(snapshot) };
  }).sort((a, b) => a.metrics.riskScore - b.metrics.riskScore);
}
