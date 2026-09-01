import test from "node:test";
import assert from "node:assert/strict";
import { SimulationRuntime } from "../src/core/runtime.js";
import { runCounterfactuals } from "../src/core/counterfactual.js";
import { FireTwin } from "../src/twins/hazards.js";
import { IgnitionSourceTwin, PipeTwin, TankTwin } from "../src/twins/process.js";
import { IsolationTwin, SuppressionTwin } from "../src/interventions/index.js";

test("counterfactuals branch from the same baseline", () => {
  const pipe = new PipeTwin("P1", { x: 0, y: 0, z: 0 });
  const fire = new FireTwin("F1", { x: 0, y: 0, z: 0 }, 6);
  const tank = new TankTwin("T1", { x: 2, y: 0, z: 0 });
  const baseline = new SimulationRuntime([
    pipe,
    fire,
    tank,
    new IgnitionSourceTwin("I1", { x: 2, y: 0, z: 0 }),
    new IsolationTwin("ISO", { x: -1, y: 0, z: 0 }, "P1"),
    new SuppressionTwin("SUP", { x: 0, y: 0, z: 1 }, "F1", 10)
  ]);

  const results = runCounterfactuals(baseline, [
    { id: "none", label: "No intervention", actions: [] },
    { id: "isolate", label: "Isolate pipe", actions: [{ type: "isolate", twinId: "ISO", targetPipeId: "P1" }] },
    { id: "suppress", label: "Suppress fire", actions: [{ type: "suppress", twinId: "SUP", targetFireId: "F1", strength: 10 }] }
  ], 2, .25);

  assert.equal(results.length, 3);
  assert.equal(baseline.time, 0);
  assert.ok(results.every(result => result.snapshot.time === 2));
});

test("counterfactual ranking puts effective suppression ahead of no intervention", () => {
  const fire = new FireTwin("F1", { x: 0, y: 0, z: 0 }, 8);
  const tank = new TankTwin("T1", { x: 2, y: 0, z: 0 });
  const baseline = new SimulationRuntime([
    fire,
    tank,
    new SuppressionTwin("SUP", { x: 0, y: 0, z: 1 }, "F1", 10)
  ]);

  const results = runCounterfactuals(baseline, [
    { id: "none", label: "No intervention", actions: [] },
    { id: "suppress", label: "Suppress fire", actions: [{ type: "suppress", twinId: "SUP", targetFireId: "F1", strength: 10 }] }
  ], 2, .25);

  const noAction = results.find(r => r.plan.id === "none")!;
  const suppression = results.find(r => r.plan.id === "suppress")!;
  assert.ok(suppression.metrics.riskScore < noAction.metrics.riskScore);
  assert.equal(results[0].plan.id, "suppress");
});
