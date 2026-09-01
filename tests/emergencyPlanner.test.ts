import test from 'node:test';
import assert from 'node:assert/strict';
import { EmergencyPlanner } from '../src/algorithms/emergencyPlanner.js';
import type { WorldSnapshot } from '../src/core/types.js';

const planner = new EmergencyPlanner([
  { from: 'WORKER', to: 'SAFE', type: 'walkway' },
  { from: 'WORKER', to: 'HAZARD', type: 'walkway' },
  { from: 'SAFE', to: 'MUSTER_POINT', type: 'emergency_route' },
  { from: 'HAZARD', to: 'MUSTER_POINT', type: 'walkway' }
]);

const base = (overrides: Partial<WorldSnapshot> = {}): WorldSnapshot => ({
  time: 0,
  events: [],
  twins: [
    { id: 'WORKER', kind: 'worker', position: { x: 0, y: 0, z: 0 }, fidelity: 1, active: true, integrity: 1, temperatureK: 300, metadata: { thermalDose: 0 } },
    { id: 'SAFE', kind: 'wall', position: { x: 4, y: 0, z: 0 }, fidelity: 1, active: true, integrity: 1, temperatureK: 300, metadata: {} },
    { id: 'HAZARD', kind: 'pipe', position: { x: 0, y: 0, z: 4 }, fidelity: 1, active: true, integrity: 1, temperatureK: 300, metadata: {} },
    { id: 'WEATHER', kind: 'weather', position: { x: 0, y: 0, z: 0 }, fidelity: 1, active: true, integrity: 1, temperatureK: 300, metadata: {} }
  ],
  ...overrides
});

test('risk assessment stays low for a normal world', () => {
  const result = planner.assessRisk(base());
  assert.equal(result.level, 'LOW');
  assert.ok(result.score < 25);
});

test('risk assessment increases with active fire and release', () => {
  const snapshot = base();
  snapshot.twins.push(
    { id: 'FIRE', kind: 'fire', position: { x: 0, y: 0, z: 2 }, fidelity: 2, active: true, integrity: 1, temperatureK: 1200, metadata: { intensityMw: 8 } },
    { id: 'RELEASE', kind: 'release', position: { x: 0, y: 0, z: 3 }, fidelity: 2, active: true, integrity: 1, temperatureK: 300, metadata: {} }
  );
  const result = planner.assessRisk(snapshot);
  assert.ok(result.score > 25);
  assert.ok(result.contributors.length >= 2);
});

test('Dijkstra chooses the safer route when one path is exposed to fire', () => {
  const snapshot = base();
  snapshot.twins.push({ id: 'FIRE', kind: 'fire', position: { x: 0, y: 0, z: 4 }, fidelity: 2, active: true, integrity: 1, temperatureK: 1200, metadata: { intensityMw: 8 } });
  const route = planner.safestRoute(snapshot, 'WORKER', { x: 8, y: 0, z: 0 });
  assert.ok(route);
  assert.ok(route!.path.includes('SAFE'));
  assert.ok(!route!.path.includes('HAZARD'));
});
