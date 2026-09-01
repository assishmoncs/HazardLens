import test from "node:test";
import assert from "node:assert/strict";
import { SimulationRuntime } from "../src/core/runtime.js";
import { PipeTwin, TankTwin } from "../src/twins/process.js";
import { benchmarkRuntime } from "../src/core/performance.js";

test("runtime performance benchmark reports finite metrics",()=>{
 const twins=[] as (PipeTwin|TankTwin)[];
 for(let i=0;i<25;i++){twins.push(new PipeTwin(`P-${i}`,{x:i%5,y:0,z:Math.floor(i/5)}));twins.push(new TankTwin(`T-${i}`,{x:i%5+1,y:0,z:Math.floor(i/5)}));}
 const runtime=new SimulationRuntime(twins);
 const result=benchmarkRuntime(runtime,1,.25);
 assert.equal(result.simSeconds,1);
 assert.equal(result.twinCount,50);
 assert.ok(Number.isFinite(result.wallSeconds));
 assert.ok(result.realTimeFactor>0);
 assert.ok(result.eventCount>=0);
});
