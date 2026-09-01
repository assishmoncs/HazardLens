import test from "node:test";
import assert from "node:assert/strict";
import { estimatePlume, estimateReleaseKgS, estimateThermalFluxKwM2, MODEL_PROVENANCE, updateStructuralDamage, updateVesselRisk } from "../src/models/consequences.js";

test("release model is monotonic with pressure and leak area",()=>{
 const base={leakAreaMm2:12,upstreamPressureBar:8,temperatureK:303};
 const low=estimateReleaseKgS({...base,upstreamPressureBar:4});
 const high=estimateReleaseKgS({...base,upstreamPressureBar:16});
 const wide=estimateReleaseKgS({...base,leakAreaMm2:24});
 assert.ok(high>low);
 assert.ok(wide>estimateReleaseKgS(base));
});

test("plume model follows wind direction and increases footprint with release",()=>{
 const p=estimatePlume({rateKgS:1,ageS:10,windX:2,windZ:0,stability:"D"});
 const q=estimatePlume({rateKgS:4,ageS:10,windX:2,windZ:0,stability:"D"});
 assert.ok(p.centerX>0&&Math.abs(p.centerZ)<1e-9);
 assert.ok(q.radiusM>p.radiusM);
});

test("thermal model decreases with distance",()=>{
 const near=estimateThermalFluxKwM2({fireIntensityMw:5,distanceM:5});
 const far=estimateThermalFluxKwM2({fireIntensityMw:5,distanceM:10});
 assert.ok(near>far);
});

test("vessel risk and structural damage are bounded and monotonic",()=>{
 const safe=updateVesselRisk({pressureBar:8,maxPressureBar:24,temperatureK:303,integrity:1,thermalDose:0});
 const stressed=updateVesselRisk({pressureBar:20,maxPressureBar:24,temperatureK:500,integrity:.7,thermalDose:5000});
 assert.ok(safe.risk<stressed.risk);
 const mild=updateStructuralDamage({integrity:1,heatFluxKwM2:100});
 const severe=updateStructuralDamage({integrity:1,heatFluxKwM2:20000,overpressureKpa:50});
 assert.ok(mild.integrity>severe.integrity);
 assert.ok(severe.integrity>=0&&severe.integrity<=1);
});

test("every Phase 2 model exposes provenance",()=>{
 for(const [id,model] of Object.entries(MODEL_PROVENANCE)){
  assert.equal(model.id,id);
  assert.ok(model.version);
  assert.ok(model.description);
  assert.ok(model.assumptions.length>0);
  assert.ok(model.references.length>0);
 }
});
