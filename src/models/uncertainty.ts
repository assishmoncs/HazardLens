import type { ModelProvenance } from "./consequences.js";

export interface UncertaintyBand {
  estimate: number;
  lower: number;
  upper: number;
  confidence: "low" | "medium" | "high";
}

export interface ModelUncertainty {
  modelId: string;
  parameter: string;
  relativeUncertainty: number;
  reason: string;
}

const clamp = (v:number,min:number,max:number) => Math.max(min,Math.min(max,v));

export function band(estimate:number, relativeUncertainty:number, confidence:UncertaintyBand["confidence"]="medium"):UncertaintyBand {
  const spread = Math.abs(estimate) * Math.max(0,relativeUncertainty);
  return { estimate, lower: Math.min(estimate,estimate-spread), upper: Math.max(estimate,estimate+spread), confidence };
}

export function confidenceForModel(provenance:ModelProvenance, calibrationCoverage:number):UncertaintyBand["confidence"] {
  const refs = provenance.references.length;
  const coverage = clamp(calibrationCoverage,0,1);
  if (coverage >= .8 && refs >= 1) return "high";
  if (coverage >= .4 || refs >= 1) return "medium";
  return "low";
}

export const DEFAULT_MODEL_UNCERTAINTY: ModelUncertainty[] = [
  { modelId:"release-orifice-v1", parameter:"releaseRate", relativeUncertainty:.15, reason:"Reduced-order effective orifice assumptions" },
  { modelId:"plume-gaussian-v1", parameter:"hazardRadius", relativeUncertainty:.25, reason:"Atmospheric and terrain simplification" },
  { modelId:"thermal-point-source-v1", parameter:"heatFlux", relativeUncertainty:.20, reason:"Effective point-source approximation" },
  { modelId:"vessel-degradation-v1", parameter:"failureRisk", relativeUncertainty:.20, reason:"Asset-specific engineering calibration required" },
  { modelId:"structural-screen-v1", parameter:"damage", relativeUncertainty:.30, reason:"Screening-level structural model" }
];

export function applyRelativeUncertainty(value:number, relative:number):UncertaintyBand {
  return band(clamp(value,0,Number.MAX_SAFE_INTEGER),relative);
}
