import { SimulationRuntime } from "./core/runtime.js";
import { IgnitionSourceTwin, PipeTwin, TankTwin, WallTwin, WeatherTwin } from "./twins/process.js";
const sim=new SimulationRuntime([new WeatherTwin("weather",3,0),new PipeTwin("P-17",{x:0,y:0,z:0}),new IgnitionSourceTwin("M-04",{x:7,y:0,z:0}),new TankTwin("T-04",{x:10,y:0,z:0}),new WallTwin("W-07",{x:8,y:0,z:2})]);
sim.emit({type:"fault.pipe_leak",sourceId:"operator",targetId:"P-17",payload:{rateKgS:.6}});sim.run(12);
const s=sim.snapshot();console.log(JSON.stringify({time:s.time,twins:s.twins,causalEvents:s.events.map(e=>({t:e.time,type:e.type,source:e.sourceId,target:e.targetId}))},null,2));
