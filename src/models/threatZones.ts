import { CHEMICAL_DATABASE, ChemicalSubstance } from './substances.js';

export interface ThreatZoneResult {
  hazardType: 'thermal' | 'toxic' | 'overpressure' | 'bleve';
  center: { x: number; y: number; z: number };
  zones: {
    label: string;
    level: string;
    thresholdValue: number;
    unit: string;
    radiusM: number;
    colorHex: string;
    description: string;
  }[];
}

export interface BleveCalculationInput {
  massKg: number;
  chemicalId: string;
  liquidFraction?: number;
}

export interface BleveOutcome {
  fireballDiameterM: number;
  fireballDurationS: number;
  centerHeightM: number;
  surfaceEmissivePowerKwM2: number;
  totalRadiativePowerMw: number;
  threatDistances: {
    zone37_5KwM2: number; // Lethal in seconds, asset destruction
    zone12_5KwM2: number; // 1% lethality, 1st degree burns in 10s
    zone4_7KwM2: number;  // Injury threshold / escape limit in 30s
    zone1_6KwM2: number;  // Public safety / safe exposure limit
  };
  blastRadiiKpa: {
    zone70Kpa: number; // Total structural demolition
    zone21Kpa: number; // Heavy steel damage / tank collapse
    zone7Kpa: number;  // Light walls, window frame failure
    zone2Kpa: number;  // Window breakage / safe distance
  };
}

export const THREAT_ZONE_PROVENANCE = {
  id: 'der02-threat-zones-v2',
  version: '2.0.0',
  standard: 'DER-02: Threat-Zone Estimation for Industrial Fire and Explosion Response',
  methodologies: [
    'CCPS Guidelines for Consequence Analysis of Chemical Releases',
    'TNO Yellow Book (Methods for Calculation of Physical Effects)',
    'API 521 Pressure-relieving and Depressuring Systems',
    'NFPA 15 Water Spray Fixed Systems for Fire Protection'
  ]
} as const;

/**
 * Calculates BLEVE (Boiling Liquid Expanding Vapor Explosion) physical parameters
 * based on TNO / CCPS empirical correlations for hydrocarbons.
 */
export function calculateBleveOutcome(input: BleveCalculationInput): BleveOutcome {
  const chemical: ChemicalSubstance = CHEMICAL_DATABASE[input.chemicalId] ?? CHEMICAL_DATABASE.propane;
  const massKg = Math.max(1, input.massKg);
  
  // Fireball diameter D = 5.8 * M^0.333 (m)
  const diameterM = 5.8 * Math.pow(massKg, 1 / 3);
  
  // Fireball duration t = 0.45 * M^0.333 (s)
  const durationS = 0.45 * Math.pow(massKg, 1 / 3);
  
  // Fireball center height H = 0.75 * D (m)
  const centerHeightM = 0.75 * diameterM;
  
  // Surface emissive power (kW/m²) - typically 200-350 kW/m² for LPG/hydrocarbons
  const surfaceEmissivePowerKwM2 = Math.min(350, 200 + (chemical.heatOfCombustionMjKg / 50) * 80);
  
  // Total radiative power Q_rad (MW)
  const radiativeFraction = 0.28;
  const totalHeatReleasedMj = massKg * chemical.heatOfCombustionMjKg;
  const totalRadiativePowerMw = (totalHeatReleasedMj * radiativeFraction) / Math.max(0.1, durationS);
  
  // Radiative heat flux at distance R from fireball center:
  // q(R) = (totalRadiativePowerMw * 1000) / (4 * PI * R^2) * tau_atm
  // Distance for given flux q: R = sqrt((totalRadiativePowerMw * 1000) / (4 * PI * q))
  const distanceForFlux = (targetFluxKwM2: number): number => {
    return Math.sqrt((totalRadiativePowerMw * 1000) / (4 * Math.PI * targetFluxKwM2));
  };
  
  // Blast overpressure from BLEVE physical rupture (equivalent TNT mass approx 5-10% of combustion energy)
  const equivalentTntKg = (massKg * chemical.heatOfCombustionMjKg * 0.05) / 4.68; // TNT eq
  const distanceForOverpressure = (targetKpa: number): number => {
    // Hopkinson-Cranz scaled distance Z = R / (W_tnt)^(1/3)
    // Approximation for mid-field: P(kPa) ~= 100 / Z^1.4 => Z = (100 / P)^(1 / 1.4)
    const scaledZ = Math.pow(100 / Math.max(0.5, targetKpa), 1 / 1.4);
    return Math.max(2, scaledZ * Math.pow(Math.max(1, equivalentTntKg), 1 / 3));
  };

  return {
    fireballDiameterM: diameterM,
    fireballDurationS: durationS,
    centerHeightM,
    surfaceEmissivePowerKwM2,
    totalRadiativePowerMw,
    threatDistances: {
      zone37_5KwM2: Math.max(diameterM / 2, distanceForFlux(37.5)),
      zone12_5KwM2: Math.max(diameterM / 2, distanceForFlux(12.5)),
      zone4_7KwM2: distanceForFlux(4.7),
      zone1_6KwM2: distanceForFlux(1.6)
    },
    blastRadiiKpa: {
      zone70Kpa: distanceForOverpressure(70),
      zone21Kpa: distanceForOverpressure(21),
      zone7Kpa: distanceForOverpressure(7),
      zone2Kpa: distanceForOverpressure(2)
    }
  };
}

