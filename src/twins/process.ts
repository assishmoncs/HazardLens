import { SimEvent, Twin, TwinContext, TwinState } from "../core/types.js";
import { BaseTwin } from "./base.js";
import { estimateReleaseKgS, updateStructuralDamage, updateVesselRisk } from "../models/consequences.js";

const cloneState=(s:TwinState):TwinState=>structuredClone(s);
const physical=(material:string,properties:Record<string,string|number|boolean>)=>({physicalProfile:{material,properties},relationships:[],history:[]});
const modelMeta=(modelIds:string[])=>({relationships:[],history:[],modelIds});

export class WeatherTwin extends BaseTwin {
 constructor(id:string,public windX=2,public windZ=0){super({id,kind:"weather",position:{x:0,y:0,z:0},fidelity:1,active:true,integrity:1,temperatureK:303,metadata:{windX,windZ,stability:"D"}}, {...physical("atmosphere",{windX,windZ,stability:"D"}),...modelMeta(["plume-gaussian-v1"])});}
 onEvent(_event:SimEvent,_context:TwinContext):void{} tick():void{}
 clone():Twin{const c=new WeatherTwin(this.state.id,this.windX,this.windZ);Object.assign(c.state,cloneState(this.state));return c}
}

export class PipeTwin extends BaseTwin {
 leakRateKgS=0; failed=false;
 constructor(id:string,position:TwinState["position"],public chemical="propane"){super({id,kind:"pipe",position,fidelity:1,active:true,integrity:1,temperatureK:303,metadata:{chemical,upstreamPressureBar:8,leakAreaMm2:12,dischargeCoefficient:.62}}, {...physical("steel",{chemical,upstreamPressureBar:8,leakAreaMm2:12}),...modelMeta(["release-orifice-v1","structural-screen-v1"])});}
 onEvent(event:SimEvent,context:TwinContext):void{
  this.record(event,`processed ${event.type}`);
  if(event.type==="fault.pipe_leak"&&event.targetId===this.state.id){const rate=event.payload.rateKgS==null?estimateReleaseKgS({leakAreaMm2:Number(event.payload.leakAreaMm2??this.state.metadata.leakAreaMm2??12),upstreamPressureBar:Number(event.payload.upstreamPressureBar??this.state.metadata.upstreamPressureBar??8),temperatureK:this.state.temperatureK,dischargeCoefficient:Number(this.state.metadata.dischargeCoefficient??.62)}):Number(event.payload.rateKgS);this.release(context,rate);}
  if(event.type==="thermal.exposure"&&event.targetId===this.state.id){const flux=Number(event.payload.heatFluxKwM2??0),seconds=Number(event.payload.exposureSeconds??.25);this.state.temperatureK+=flux*.025*seconds;this.state.integrity=Math.max(0,this.state.integrity-flux*.00045*seconds);this.state.metadata.damageState=updateStructuralDamage({integrity:this.state.integrity,heatFluxKwM2:flux}).damageState;if(!this.failed&&(this.state.integrity<=.55||this.state.temperatureK>=390)){this.failed=true;context.emit({type:"asset.failed",sourceId:this.state.id,payload:{kind:"pipe",mode:"thermal-rupture",model:"structural-screen-v1"}});this.release(context,Math.max(.8,this.leakRateKgS*2.5));}}
  if(event.type==="valve.command"&&event.payload.pipeId===this.state.id){this.leakRateKgS*=.08;this.state.metadata.isolationFactor=.08;}
 }
 private release(context:TwinContext,rate:number){this.leakRateKgS=Math.max(this.leakRateKgS,rate);this.state.integrity=Math.max(0,this.state.integrity-.15);context.emit({type:"release.created",sourceId:this.state.id,payload:{chemical:this.chemical,rateKgS:this.leakRateKgS,origin:{...this.state.position},model:"release-orifice-v1"}});}
 tick():void{}
 clone():Twin{const c=new PipeTwin(this.state.id,{...this.state.position},this.chemical);c.leakRateKgS=this.leakRateKgS;c.failed=this.failed;Object.assign(c.state,cloneState(this.state));return c}
}

