export interface ModelProvenance {
  id: string;
  version: string;
  description: string;
  assumptions: string[];
  references: string[];
}

export interface ReleaseModelInput {
  leakAreaMm2: number;
  upstreamPressureBar: number;
  temperatureK: number;
  dischargeCoefficient?: number;
}

export interface DispersionModelInput {
  rateKgS: number;
  ageS: number;
  windX: number;
  windZ: number;
  stability: "A" | "B" | "C" | "D" | "E" | "F";
}

export interface ThermalModelInput {
  fireIntensityMw: number;
  distanceM: number;
}

export interface VesselModelInput {
  pressureBar: number;
  maxPressureBar: number;
  temperatureK: number;
  integrity: number;
  thermalDose: number;
}

export interface StructuralModelInput {
  integrity: number;
  heatFluxKwM2: number;
  overpressureKpa?: number;
}

export const MODEL_PROVENANCE: Record<string, ModelProvenance> = {
  "release-orifice-v1": {
    id: "release-orifice-v1", version: "1.0.0",
    description: "Reduced-order pressurized release model using an effective orifice and discharge coefficient.",
    assumptions: ["Single-phase release", "Quasi-steady upstream conditions", "Effective orifice captures leak geometry"],
    references: ["API 520/521 family concepts; validate against facility-specific release data before operational use"]
  },
  "plume-gaussian-v1": {
    id: "plume-gaussian-v1", version: "1.0.0",
    description: "Fast Gaussian-style plume footprint used for interactive threat-zone estimation.",
    assumptions: ["Steady wind over a short horizon", "Uniform terrain", "Reduced-order atmospheric stability classes"],
    references: ["Gaussian plume dispersion framework; calibrate against site and substance-specific dispersion data"]
  },
  "thermal-point-source-v1": {
    id: "thermal-point-source-v1", version: "1.0.0",
    description: "Reduced-order thermal exposure model for fast interactive consequence evaluation.",
    assumptions: ["Isotropic effective source", "Distance dominates attenuation", "Atmospheric losses absorbed into effective intensity"],
    references: ["Radiative heat-transfer reduced-order model; validate against fire-specific measurements"]
  },
  "vessel-degradation-v1": {
    id: "vessel-degradation-v1", version: "1.0.0",
    description: "State-transition model combining pressure, temperature and cumulative thermal dose into a screening risk score.",
    assumptions: ["Screening-level vessel response", "Monotonic degradation", "Thresholds require asset-specific calibration"],
    references: ["Use facility pressure-vessel design data and validated engineering analysis for deployment"]
  },
  "structural-screen-v1": {
    id: "structural-screen-v1", version: "1.0.0",
    description: "Screening model for heat and overpressure damage progression in structural elements.",
    assumptions: ["Generic structural member", "No full finite-element analysis", "Thresholds are scenario parameters"],
    references: ["Structural fire/blast response should be calibrated to the facility's engineering design"]
  }
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function estimateReleaseKgS(input: ReleaseModelInput): number {
  const areaM2 = Math.max(1e-8, input.leakAreaMm2 * 1e-6);
  const pressurePa = Math.max(0, input.upstreamPressureBar) * 100_000;
  const temperatureFactor = Math.sqrt(303 / Math.max(200, input.temperatureK));
  const cd = input.dischargeCoefficient ?? 0.62;
  const rhoRef = 1.8;
  return Math.max(0, cd * areaM2 * Math.sqrt(2 * pressurePa * rhoRef) * temperatureFactor);
}

export function estimatePlume(input: DispersionModelInput) {
  const stabilitySpread: Record<DispersionModelInput["stability"], number> = { A: 1.35, B: 1.2, C: 1.05, D: 0.9, E: 0.78, F: 0.68 };
  const windSpeed = Math.hypot(input.windX, input.windZ);
  const travel = windSpeed * input.ageS;
  const spread = Math.max(0.5, Math.sqrt(Math.max(0, input.rateKgS)) * (1 + input.ageS * 0.08) * stabilitySpread[input.stability]);
  return {
    centerX: input.windX === 0 ? 0 : (input.windX / Math.max(1e-6, windSpeed)) * travel,
    centerZ: input.windZ === 0 ? 0 : (input.windZ / Math.max(1e-6, windSpeed)) * travel,
    spreadM: spread,
    radiusM: spread * 1.6 + input.rateKgS * 0.7,
    windSpeedMS: windSpeed
  };
}

export function estimateThermalFluxKwM2(input: ThermalModelInput): number {
  const distance = Math.max(1, input.distanceM);
  return Math.max(0, Math.min(120, (input.fireIntensityMw * 1000) / (4 * Math.PI * distance * distance)));
}

export function updateVesselRisk(input: VesselModelInput) {
  const pressureRatio = input.pressureBar / Math.max(1e-6, input.maxPressureBar);
  const tempRatio = Math.max(0, input.temperatureK - 303) / 220;
  const doseRatio = input.thermalDose / 10000;
  const risk = clamp01(0.45 * pressureRatio + 0.30 * tempRatio + 0.25 * doseRatio + (1 - input.integrity) * 0.35);
  const failureThreshold = pressureRatio >= 1 || risk >= 0.85 || input.integrity <= 0.35;
  return { risk, failureThreshold };
}

export function updateStructuralDamage(input: StructuralModelInput) {
  const thermalContribution = Math.max(0, input.heatFluxKwM2) * 0.00003;
  const pressureContribution = Math.max(0, input.overpressureKpa ?? 0) * 0.00008;
  const nextIntegrity = clamp01(input.integrity - thermalContribution - pressureContribution);
  const damageState = nextIntegrity <= 0.25 ? "failed" : nextIntegrity <= 0.55 ? "severe" : nextIntegrity <= 0.8 ? "damaged" : "normal";
  return { integrity: nextIntegrity, damageState };
}
