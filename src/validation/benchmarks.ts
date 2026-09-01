import { estimatePlume, estimateReleaseKgS, estimateThermalFluxKwM2, updateStructuralDamage, updateVesselRisk } from "../models/consequences.js";

export interface BenchmarkResult {
  id:string; modelId:string; metric:string; observed:number; reference:number; relativeError:number; pass:boolean; tolerance:number; referenceType:"invariant";
}
const relError=(observed:number,reference:number)=>Math.abs(observed-reference)/Math.max(1e-9,Math.abs(reference));
/** Fast model invariants. These are not empirical validation against field data. */
export function runBenchmarks():BenchmarkResult[]{
 const out:BenchmarkResult[]=[];
 const releaseLow=estimateReleaseKgS({leakAreaMm2:6,upstreamPressureBar:8,temperatureK:303,dischargeCoefficient:.62});
 const releaseHigh=estimateReleaseKgS({leakAreaMm2:12,upstreamPressureBar:16,temperatureK:303,dischargeCoefficient:.62});
 out.push({id:"REL-001",modelId:"release-orifice-v1",metric:"pressure/area monotonicity",observed:releaseHigh,reference:releaseLow,relativeError:relError(releaseHigh,releaseLow),pass:releaseHigh>releaseLow,tolerance:0,referenceType:"invariant"});
 const plumeA=estimatePlume({rateKgS:1,ageS:10,windX:3,windZ:0,stability:"D"}); const plumeB=estimatePlume({rateKgS:4,ageS:10,windX:3,windZ:0,stability:"D"});
 out.push({id:"PLUME-001",modelId:"plume-gaussian-v1",metric:"release/footprint monotonicity",observed:plumeB.radiusM,reference:plumeA.radiusM,relativeError:relError(plumeB.radiusM,plumeA.radiusM),pass:plumeB.radiusM>plumeA.radiusM,tolerance:0,referenceType:"invariant"});
 const near=estimateThermalFluxKwM2({fireIntensityMw:5,distanceM:5}); const far=estimateThermalFluxKwM2({fireIntensityMw:5,distanceM:10});
 out.push({id:"THERM-001",modelId:"thermal-point-source-v1",metric:"distance attenuation",observed:far,reference:near,relativeError:relError(far,near),pass:far<near,tolerance:0,referenceType:"invariant"});
 const low=updateVesselRisk({pressureBar:10,maxPressureBar:24,temperatureK:340,integrity:1,thermalDose:100}); const high=updateVesselRisk({pressureBar:18,maxPressureBar:24,temperatureK:430,integrity:.7,thermalDose:2500});
 out.push({id:"VESSEL-001",modelId:"vessel-degradation-v1",metric:"risk monotonicity",observed:high.risk,reference:low.risk,relativeError:relError(high.risk,low.risk),pass:high.risk>low.risk,tolerance:0,referenceType:"invariant"});
 const damage=updateStructuralDamage({integrity:1,heatFluxKwM2:100,overpressureKpa:20});
 out.push({id:"STRUCT-001",modelId:"structural-screen-v1",metric:"bounded integrity",observed:damage.integrity,reference:1,relativeError:relError(damage.integrity,1),pass:damage.integrity>=0&&damage.integrity<=1,tolerance:1,referenceType:"invariant"});
 return out;
}
export function validationSummary(){const results=runBenchmarks();return{total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,empiricalValidation:false,results};}
