import test from "node:test";
import assert from "node:assert/strict";
import { SimulationRuntime } from "../src/core/runtime.js";
import { injectFailures } from "../src/core/failures.js";
import { PipeTwin, TankTwin } from "../src/twins/process.js";

test("failure batches validate atomically", () => {
  const runtime = new SimulationRuntime([new PipeTwin("p-1", { x: 0, y: 0, z: 0 }), new TankTwin("t-1", { x: 2, y: 0, z: 0 })]);
  assert.throws(() => injectFailures(runtime, [
    { twinId: "p-1", mode: "rupture", severity: 0.8 },
    { twinId: "missing", mode: "rupture", severity: 0.8 },
  ]), /Unknown twin/);
  runtime.step(0.05);
  assert.equal(runtime.snapshot().events.length, 0);
});

test("source inventory is finite and exposed in state", () => {
  const pipe = new PipeTwin("p-2", { x: 0, y: 0, z: 0 });
  const runtime = new SimulationRuntime([pipe]);
  injectFailures(runtime, [{ twinId: "p-2", mode: "rupture", severity: 1 }]);
  runtime.run(2, 0.05);
  assert.ok(pipe.inventoryKg >= 0);
  assert.equal(pipe.state.metadata.inventoryKg, pipe.inventoryKg);
});
