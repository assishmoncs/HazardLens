import test from "node:test";
import assert from "node:assert/strict";
import { SimulationRuntime } from "../src/core/runtime.js";
import { FireTwin, ReleaseTwin } from "../src/twins/hazards.js";
import { TankTwin } from "../src/twins/process.js";
import { SuppressionTwin } from "../src/interventions/index.js";
import { adviseResponse, generateResponsePlans } from "../src/core/responseAdvisor.js";

test("response advisor generates response candidates from current world state", () => {
  const fire = new FireTwin("F1", { x: 0, y: 0, z: 0 }, 8);
  const tank = new TankTwin("T1", { x: 2, y: 0, z: 0 });
  const runtime = new SimulationRuntime([fire, tank, new SuppressionTwin("SUP", { x: 0, y: 0, z: 1 }, "F1", 10)]);
  const plans = generateResponsePlans(runtime);
  assert.deepEqual(plans.map(p => p.id), ["none", "suppress-fire", "cool-suppress"]);
});

test("response advisor ranks a suppressible fire plan ahead of no action", () => {
  const fire = new FireTwin("F1", { x: 0, y: 0, z: 0 }, 8);
  const tank = new TankTwin("T1", { x: 2, y: 0, z: 0 });
  const runtime = new SimulationRuntime([fire, tank, new SuppressionTwin("SUP", { x: 0, y: 0, z: 1 }, "F1", 10)]);
  const recommendations = adviseResponse(runtime, 2, .25);
  assert.equal(recommendations[0].plan.id, "suppress-fire");
  assert.ok(recommendations[0].result.metrics.riskScore < recommendations.find(r => r.plan.id === "none")!.result.metrics.riskScore);
  assert.ok(recommendations[0].score > 0);
});

test("advisor does not mutate the baseline world", () => {
  const fire = new FireTwin("F1", { x: 0, y: 0, z: 0 }, 8);
  const release = new ReleaseTwin("R1", { x: 0, y: 0, z: 0 }, "P1", 1);
  const runtime = new SimulationRuntime([fire, release]);
  adviseResponse(runtime, 1, .25);
  assert.equal(runtime.time, 0);
  assert.equal(runtime.get("F1")?.state.active, true);
  assert.equal(runtime.get("R1")?.state.active, true);
});
