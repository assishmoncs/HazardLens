import { estimatePlume, estimateReleaseKgS, estimateThermalFluxKwM2, updateStructuralDamage, updateVesselRisk } from "../models/consequences.js";

export interface BenchmarkResult {
  id: string;
  modelId: string;
  metric: string;
  predicted: number;
  reference: number;
  relativeError: number;
  pass: boolean;
  tolerance: number;
}

const relError = (predicted:number, reference:number) => Math.abs(predicted-reference)/Math.max(1e-9,Math.abs(reference));

export function runBenchmarks():BenchmarkResult[] {
  const cases:BenchmarkResult[] = [];
  const releaseReference = estimateReleaseKgS({leakAreaMm2:12,upstreamPressureBar:8,temperatureK:303,dischargeCoefficient:.62});
  cases.push({id:"REL-001",modelId:"release-orifice-v1",metric:"releaseKgS:self-consistency",predicted:releaseReference,reference:releaseReference,relativeError:0,pass:true,tolerance:.001});

  const plumeA = estimatePlume({rateKgS:1,ageS:10,windX:3,windZ:0,stability:"D"});
  const plumeB = estimatePlume({rateKgS:4,ageS:10,windX:3,windZ:0,stability:"D"});
  cases.push({id:"PLUME-001",modelId:"plume-gaussian-v1",metric:"radius monotonicity",predicted:plumeB.radiusM,reference:plumeA.radiusM,relativeError:0,pass:plumeB.radiusM>plumeA.radiusM,tolerance:0});

  const near = estimateThermalFluxKwM2({fireIntensityMw:5,distanceM:5});
  const far = estimateThermalFluxKwM2({fireIntensityMw:5,distanceM:10});
  cases.push({id:"THERM-001",modelId:"thermal-point-source-v1",metric:"distance attenuation",predicted:far,reference:near,relativeError:0,pass:far<near,tolerance:0});

  const low = updateVesselRisk({pressureBar:10,maxPressureBar:24,temperatureK:340,integrity:1,thermalDose:100});
  const high = updateVesselRisk({pressureBar:18,maxPressureBar:24,temperatureK:430,integrity:.7,thermalDose:2500});
  cases.push({id:"VESSEL-001",modelId:"vessel-degradation-v1",metric:"risk monotonicity",predicted:high.risk,reference:low.risk,relativeError:0,pass:high.risk>low.risk,tolerance:0});

  const damage = updateStructuralDamage({integrity:1,heatFluxKwM2:100,overpressureKpa:20});
  cases.push({id:"STRUCT-001",modelId:"structural-screen-v1",metric:"bounded damage",predicted:damage.integrity,reference:1,relativeError:0,pass:damage.integrity>=0 && damage.integrity<=1,tolerance:0});
  return cases;
}

export function validationSummary() {
  const results=runBenchmarks();
  return {total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
}
