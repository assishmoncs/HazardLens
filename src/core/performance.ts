import type { SimulationRuntime } from "./runtime.js";

export interface RuntimePerformance {
  simSeconds:number;
  wallSeconds:number;
  realTimeFactor:number;
  twinCount:number;
  eventCount:number;
  eventsPerSecond:number;
}

export function benchmarkRuntime(runtime:SimulationRuntime,duration:number,dt=.25):RuntimePerformance{
  const start=performance.now();
  const before=runtime.snapshot();
  runtime.run(duration,dt);
  const after=runtime.snapshot();
  const wallSeconds=(performance.now()-start)/1000;
  const eventCount=Math.max(0,after.events.length-before.events.length);
  return {simSeconds:duration,wallSeconds,realTimeFactor:wallSeconds>0?duration/wallSeconds:Number.POSITIVE_INFINITY,twinCount:after.twins.length,eventCount,eventsPerSecond:wallSeconds>0?eventCount/wallSeconds:0};
}
