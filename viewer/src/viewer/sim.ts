import { SimulationRuntime } from '../../../src/core/runtime.js';
import type { WorldSnapshot } from '../../../src/core/types.js';
import { IgnitionSourceTwin, PipeTwin, TankTwin, WallTwin, WeatherTwin } from '../../../src/twins/process.js';

export class ViewerSimulation {
  runtime: SimulationRuntime;
  running = false;
  speed = 1;
  private accumulator = 0;

  constructor() { this.runtime = this.makeWorld(); }

  private makeWorld() {
    return new SimulationRuntime([
      new WeatherTwin('WEATHER', 3, 0),
      new PipeTwin('P-17', { x: 0, y: 1, z: 0 }),
      new IgnitionSourceTwin('M-04', { x: 7, y: 1, z: 0 }),
      new TankTwin('T-04', { x: 10, y: 2, z: 0 }),
      new TankTwin('T-05', { x: 15, y: 2, z: 2 }),
      new WallTwin('W-07', { x: 8, y: 2, z: -5 }),
    ]);
  }

  reset() { this.runtime = this.makeWorld(); this.running = false; this.accumulator = 0; }
  breakPipe() { this.runtime.emit({ type:'fault.pipe_leak', sourceId:'operator', targetId:'P-17', payload:{ rateKgS:.6 } }); this.running = true; }
  suppress() { for (const t of this.runtime.snapshot().twins.filter(t => t.kind === 'fire' && t.active)) this.runtime.emit({ type:'suppression.command', sourceId:'operator', targetId:t.id, payload:{ strength:10 } }); }
  update(realDt:number) { if(!this.running) return; this.accumulator += Math.min(realDt,.1)*this.speed; while(this.accumulator >= .05){ this.runtime.step(.05); this.accumulator -= .05; } }
  snapshot():WorldSnapshot { return this.runtime.snapshot(); }
}
