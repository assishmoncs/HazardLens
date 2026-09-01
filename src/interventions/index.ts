import type { SimEvent, Twin, TwinContext, TwinState, Vec3 } from "../core/types.js";
import { BaseTwin } from "../twins/base.js";

const cloneState = <T>(value: T): T => structuredClone(value);
const st = (id:string, kind:TwinState["kind"], position:Vec3, metadata:Record<string,string|number|boolean>) => ({ id, kind, position:{...position}, fidelity:2 as const, active:true, integrity:1, temperatureK:303, metadata });
const meta = (modelIds:string[]) => ({modelIds, relationships:[], history:[]});

export class IsolationTwin extends BaseTwin {
  public engaged=false;
  constructor(id:string, position:Vec3, public readonly targetPipeId:string){
    super(st(id,"shutdown",position,{mode:"isolation",targetPipeId,engaged:false}), meta(["isolation-v1"]));
  }
  onEvent(event:SimEvent, context:TwinContext):void {
    if(event.targetId!==this.state.id || event.type!=="shutdown.command") return;
    const target = String(event.payload.targetId ?? this.targetPipeId);
    if(target!==this.targetPipeId) return;
    this.engaged=true; this.state.metadata.engaged=true;
    context.emit({type:"valve.command",sourceId:this.state.id,targetId:this.targetPipeId,payload:{action:"close",closed:true,pipeId:this.targetPipeId,reason:"emergency-isolation"}});
  }
  tick():void{}
  clone():Twin { const x=new IsolationTwin(this.state.id,this.state.position,this.targetPipeId); x.engaged=this.engaged; Object.assign(x.state,cloneState(this.state)); return x; }
}

export class CoolingTwin extends BaseTwin {
  public activeCooling=false;
  constructor(id:string, position:Vec3, public readonly targetId:string, public readonly rateKw=250){
    super(st(id,"suppression",position,{mode:"cooling",targetId,rateKw,active:false}), meta(["cooling-v1"]));
  }
  onEvent(event:SimEvent):void {
    if(event.targetId!==this.state.id || event.type!=="cooling.command") return;
    this.activeCooling = Boolean(event.payload.enabled ?? true);
    this.state.metadata.active = this.activeCooling;
    this.state.active = true;
  }
  tick(_dt:number,c: TwinContext):void {
    if(!this.activeCooling) return;
    c.emit({type:"cooling.command",sourceId:this.state.id,targetId:this.targetId,payload:{targetId:this.targetId,rateKw:this.rateKw,enabled:true}});
  }
  clone():Twin { const x=new CoolingTwin(this.state.id,this.state.position,this.targetId,this.rateKw); x.activeCooling=this.activeCooling; Object.assign(x.state,cloneState(this.state)); return x; }
}

export class SuppressionTwin extends BaseTwin {
  public activeSuppression=false;
  constructor(id:string, position:Vec3, public readonly targetFireId:string, public readonly strength=1){
    super(st(id,"suppression",position,{mode:"suppression",targetFireId,strength,active:false}), meta(["suppression-v1"]));
  }
  onEvent(event:SimEvent, context:TwinContext):void {
    if(event.targetId!==this.state.id || event.type!=="suppression.command") return;
    this.activeSuppression=true; this.state.metadata.active=true;
    context.emit({type:"suppression.command",sourceId:this.state.id,targetId:this.targetFireId,payload:{strength:this.strength}});
  }
  tick():void{}
  clone():Twin { const x=new SuppressionTwin(this.state.id,this.state.position,this.targetFireId,this.strength); x.activeSuppression=this.activeSuppression; Object.assign(x.state,cloneState(this.state)); return x; }
}

export class EvacuationTwin extends BaseTwin {
  constructor(id:string,position:Vec3,public readonly zoneId="zone-a"){super(st(id,"shutdown",position,{mode:"evacuation",zoneId,status:"ready"}),meta(["evacuation-v1"]));}
  onEvent(event:SimEvent, context:TwinContext):void {
    if(event.targetId!==this.state.id || event.type!=="evacuation.command") return;
    this.state.metadata.status="active";
    for(const t of context.twins()) if(t.state.kind==="worker") context.emit({type:"evacuation.command",sourceId:this.state.id,targetId:t.state.id,payload:{zoneId:this.zoneId}});
  }
  tick():void{}
  clone():Twin { const x=new EvacuationTwin(this.state.id,this.state.position,this.zoneId); Object.assign(x.state,cloneState(this.state)); return x; }
}

export class EmergencyShutdownTwin extends BaseTwin {
  public triggered=false;
  constructor(id:string,position:Vec3,public readonly targets:string[]){super(st(id,"shutdown",position,{armed:true,triggered:false,targetCount:targets.length}),meta(["esd-controller-v1"]));}
  onEvent(event:SimEvent,context:TwinContext):void {
    if(event.targetId!==this.state.id || event.type!=="shutdown.command") return;
    this.triggered=true; this.state.metadata.triggered=true;
    for(const target of this.targets) context.emit({type:"shutdown.command",sourceId:this.state.id,targetId:target,payload:{action:"stop",reason:"emergency-shutdown"}});
  }
  tick():void{}
  clone():Twin { const x=new EmergencyShutdownTwin(this.state.id,this.state.position,[...this.targets]); x.triggered=this.triggered; Object.assign(x.state,cloneState(this.state)); return x; }
}
