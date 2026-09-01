import { SimEvent, Twin, TwinContext, TwinState } from "../core/types.js";
import { BaseTwin } from "./base.js";

const cloneState=(s:TwinState):TwinState=>structuredClone(s);

const physical=(material:string, properties:Record<string,string|number|boolean>)=>({
  physicalProfile:{material, properties},
  relationships:[],
  history:[]
});

export class WeatherTwin extends BaseTwin {
 constructor(id:string,public windX=2,public windZ=0){super({id,kind:"weather",position:{x:0,y:0,z:0},fidelity:1,active:true,integrity:1,temperatureK:303,metadata:{}}, physical("atmosphere",{windX,windZ}));}
 onEvent():void{} tick():void{}
 clone():Twin{const c=new WeatherTwin(this.state.id,this.windX,this.windZ);Object.assign(c.state,cloneState(this.state));return c}
}

export class PipeTwin extends BaseTwin {
 leakRateKgS=0; failed=false;
 constructor(id:string,position:TwinState["position"],public chemical="propane"){
  super({id,kind:"pipe",position,fidelity:1,active:true,integrity:1,temperatureK:303,metadata:{chemical}},physical("steel",{chemical}));
 }
 onEvent(event:SimEvent,context:TwinContext):void{
  this.record(event,`processed ${event.type}`);
  if(event.type==="fault.pipe_leak"&&event.targetId===this.state.id)this.release(context,Number(event.payload.rateKgS??.3));
  if(event.type==="thermal.exposure"&&event.targetId===this.state.id){const flux=Number(event.payload.heatFluxKwM2??0);this.state.temperatureK+=flux*.025;this.state.integrity=Math.max(0,this.state.integrity-flux*.00045);if(!this.failed&&(this.state.integrity<=.55||this.state.temperatureK>=390)){this.failed=true;context.emit({type:"asset.failed",sourceId:this.state.id,payload:{kind:"pipe",mode:"thermal-rupture"}});this.release(context,Math.max(.8,this.leakRateKgS*2.5));}}
  if(event.type==="valve.command"&&event.payload.pipeId===this.state.id)this.leakRateKgS*=.08;
 }
 private release(context:TwinContext,rate:number){this.leakRateKgS=Math.max(this.leakRateKgS,rate);this.state.integrity=Math.max(0,this.state.integrity-.15);context.emit({type:"release.created",sourceId:this.state.id,payload:{chemical:this.chemical,rateKgS:this.leakRateKgS,origin:{...this.state.position}}});}
 tick():void{}
 clone():Twin{const c=new PipeTwin(this.state.id,{...this.state.position},this.chemical);c.leakRateKgS=this.leakRateKgS;c.failed=this.failed;Object.assign(c.state,cloneState(this.state));return c}
}

export class IgnitionSourceTwin extends BaseTwin {
 constructor(id:string,position:TwinState["position"],public enabled=true){super({id,kind:"ignition",position,fidelity:1,active:true,integrity:1,temperatureK:650,metadata:{enabled}},physical("ignition-source",{enabled}));}
 onEvent():void{} tick():void{}
 clone():Twin{const c=new IgnitionSourceTwin(this.state.id,{...this.state.position},this.enabled);Object.assign(c.state,cloneState(this.state));return c}
}

export class TankTwin extends BaseTwin {
 heatDose=0; failed=false;
 constructor(id:string,position:TwinState["position"],public chemical="propane"){
  super({id,kind:"tank",position,fidelity:1,active:true,integrity:1,temperatureK:303,metadata:{chemical,failureRisk:0}},physical("steel",{chemical,capacity:5000}));
 }
 onEvent(event:SimEvent,context:TwinContext):void{if(event.type!=="thermal.exposure"||event.targetId!==this.state.id||this.failed)return;this.record(event,"thermal exposure received");const flux=Number(event.payload.heatFluxKwM2??0);this.heatDose+=flux;this.state.temperatureK+=flux*.018;this.state.integrity=Math.max(0,this.state.integrity-flux*.00008);this.state.metadata.failureRisk=Math.min(.99,this.heatDose/16000);if(this.heatDose>=900||this.state.temperatureK>=520||this.state.integrity<=.65){this.failed=true;this.state.active=false;this.state.integrity=0;context.emit({type:"asset.failed",sourceId:this.state.id,payload:{kind:"tank",mode:"thermal-rupture",heatDose:this.heatDose}});context.emit({type:"release.created",sourceId:this.state.id,payload:{chemical:this.chemical,rateKgS:2.4,origin:{...this.state.position}}});context.emit({type:"fire.created",sourceId:this.state.id,payload:{origin:{...this.state.position},intensityMw:7}})}}
 tick():void{}
 clone():Twin{const c=new TankTwin(this.state.id,{...this.state.position},this.chemical);c.heatDose=this.heatDose;c.failed=this.failed;Object.assign(c.state,cloneState(this.state));return c}
}

export class WallTwin extends BaseTwin {
 constructor(id:string,position:TwinState["position"]){super({id,kind:"wall",position,fidelity:0,active:true,integrity:1,temperatureK:303,metadata:{damageState:"normal"}},physical("concrete",{}));}
 onEvent(event:SimEvent):void{if(event.type!=="thermal.exposure"||event.targetId!==this.state.id)return;this.record(event,"wall thermal exposure");const flux=Number(event.payload.heatFluxKwM2??0);this.state.temperatureK+=flux*.01;this.state.integrity=Math.max(0,this.state.integrity-flux*.00004);this.state.metadata.damageState=this.state.integrity<.55?"severe":this.state.integrity<.8?"damaged":"normal"}
 tick():void{}
 clone():Twin{const c=new WallTwin(this.state.id,{...this.state.position});Object.assign(c.state,cloneState(this.state));return c}
}
