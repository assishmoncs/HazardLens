import { CounterfactualPlan, CounterfactualResult, InterventionAction, runCounterfactuals } from "./counterfactual.js";
import { SimulationRuntime } from "./runtime.js";

export interface ResponseRecommendation {
  plan: CounterfactualPlan;
  result: CounterfactualResult;
  score: number;
  rationale: string[];
}

function action(id: string, twin: string, target?: string, extra: Partial<InterventionAction> = {}): InterventionAction {
  if (extra.type === "suppress") return { type: "suppress", twinId: twin, targetFireId: target ?? twin, strength: 10 };
  if (extra.type === "cool") return { type: "cool", twinId: twin, targetId: target ?? twin, rateKw: 400 };
  if (extra.type === "isolate") return { type: "isolate", twinId: twin, targetPipeId: target };
  return { type: "shutdown", twinId: twin, targets: target ? [target] : [] };
}

/** Deterministic decision-support layer: generate plausible response plans and rank them using the simulator. */
export function generateResponsePlans(runtime: SimulationRuntime): CounterfactualPlan[] {
  const twins = runtime.snapshot().twins;
  const pipe = twins.find(t => t.kind === "pipe" && t.active)?.id;
  const fire = twins.find(t => t.kind === "fire" && t.active)?.id;
  const tank = twins.find(t => t.kind === "tank" && t.active)?.id;
  const plans: CounterfactualPlan[] = [{ id: "none", label: "No intervention", actions: [] }];
  if (pipe) plans.push({ id: "isolate-source", label: "Isolate source", actions: [action("iso", "ISO", pipe, { type: "isolate" })] });
  if (fire) plans.push({ id: "suppress-fire", label: "Suppress active fire", actions: [action("sup", "SUP", fire, { type: "suppress" })] });
  if (tank && fire) plans.push({ id: "cool-suppress", label: "Cool exposed tank + suppress fire", actions: [
    action("cool", "COOL", tank, { type: "cool" }),
    action("sup", "SUP", fire, { type: "suppress" })
  ] });
  return plans;
}

export function adviseResponse(runtime: SimulationRuntime, duration = 5, dt = 0.25): ResponseRecommendation[] {
  const results = runCounterfactuals(runtime, generateResponsePlans(runtime), duration, dt);
  return results.map((result, index) => ({
    plan: result.plan,
    result,
    score: Math.max(0, Math.min(100, 100 - result.metrics.riskScore)),
    rationale: [
      `${result.metrics.activeFireCount} active fires`,
      `${result.metrics.failedAssetCount} failed assets`,
      `${result.metrics.blockedRouteCount} blocked routes`,
      `risk score ${result.metrics.riskScore.toFixed(1)}`,
      index === 0 ? "lowest simulated risk" : "higher simulated risk than the leading plan"
    ]
  }));
}
