export interface ChemicalSubstance {
  id: string;
  name: string;
  formula: string;
  heatOfCombustionMjKg: number;
  boilingPointK: number;
  vaporDensityAirRatio: number;
  lowerExplosiveLimitPct: number;
  upperExplosiveLimitPct: number;
  toxicEsdPpm?: number;
  erpg2Ppm?: number;
  liquidDensityKgM3: number;
}

export const CHEMICAL_DATABASE: Record<string, ChemicalSubstance> = {
  propane: {
    id: 'propane',
    name: 'Liquefied Petroleum Gas (Propane)',
    formula: 'C3H8',
    heatOfCombustionMjKg: 46.3,
    boilingPointK: 231.1,
    vaporDensityAirRatio: 1.52,
    lowerExplosiveLimitPct: 2.1,
    upperExplosiveLimitPct: 9.5,
    liquidDensityKgM3: 493
  },
  methane: {
    id: 'methane',
    name: 'Natural Gas (Methane)',
    formula: 'CH4',
    heatOfCombustionMjKg: 50.0,
    boilingPointK: 111.6,
    vaporDensityAirRatio: 0.55,
    lowerExplosiveLimitPct: 5.0,
    upperExplosiveLimitPct: 15.0,
    liquidDensityKgM3: 422
  },
  ammonia: {
    id: 'ammonia',
    name: 'Anhydrous Ammonia (Toxic / Corrosive)',
    formula: 'NH3',
    heatOfCombustionMjKg: 18.6,
    boilingPointK: 239.8,
    vaporDensityAirRatio: 0.59,
    lowerExplosiveLimitPct: 15.0,
    upperExplosiveLimitPct: 28.0,
    toxicEsdPpm: 25,
    erpg2Ppm: 150,
    liquidDensityKgM3: 681
  },
  hydrogen: {
    id: 'hydrogen',
    name: 'Compressed Hydrogen',
    formula: 'H2',
    heatOfCombustionMjKg: 120.0,
    boilingPointK: 20.3,
    vaporDensityAirRatio: 0.07,
    lowerExplosiveLimitPct: 4.0,
    upperExplosiveLimitPct: 75.0,
    liquidDensityKgM3: 71
  },
  crude_oil: {
    id: 'crude_oil',
    name: 'Light Sweet Crude Oil',
    formula: 'CxHy',
    heatOfCombustionMjKg: 42.0,
    boilingPointK: 350.0,
    vaporDensityAirRatio: 3.5,
    lowerExplosiveLimitPct: 1.0,
    upperExplosiveLimitPct: 6.0,
    liquidDensityKgM3: 840
  }
};
