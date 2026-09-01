import { SimEvent, Twin, TwinContext, Vec3 } from "../core/types.js";
import { BaseTwin } from "./base.js";
import { IgnitionSourceTwin, WeatherTwin } from "./process.js";

const d=(a:Vec3,b:Vec3)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

export class ReleaseTwin extends BaseTwin {
 age=0; ignited=false;
 constructor(id:string,p:Vec3,public sourceId:string,public rateKgS:number){
  super({id,kind:"release",position:{...p},fidelity:2,active:true,integrity:1,temperatureK:303,metadata:{radiusM:.5,ignited:false}}, {physicalProfile:{material:"gas",properties:{rateKgS}},relationships:[],history:[]});
 }
 onEvent(){}
 tick(dt:number,c:TwinContext){this.age+=dt;const w=[...c.twins()].find(t=>t instanceof WeatherTwin) as WeatherTwin|undefined;this.state.position.x+=(w?.windX??0)*dt*.35;this.state.position.z+=(w?.windZ??0)*dt*.35;const radius=.5+Math.sqrt(this.age)*1.5+this.rateKgS*2;this.state.metadata.radiusM=radius;if(!this.ignited){for(const t of c.twins()){if(t instanceof IgnitionSourceTwin&&t.enabled&&d(this.state.position,t.state.position)<=radius){this.ignited=true;this.state.metadata.ignited=true;c.emit({type:"release.ignited",sourceId:this.state.id,payload:{releaseId:this.state.id}});c.emit({type:"fire.created",sourceId:this.state.id,payload:{origin:{...this.state.position},intensityMw:Math.max(.5,this.rateKgS*8)}});break;}}}}
 clone():Twin{const x=new ReleaseTwin(this.state.id,{...this.state.position},this.sourceId,this.rateKgS);x.age=this.age;x.ignited=this.ignited;Object.assign(x.state,structuredClone(this.state));return x}
}

export class FireTwin extends BaseTwin {
 constructor(id:string,p:Vec3,public intensityMw:number){super({id,kind:"fire",position:{...p},fidelity:3,active:true,integrity:1,temperatureK:1100,metadata:{intensityMw}}, {physicalProfile:{material:"combustion",properties:{intensityMw}},relationships:[],history:[]});}
 onEvent(e:SimEvent){if(e.type==="suppression.command"){const strength=Number((e.payload as any).strength??.5);this.intensityMw=Math.max(0,this.intensityMw-strength);this.state.metadata.intensityMw=this.intensityMw;if(this.intensityMw===0)this.state.active=false;}}
 tick(_dt:number,c:TwinContext){for(const t of c.twins()){if(t.state.id===this.state.id||!["tank","wall","pipe"].includes(t.state.kind))continue;const r=Math.max(1,d(this.state.position,t.state.position));const flux=Math.min(80,(this.intensityMw*120)/(r*r));if(flux>1)c.emit({type:"thermal.exposure",sourceId:this.state.id,targetId:t.state.id,payload:{heatFluxKwM2:flux}});}}
 clone():Twin{const x=new FireTwin(this.state.id,{...this.state.position},this.intensityMw);Object.assign(x.state,structuredClone(this.state));return x}
}
