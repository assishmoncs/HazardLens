import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estimateReleaseKgS, estimatePlume, estimateThermalFluxKwM2, updateVesselRisk, updateStructuralDamage } from '../src/models/consequences.js';
import { CHEMICAL_DATABASE } from '../src/models/substances.js';

describe('DER-02 Consequence Models', () => {
  it('loads hazardous substance library', () => {
    assert.ok(CHEMICAL_DATABASE.propane);
    assert.ok(CHEMICAL_DATABASE.ammonia);
    assert.equal(CHEMICAL_DATABASE.propane.lowerExplosiveLimitPct, 2.1);
  });

  it('calculates pressurized orifice release rate', () => {
    const rate = estimateReleaseKgS({
      leakAreaMm2: 25,
      upstreamPressureBar: 10,
      temperatureK: 300,
      dischargeCoefficient: 0.62
    });
    assert.ok(rate > 0, 'Release rate should be strictly positive');
    assert.ok(rate < 10, 'Release rate should be reasonable');
  });

  it('estimates plume dispersion footprint with wind transport', () => {
    const plume = estimatePlume({
      rateKgS: 1.5,
      ageS: 10,
      windX: 3,
      windZ: 0,
      stability: 'D'
    });
    assert.equal(plume.centerX, 30);
    assert.ok(plume.radiusM > 0);
  });

  it('calculates point source thermal radiation attenuation', () => {
    const fluxClose = estimateThermalFluxKwM2({ fireIntensityMw: 5, distanceM: 5 });
    const fluxFar = estimateThermalFluxKwM2({ fireIntensityMw: 5, distanceM: 20 });
    assert.ok(fluxClose > fluxFar, 'Radiant heat flux must decay with distance');
  });

  it('evaluates structural degradation under thermal and blast load', () => {
    const initial = { integrity: 1.0, heatFluxKwM2: 25, overpressureKpa: 15 };
    const damage = updateStructuralDamage(initial);
    assert.ok(damage.integrity < 1.0);
    assert.ok(['normal', 'damaged', 'severe', 'failed'].includes(damage.damageState));
  });
});
