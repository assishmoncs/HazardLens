import test from "node:test";
import assert from "node:assert/strict";
import { PipeTwin, TankTwin, WallTwin } from "../src/twins/process.js";

test("twins expose metadata contracts", () => {
  const twins = [
    new PipeTwin("pipe-1", { x: 0, y: 0, z: 0 }),
    new TankTwin("tank-1", { x: 5, y: 0, z: 0 }),
    new WallTwin("wall-1", { x: 8, y: 0, z: 0 }),
  ];

  for (const twin of twins) {
    assert.ok(twin.metadata);
    assert.ok(Array.isArray(twin.metadata.relationships));
    assert.ok(Array.isArray(twin.metadata.history));
  }
});

test("twin cloning preserves upgraded metadata containers", () => {
  const tank = new TankTwin("tank-1", { x: 0, y: 0, z: 0 });
  const clone = tank.clone();

  assert.equal(clone.state.id, tank.state.id);
  assert.ok(clone.metadata);
  assert.ok(Array.isArray(clone.metadata.history));
  assert.ok(Array.isArray(clone.metadata.relationships));
});