/**
 * Generates structured DER-02 Threat-Zone profiles for visualization and decision support.
 */
export function estimateThermalThreatZones(fireIntensityMw: number, center: { x: number; y: number; z: number }): ThreatZoneResult {
  const q37 = Math.sqrt((fireIntensityMw * 1000) / (4 * Math.PI * 37.5));
  const q12 = Math.sqrt((fireIntensityMw * 1000) / (4 * Math.PI * 12.5));
  const q4 = Math.sqrt((fireIntensityMw * 1000) / (4 * Math.PI * 4.7));
  const q1 = Math.sqrt((fireIntensityMw * 1000) / (4 * Math.PI * 1.6));

  return {
    hazardType: 'thermal',
    center,
    zones: [
      {
        label: 'Zone 1 - Fatal / Structure Damage',
        level: 'CRITICAL',
        thresholdValue: 37.5,
        unit: 'kW/m²',
        radiusM: q37,
        colorHex: '#ff3333',
        description: '100% lethality in 60s, steel structural collapse, secondary ignition'
      },
      {
        label: 'Zone 2 - Severe Burns / 1% Lethality',
        level: 'HIGH',
        thresholdValue: 12.5,
        unit: 'kW/m²',
        radiusM: q12,
        colorHex: '#ff8800',
        description: 'First degree burns in 10s, plastic melting, wood pilings ignite'
      },
      {
        label: 'Zone 3 - Escape Threshold / Pain Limit',
        level: 'MODERATE',
        thresholdValue: 4.7,
        unit: 'kW/m²',
        radiusM: q4,
        colorHex: '#ffcc00',
        description: 'Maximum tolerable radiation for personnel escaping in protective clothing (30s)'
      },
      {
        label: 'Zone 4 - Public Safety Limit',
        level: 'LOW',
        thresholdValue: 1.6,
        unit: 'kW/m²',
        radiusM: q1,
        colorHex: '#33ccff',
        description: 'Safe for indefinite public exposure and emergency staging areas'
      }
    ]
  };
}

/**
 * Estimates flammable vapor cloud LEL boundaries (Lower Explosive Limit).
 */
export function estimateFlammableThreatZones(
  releaseRateKgS: number,
  chemicalId: string,
  windSpeedMS: number,
  center: { x: number; y: number; z: number }
): ThreatZoneResult {
  const chemical = CHEMICAL_DATABASE[chemicalId] ?? CHEMICAL_DATABASE.propane;
  const u = Math.max(0.5, windSpeedMS);
  // Downwind distance to LEL and 50% LEL using modified Brits-Sutton dispersion approximation
  const q = Math.max(0.1, releaseRateKgS);
  const lelDist = Math.max(1, (22 * Math.sqrt(q)) / Math.pow(u, 0.4) * (2.1 / chemical.lowerExplosiveLimitPct));
  const halfLelDist = lelDist * 1.6;
  const tenthLelDist = lelDist * 2.8;

  return {
    hazardType: 'toxic',
    center,
    zones: [
      {
        label: 'Flammable Core (100% LEL)',
        level: 'CRITICAL',
        thresholdValue: chemical.lowerExplosiveLimitPct,
        unit: '% LEL',
        radiusM: lelDist,
        colorHex: '#ff0055',
        description: `Atmosphere is explosive upon encountering any ignition source (${chemical.name})`
      },
      {
        label: 'Flammable Buffer (50% LEL)',
        level: 'HIGH',
        thresholdValue: chemical.lowerExplosiveLimitPct * 0.5,
        unit: '% LEL',
        radiusM: halfLelDist,
        colorHex: '#ff9900',
        description: 'NFPA 69 mandatory action zone; hot work prohibited, spark ignition risk'
      },
      {
        label: 'Detection Boundary (10% LEL)',
        level: 'MODERATE',
        thresholdValue: chemical.lowerExplosiveLimitPct * 0.1,
        unit: '% LEL',
        radiusM: tenthLelDist,
        colorHex: '#00ccff',
        description: 'Fixed gas detector warning threshold, PPE required'
      }
    ]
  };
}