export class IgnitionSourceTwin extends BaseTwin {
 constructor(id:string,position:TwinState["position"],public enabled=true){super({id,kind:"ignition",position,fidelity:1,active:true,integrity:1,temperatureK:650,metadata:{enabled}}, {...physical("ignition-source",{enabled}),...modelMeta(["ignition-screen-v1"])});}
 onEvent(_event:SimEvent,_context:TwinContext):void{} tick():void{}
 clone():Twin{const c=new IgnitionSourceTwin(this.state.id,{...this.state.position},this.enabled);Object.assign(c.state,cloneState(this.state));return c}
}

export class TankTwin extends BaseTwin {
 heatDose=0; failed=false;
 constructor(id:string,position:TwinState["position"],public chemical="propane"){super({id,kind:"tank",position,fidelity:1,active:true,integrity:1,temperatureK:303,metadata:{chemical,failureRisk:0,pressureBar:12,maxPressureBar:24,thermalDose:0}}, {...physical("steel",{chemical,capacity:5000}),...modelMeta(["vessel-degradation-v1","thermal-point-source-v1"])});}
 onEvent(event:SimEvent,context:TwinContext):void{if(event.type!=="thermal.exposure"||event.targetId!==this.state.id||this.failed)return;this.record(event,"thermal exposure received");const flux=Number(event.payload.heatFluxKwM2??0),seconds=Number(event.payload.exposureSeconds??.25);this.heatDose+=flux*seconds;this.state.temperatureK+=flux*.018*seconds;const pressureBar=Number(this.state.metadata.pressureBar??12)+flux*.0015*seconds;this.state.metadata.pressureBar=pressureBar;this.state.metadata.thermalDose=this.heatDose;this.state.integrity=Math.max(0,this.state.integrity-flux*.00008*seconds);const risk=updateVesselRisk({pressureBar,maxPressureBar:Number(this.state.metadata.maxPressureBar??24),temperatureK:this.state.temperatureK,integrity:this.state.integrity,thermalDose:this.heatDose});this.state.metadata.failureRisk=risk.risk;if(risk.failureThreshold||this.heatDose>=300||this.state.integrity<=.35){this.failed=true;this.state.active=false;this.state.integrity=0;context.emit({type:"asset.failed",sourceId:this.state.id,payload:{kind:"tank",mode:"thermal-rupture",heatDose:this.heatDose,model:"vessel-degradation-v1"}});context.emit({type:"release.created",sourceId:this.state.id,payload:{chemical:this.chemical,rateKgS:2.4,origin:{...this.state.position},model:"release-orifice-v1"}});context.emit({type:"fire.created",sourceId:this.state.id,payload:{origin:{...this.state.position},intensityMw:7}});}}
 tick():void{}
 clone():Twin{const c=new TankTwin(this.state.id,{...this.state.position},this.chemical);c.heatDose=this.heatDose;c.failed=this.failed;Object.assign(c.state,cloneState(this.state));return c}
}

export class WallTwin extends BaseTwin {
 constructor(id:string,position:TwinState["position"]){super({id,kind:"wall",position,fidelity:0,active:true,integrity:1,temperatureK:303,metadata:{damageState:"normal"}}, {...physical("concrete",{}),...modelMeta(["structural-screen-v1"])});}
 onEvent(event:SimEvent,_context:TwinContext):void{if(event.type!=="thermal.exposure"||event.targetId!==this.state.id)return;this.record(event,"wall thermal exposure");const flux=Number(event.payload.heatFluxKwM2??0);this.state.temperatureK+=flux*.01*Number(event.payload.exposureSeconds??.25);const damage=updateStructuralDamage({integrity:this.state.integrity,heatFluxKwM2:flux});this.state.integrity=damage.integrity;this.state.metadata.damageState=damage.damageState;}
 tick():void{}
 clone():Twin{const c=new WallTwin(this.state.id,{...this.state.position});Object.assign(c.state,cloneState(this.state));return c}
}
