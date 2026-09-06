import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SimulationRuntime } from '../src/core/runtime.js';
import {
  DistillationColumnTwin,
  IgnitionSourceTwin,
  PipeTwin,
  SphereTankTwin,
  TankTwin,
  WallTwin,
  WeatherTwin
} from '../src/twins/process.js';
import {
  DelugeSystemTwin,
  EmergencyShutdownTwin,
  FlameDetectorTwin,
  GasDetectorTwin,
  MusterStationTwin,
  ValveTwin
} from '../src/twins/infrastructure.js';
import { calculateBleveOutcome, estimateThermalThreatZones } from '../src/models/threatZones.js';

describe('HazardLens Industrial Digital Twin & Domino Cascade', () => {
  it('simulates full pipe leak -> vapor dispersion -> ignition -> fire cascade', () => {
    const sim = new SimulationRuntime([
      new WeatherTwin('weather', 3, 0),
      new PipeTwin('P-17', { x: 0, y: 1, z: 0 }, 'propane'),
      new IgnitionSourceTwin('M-04', { x: 6, y: 1, z: 0 }),
      new TankTwin('T-04', { x: 9, y: 2, z: 0 }, 'propane')
    ]);

    // Inject initiating fault
    sim.emit({
      type: 'fault.pipe_leak',
      sourceId: 'operator',
      targetId: 'P-17',
      payload: { rateKgS: 0.8 }
    });

    // Run 10 seconds of simulation
    sim.run(10, 0.25);
    const snap = sim.snapshot();

    // Verify consequences materialized
    const release = snap.twins.find(t => t.kind === 'release');
    assert.ok(release, 'Release twin should be materialized by runtime');

    const fire = snap.twins.find(t => t.kind === 'fire');
    assert.ok(fire, 'Fire twin should be created after vapor cloud reaches ignition source');

    const tank = snap.twins.find(t => t.id === 'T-04');
    assert.ok(tank, 'Tank twin must exist');
    assert.ok(tank.temperatureK > 303, 'Tank skin temperature must elevate from thermal radiation exposure');
  });

  it('triggers gas detector alarms when flammable vapor reaches sensor', () => {
    const sim = new SimulationRuntime([
      new WeatherTwin('weather', 2, 0),
      new PipeTwin('P-17', { x: 0, y: 1, z: 0 }, 'methane'),
      new GasDetectorTwin('GD-01', { x: 4, y: 1, z: 0 }, 'methane')
    ]);

    sim.emit({
      type: 'fault.pipe_leak',
      sourceId: 'operator',
      targetId: 'P-17',
      payload: { rateKgS: 1.5 }
    });

    sim.run(6, 0.25);
    const snap = sim.snapshot();

    const gd = snap.twins.find(t => t.id === 'GD-01');
    assert.ok(gd);
    assert.ok(Number(gd.metadata.lelPct ?? 0) > 0, 'Gas detector must register combustible LEL');
  });

  it('verifies optical flame detector trips alarm upon fire formation', () => {
    const sim = new SimulationRuntime([
      new FlameDetectorTwin('FD-01', { x: 0, y: 2, z: 0 }),
      new IgnitionSourceTwin('M-01', { x: 5, y: 1, z: 0 })
    ]);

    // Manually create fire in line of sight
    sim.emit({
      type: 'fire.created',
      sourceId: 'incident',
      payload: { origin: { x: 5, y: 1, z: 0 }, intensityMw: 8 }
    });

    sim.run(1, 0.25);
    const snap = sim.snapshot();
    const fd = snap.twins.find(t => t.id === 'FD-01');
    assert.ok(fd);
    assert.equal(fd.metadata.flameDetected, true, 'Flame detector must confirm optical flame detection');
  });

  it('demonstrates NFPA 15 deluge spray protects LPG Sphere against BLEVE', () => {
    // Case A: Unprotected Sphere under severe fire exposure
    const simUnprotected = new SimulationRuntime([
      new SphereTankTwin('S-UNPROTECTED', { x: 0, y: 0, z: 0 }, 'propane')
    ]);
    simUnprotected.emit({
      type: 'thermal.exposure',
      sourceId: 'fire-01',
      targetId: 'S-UNPROTECTED',
      payload: { heatFluxKwM2: 250, exposureSeconds: 15 }
    });
    simUnprotected.run(15, 0.5);
    const snapA = simUnprotected.snapshot();
    const sphereA = snapA.twins.find(t => t.id === 'S-UNPROTECTED')!;

    // Case B: Deluge Protected Sphere under identical thermal exposure
    const simProtected = new SimulationRuntime([
      new SphereTankTwin('S-PROTECTED', { x: 0, y: 0, z: 0 }, 'propane'),
      new DelugeSystemTwin('DEL-01', { x: 0, y: 1, z: 0 }, 'S-PROTECTED')
    ]);
    // Engage deluge
    simProtected.emit({
      type: 'deluge.activated',
      sourceId: 'operator',
      targetId: 'DEL-01',
      payload: {}
    });
    simProtected.emit({
      type: 'thermal.exposure',
      sourceId: 'fire-01',
      targetId: 'S-PROTECTED',
      payload: { heatFluxKwM2: 250, exposureSeconds: 15 }
    });
    simProtected.run(15, 0.5);
    const snapB = simProtected.snapshot();
    const sphereB = snapB.twins.find(t => t.id === 'S-PROTECTED')!;

    assert.ok(
      Number(sphereB.metadata.thermalDose) < Number(sphereA.metadata.thermalDose),
      'Active deluge must significantly reduce absorbed thermal dose'
    );
    assert.ok(
      Number(sphereB.metadata.pressureBar) < Number(sphereA.metadata.pressureBar),
      'Protected sphere must exhibit lower internal pressure buildup'
    );
  });

  it('calculates physical BLEVE fireball consequences and DER-02 threat distances', () => {
    const outcome = calculateBleveOutcome({ massKg: 10000, chemicalId: 'propane' });
    assert.ok(outcome.fireballDiameterM > 100, '10,000kg LPG fireball diameter must exceed 100m');
    assert.ok(outcome.fireballDurationS > 5, 'Fireball duration must be physically reasonable');
    assert.ok(outcome.threatDistances.zone37_5KwM2 < outcome.threatDistances.zone12_5KwM2);
    assert.ok(outcome.threatDistances.zone12_5KwM2 < outcome.threatDistances.zone4_7KwM2);

    const zones = estimateThermalThreatZones(12.0, { x: 0, y: 0, z: 0 });
    assert.equal(zones.zones.length, 4);
    assert.equal(zones.zones[0].thresholdValue, 37.5);
  });

  it('verifies counterfactual simulation cloning and intervention branching', () => {
    const master = new SimulationRuntime([
      new PipeTwin('P-01', { x: 0, y: 1, z: 0 }),
      new ValveTwin('V-01', { x: 2, y: 1, z: 0 })
    ]);

    master.emit({ type: 'fault.pipe_leak', sourceId: 'operator', targetId: 'P-01', payload: { rateKgS: 1.0 } });
    master.run(2, 0.5);

    // Branch A: Do nothing
    const branchA = master.clone();
    branchA.run(5, 0.5);

    // Branch B: Close isolation valve
    const branchB = master.clone();
    branchB.emit({ type: 'valve.command', sourceId: 'operator', targetId: 'P-01', payload: { closed: true, pipeId: 'P-01' } });
    branchB.run(5, 0.5);

    const pipeA = branchA.snapshot().twins.find(t => t.id === 'P-01')!;
    const pipeB = branchB.snapshot().twins.find(t => t.id === 'P-01')!;

    assert.equal(pipeB.metadata.isolated, true);
    assert.notEqual(pipeA.metadata.isolated, true);
  });
});
