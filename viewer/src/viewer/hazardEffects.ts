export type HazardSeverity = 'normal' | 'warning' | 'damaged' | 'critical' | 'destroyed';

export interface FireEffectState {
  active: boolean;
  intensity: number;
  radius: number;
  heatFlux: number;
}

export interface GasEffectState {
  active: boolean;
  concentration: number;
  radius: number;
  windDirection: number;
}

export class HazardEffectController {
  fire: FireEffectState = { active: false, intensity: 0, radius: 0, heatFlux: 0 };
  gas: GasEffectState = { active: false, concentration: 0, radius: 0, windDirection: 0 };

  updateFromTwin(event: { type: string; value?: number }) {
    if (event.type === 'fire.started') {
      this.fire.active = true;
      this.fire.intensity = event.value ?? 1;
    }

    if (event.type === 'gas.release') {
      this.gas.active = true;
      this.gas.concentration = event.value ?? 1;
    }
  }
}
