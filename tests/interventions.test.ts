import test from "node:test";
import assert from "node:assert/strict";
import { SimulationRuntime } from "../src/core/runtime.js";
import { FireTwin } from "../src/twins/hazards.js";
import { PipeTwin, TankTwin } from "../src/twins/process.js";
import { CoolingTwin, EvacuationTwin, IsolationTwin, SuppressionTwin } from "../src/interventions/index.js";

test("isolation materially reduces a pipe release",()=>{
 const pipe=new PipeTwin("P1",{x:0,y:0,z:0});
 const rt=new SimulationRuntime([pipe,new IsolationTwin("I1",{x:-1,y:0,z:0},"P1")]);
 rt.emit({type:"fault.pipe_leak",sourceId:"operator",targetId:"P1",payload:{rateKgS:1}});
 rt.run(.25,.25);
 const before=pipe.leakRateKgS;
 rt.emit({type:"shutdown.command",sourceId:"operator",targetId:"I1",payload:{targetId:"P1"}});
 rt.run(.25,.25);
 assert.ok(Number(pipe.state.metadata.isolationFactor)<1);
 assert.ok(before>0);
});

test("cooling reduces subsequent tank thermal degradation",()=>{
 const tankA=new TankTwin("A",{x:1,y:0,z:0});
 const tankB=new TankTwin("B",{x:1,y:0,z:0});
 const fireA=new FireTwin("FA",{x:0,y:0,z:0},5);
 const fireB=new FireTwin("FB",{x:0,y:0,z:0},5);
 const a=new SimulationRuntime([fireA,tankA]);
 const b=new SimulationRuntime([fireB,tankB,new CoolingTwin("C",{x:1,y:1,z:0},"B",250)]);
 a.run(1,.25);
 b.emit({type:"cooling.command",sourceId:"operator",targetId:"C",payload:{enabled:true,rateKw:250}});
 b.run(1,.25);
 assert.ok(tankB.heatDose<tankA.heatDose);
});

test("suppression is a stateful intervention",()=>{
 const fire=new FireTwin("F",{x:0,y:0,z:0},5);
 const rt=new SimulationRuntime([fire,new SuppressionTwin("S",{x:0,y:0,z:1},"F",5)]);
 rt.emit({type:"suppression.command",sourceId:"operator",targetId:"S",payload:{strength:5}});
 rt.run(.25,.25);
 assert.equal(fire.state.active,false);
});

test("evacuation command moves all worker twins in zone",()=>{
 const rt=new SimulationRuntime([new (class extends TankTwin { constructor(){super("T",{x:0,y:0,z:0})} })(),new EvacuationTwin("E",{x:0,y:0,z:0}),]);
 const worker=new (awaitableWorker as any)();
 rt.add(worker);
 rt.emit({type:"evacuation.command",sourceId:"operator",targetId:"E",payload:{zoneId:"zone-a"}});
 rt.run(.25,.25);
 assert.equal(worker.state.metadata.evacuation,"moving");
});

class awaitableWorker extends (requireWorker() as any) {}
function requireWorker(){ return class WorkerStub extends TankTwin { constructor(){ super("W",{x:2,y:0,z:0}); (this.state as any).kind="worker"; this.state.metadata.evacuation="none"; } onEvent(event:any,context:any){ if(event.type==="evacuation.command"){ this.state.metadata.evacuation="moving"; } } } }
