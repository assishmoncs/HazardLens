export interface OverpressureInput {
  fireIntensityMw: number;
  distanceM: number;
}

export interface CascadePropagation {
  overpressureKpa: number;
  damageClass: "none" | "minor" | "moderate" | "severe";
  effectiveRadiusM: number;
}

export const CASCADE_MODEL_PROVENANCE = {
  id: "cascade-consequence-v1",
  version: "1.0.0",
  description: "Reduced-order blast/overpressure screening model for event propagation to structures, routes, and people.",
  assumptions: [
    "Equivalent energy source for interactive screening",
    "Free-field attenuation approximation",
    "Does not replace validated blast engineering analysis"
  ],
  references: [
    "Use facility-specific blast consequence studies and validated engineering correlations before operational deployment"
  ]
} as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function estimateOverpressureKpa(input: OverpressureInput): number {
  const r = Math.max(1, input.distanceM);
  const equivalentEnergy = Math.max(0, input.fireIntensityMw) * 0.35;
  return Math.min(250, (equivalentEnergy * 180) / (r * r));
}

export function propagateCascade(input: OverpressureInput): CascadePropagation {
  const overpressureKpa = estimateOverpressureKpa(input);
  const normalized = clamp01(overpressureKpa / 50);
  const damageClass = normalized >= 0.8 ? "severe" : normalized >= 0.45 ? "moderate" : normalized >= 0.1 ? "minor" : "none";
  return {
    overpressureKpa,
    damageClass,
    effectiveRadiusM: Math.sqrt(Math.max(0, input.fireIntensityMw)) * 7
  };
}
