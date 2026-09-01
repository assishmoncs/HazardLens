import test from "node:test";
import assert from "node:assert/strict";
import { SimulationRuntime } from "../src/core/runtime.js";
import { IgnitionSourceTwin, PipeTwin, TankTwin, WallTwin, WeatherTwin } from "../src/twins/process.js";
function world(windX:number){return new SimulationRuntime([new WeatherTwin("weather",windX,0),new PipeTwin("p1",{x:0,y:0,z:0}),new IgnitionSourceTwin("spark",{x:7,y:0,z:0}),new TankTwin("t2",{x:10,y:0,z:0}),new WallTwin("w1",{x:8,y:0,z:2})])}
function breakPipe(r:SimulationRuntime){r.emit({type:"fault.pipe_leak",sourceId:"operator",targetId:"p1",payload:{rateKgS:.6}})}
test("same fault produces different outcome when weather changes",()=>{const toward=world(3),away=world(-3);breakPipe(toward);breakPipe(away);toward.run(12);away.run(12);assert.ok(toward.snapshot().events.some(e=>e.type==="fire.created"));assert.equal(away.snapshot().events.some(e=>e.type==="fire.created"),false)});
test("counterfactual isolation reduces source flow without scenario code",()=>{const base=world(3);breakPipe(base);base.run(1);const branch=base.clone();branch.emit({type:"valve.command",sourceId:"operator",payload:{pipeId:"p1",closed:true}});branch.run(1);assert.ok((branch.get("p1") as PipeTwin).leakRateKgS < (base.get("p1") as PipeTwin).leakRateKgS)});
