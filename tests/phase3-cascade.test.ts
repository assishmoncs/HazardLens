import test from "node:test";
import assert from "node:assert/strict";
import { SimulationRuntime } from "../src/core/runtime.js";
import { FireTwin } from "../src/twins/hazards.js";
import { ColumnTwin, RouteTwin, WindowTwin } from "../src/twins/infrastructure.js";
import { propagateCascade } from "../src/models/cascade.js";

test("blast model weakens with distance",()=>{
 const near=propagateCascade({fireIntensityMw:8,distanceM:5});
 const far=propagateCascade({fireIntensityMw:8,distanceM:15});
 assert.ok(near.overpressureKpa>far.overpressureKpa);
 assert.ok(near.damageClass!=="none");
});

test("fire emits overpressure to structural twins",()=>{
 const column=new ColumnTwin("C-01",{x:4,y:0,z:0});
 const window=new WindowTwin("W-01",{x:4,y:0,z:1});
 const rt=new SimulationRuntime([new FireTwin("fire",{x:0,y:0,z:0},8),column,window]);
 rt.run(.5,.25);
 const events=rt.snapshot().events;
 assert.ok(events.some(e=>e.type==="overpressure.received"&&e.targetId==="C-01"));
 assert.ok(events.some(e=>e.type==="overpressure.received"&&e.targetId==="W-01"));
});

test("severe fire consequence blocks an affected route",()=>{
 const route=new RouteTwin("R-01",{x:1,y:0,z:0});
 const rt=new SimulationRuntime([new FireTwin("fire",{x:0,y:0,z:0},8),route]);
 rt.run(.25,.25);
 assert.equal(route.state.metadata.open,false);
 assert.equal(route.state.metadata.risk,1);
 assert.ok(rt.snapshot().events.some(e=>e.type==="route.blocked"&&e.targetId==="R-01"));
});
