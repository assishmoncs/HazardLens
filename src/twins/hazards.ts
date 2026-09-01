import { SimEvent, Twin, TwinContext, Vec3 } from "../core/types.js";
import { estimatePlume, estimateThermalFluxKwM2 } from "../models/consequences.js";
import { propagateCascade } from "../models/cascade.js";
import { BaseTwin } from "./base.js";
import { IgnitionSourceTwin, WeatherTwin } from "./process.js";

const d=(a:Vec3,b:Vec3)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

export class ReleaseTwin extends BaseTwin {
  age=0; ignited=false;
  constructor(id:string,p:Vec3,public sourceId:string,public rateKgS:number){
    super({id,kind:"release",position:{...p},fidelity:2,active:true,integrity:1,temperatureK:303,metadata:{radiusM:.5,ignited:false,dispersionModel:"plume-gaussian-v1"}}, {physicalProfile:{material:"gas",properties:{rateKgS}},relationships:[],history:[],modelIds:["plume-gaussian-v1","ignition-screen-v1"]});
  }
  onEvent(_event:SimEvent,_context:TwinContext){}
  tick(dt:number,c:TwinContext){
    this.age+=dt;
    const w=[...c.twins()].find(t=>t instanceof WeatherTwin) as WeatherTwin|undefined;
    const plume=estimatePlume({rateKgS:this.rateKgS,ageS:this.age,windX:w?.windX??0,windZ:w?.windZ??0,stability:((w?.state.metadata.stability as string)??"D") as "A"|"B"|"C"|"D"|"E"|"F"});
    this.state.position.x=plume.centerX;
    this.state.position.z=plume.centerZ;
    this.state.metadata.radiusM=plume.radiusM;
    this.state.metadata.spreadM=plume.spreadM;
    this.state.metadata.windSpeedMS=plume.windSpeedMS;
    if(!this.ignited){
      for(const t of c.twins()){
        if(t instanceof IgnitionSourceTwin&&t.enabled&&d(this.state.position,t.state.position)<=plume.radiusM){
          this.ignited=true;
          this.state.metadata.ignited=true;
          c.emit({type:"release.ignited",sourceId:this.state.id,payload:{releaseId:this.state.id,model:"ignition-screen-v1"}});
          c.emit({type:"fire.created",sourceId:this.state.id,payload:{origin:{...this.state.position},intensityMw:Math.max(.5,this.rateKgS*8),sourceReleaseId:this.state.id}});
          break;
        }
      }
    }
  }
  clone():Twin{const x=new ReleaseTwin(this.state.id,{...this.state.position},this.sourceId,this.rateKgS);x.age=this.age;x.ignited=this.ignited;Object.assign(x.state,structuredClone(this.state));return x}
}

export class FireTwin extends BaseTwin {
  constructor(id:string,p:Vec3,public intensityMw:number){
    super({id,kind:"fire",position:{...p},fidelity:3,active:true,integrity:1,temperatureK:1100,metadata:{intensityMw,model:"thermal-point-source-v1",cascadeModel:"cascade-consequence-v1"}}, {physicalProfile:{material:"combustion",properties:{intensityMw}},relationships:[],history:[],modelIds:["thermal-point-source-v1","cascade-consequence-v1"]});
  }
  onEvent(e:SimEvent,_context:TwinContext){
    if(e.type==="suppression.command"){
      const strength=Number((e.payload as any).strength??.5);
      this.intensityMw=Math.max(0,this.intensityMw-strength);
      this.state.metadata.intensityMw=this.intensityMw;
      if(this.intensityMw===0)this.state.active=false;
    }
  }
  tick(_dt:number,c:TwinContext){
    for(const t of c.twins()){
      if(t.state.id===this.state.id)continue;
      const supported=["tank","wall","pipe","column","window","building","worker","route"].includes(t.state.kind);
      if(!supported)continue;
      const r=Math.max(1,d(this.state.position,t.state.position));
      const flux=estimateThermalFluxKwM2({fireIntensityMw:this.intensityMw,distanceM:r});
      if(flux>1)c.emit({type:"thermal.exposure",sourceId:this.state.id,targetId:t.state.id,payload:{heatFluxKwM2:flux,exposureSeconds:.25,model:"thermal-point-source-v1"}});
      const cascade=propagateCascade({fireIntensityMw:this.intensityMw,distanceM:r});
      if(cascade.overpressureKpa>1)c.emit({type:"overpressure.received",sourceId:this.state.id,targetId:t.state.id,payload:{overpressureKpa:cascade.overpressureKpa,damageClass:cascade.damageClass,model:"cascade-consequence-v1"}});
      if((t.state.kind==="route"||t.state.kind==="building")&&cascade.damageClass==="severe")c.emit({type:"route.blocked",sourceId:this.state.id,targetId:t.state.id,payload:{reason:"blast/thermal damage",overpressureKpa:cascade.overpressureKpa}});
    }
  }
  clone():Twin{const x=new FireTwin(this.state.id,{...this.state.position},this.intensityMw);Object.assign(x.state,structuredClone(this.state));return x}
}
