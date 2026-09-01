import test from "node:test";
import assert from "node:assert/strict";
import { SimulationRuntime } from "../src/core/runtime.js";
import { FireTwin } from "../src/twins/hazards.js";
import { IgnitionSourceTwin, TankTwin } from "../src/twins/process.js";

test("sustained fire causes a secondary tank failure and new fire",()=>{
 const tank=new TankTwin("tank-b",{x:2,y:0,z:0});
 const rt=new SimulationRuntime([new FireTwin("primary",{x:0,y:0,z:0},8),tank,new IgnitionSourceTwin("spark",{x:2,y:0,z:0})]);
 rt.run(5,.25);
 const snap=rt.snapshot();
 assert.equal(tank.failed,true);
 assert.ok(snap.events.some(e=>e.type==="asset.failed"&&e.sourceId==="tank-b"));
 assert.ok(snap.twins.filter(t=>t.kind==="fire").length>=2);
});

test("multiple fires accumulate exposure rather than overwriting it",()=>{
 const one=new TankTwin("one",{x:3,y:0,z:0});
 const two=new TankTwin("two",{x:3,y:0,z:0});
 const a=new SimulationRuntime([new FireTwin("f1",{x:0,y:0,z:0},3),one]);
 const b=new SimulationRuntime([new FireTwin("f1",{x:0,y:0,z:0},3),new FireTwin("f2",{x:0,y:0,z:1},3),two]);
 a.run(1,.25);b.run(1,.25);
 assert.ok(two.heatDose>one.heatDose);
});

test("suppression can terminate propagation before secondary failure",()=>{
 const tank=new TankTwin("protected",{x:4,y:0,z:0});
 const fire=new FireTwin("primary",{x:0,y:0,z:0},5);
 const rt=new SimulationRuntime([fire,tank]);
 rt.emit({type:"suppression.command",sourceId:"operator",targetId:"primary",payload:{strength:10}});
 rt.run(4,.25);
 assert.equal(fire.state.active,false);
 assert.equal(tank.failed,false);
 assert.equal(rt.snapshot().events.some(e=>e.type==="asset.failed"&&e.sourceId==="protected"),false);
});
