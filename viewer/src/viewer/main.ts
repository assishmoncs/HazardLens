import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewerSimulation } from './sim.js';
import type { FaultMode } from './sim.js';
import { WorldRenderer } from './worldRenderer.js';
import { TwinInspector } from './inspector.js';
import { createFacility } from './facility.js';
import { FacilityGraph } from './facilityGraph.js';

const app=document.getElementById('app')!;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x05070b); scene.fog=new THREE.Fog(0x05070b,45,140);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,1000); camera.position.set(24,18,28);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); app.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.target.set(8,1,0); controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xcfe7ff,0x202020,1.7)); const light=new THREE.DirectionalLight(0xffffff,2); light.position.set(15,25,10); scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(110,90),new THREE.MeshStandardMaterial({color:0x111820})); ground.rotation.x=-Math.PI/2; scene.add(ground);
createFacility(scene);
const facility=new FacilityGraph();
const sim=new ViewerSimulation(); const world=new WorldRenderer(scene); const inspector=new TwinInspector(); const raycaster=new THREE.Raycaster(); const pointer=new THREE.Vector2();

const panel=document.createElement('div'); panel.style.cssText='position:fixed;right:18px;top:18px;width:260px;color:#eef7ff;background:#071019ee;border:1px solid #2e4b5c;padding:14px;border-radius:14px;z-index:6;font:12px/1.45 Inter,system-ui,sans-serif'; document.body.appendChild(panel);
const title=document.createElement('div'); title.innerHTML='<b style="font-size:16px">INCIDENT CONTROL</b><div style="opacity:.65">Judge Console</div>'; panel.appendChild(title);
const label=(text:string)=>{const x=document.createElement('div');x.textContent=text;x.style.cssText='margin-top:10px;margin-bottom:4px;opacity:.7';panel.appendChild(x);return x};
const select=(options:string[])=>{const s=document.createElement('select');s.style.cssText='width:100%;padding:7px;border-radius:8px;background:#0e1a24;color:#fff;border:1px solid #355063';for(const o of options){const op=document.createElement('option');op.value=o;op.textContent=o;s.appendChild(op)}panel.appendChild(s);return s};
const assetSelect=select(['P-17','P-18','T-04','T-05']); label('FAULT'); const faultSelect=select(['leak','rupture','overheat','failure']); label('SEVERITY');
const severity=document.createElement('input'); severity.type='range'; severity.min='0.1'; severity.max='1'; severity.step='0.1'; severity.value='0.5'; severity.style.width='100%';panel.appendChild(severity);
const sevValue=document.createElement('div');sevValue.textContent='0.5';sevValue.style.textAlign='right';panel.appendChild(sevValue);severity.oninput=()=>sevValue.textContent=severity.value;
label('WIND'); const wind=select(['East','West','North','South']);
const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px';panel.appendChild(row);
function ctl(labelText:string,fn:()=>void){const b=document.createElement('button');b.textContent=labelText;b.onclick=fn;b.style.cssText='padding:8px;border-radius:8px;border:1px solid #355063;background:#11202b;color:#fff;cursor:pointer';row.appendChild(b);return b}
ctl('INJECT',()=>{const winds:Record<string,[number,number]>={East:[3,0],West:[-3,0],North:[0,-3],South:[0,3]};const [windX,windZ]=winds[wind.value];sim.injectIncident({assetId:assetSelect.value,mode:faultSelect.value as FaultMode,severity:Number(severity.value),windX,windZ});});
ctl('RESET',()=>{sim.reset();inspector.show()});
const actions=document.createElement('div'); actions.style.cssText='margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px'; panel.appendChild(actions);
function actionButton(labelText:string,fn:()=>void){const b=document.createElement('button');b.textContent=labelText;b.onclick=fn;b.style.cssText='padding:7px;border-radius:8px;border:1px solid #355063;background:#0e1821;color:#cfe7ff;cursor:pointer';actions.appendChild(b)}
actionButton('ISOLATE',()=>sim.intervene('isolate')); actionButton('COOL',()=>sim.intervene('cool')); actionButton('SUPPRESS',()=>sim.intervene('suppress')); actionButton('EVACUATE',()=>sim.intervene('evacuate'));

const hud=document.createElement('div'); hud.style.cssText='position:fixed;left:18px;top:18px;color:white;background:#071019dd;border:1px solid #2e4b5c;padding:14px;border-radius:14px;z-index:5'; document.body.appendChild(hud);
renderer.domElement.addEventListener('pointerdown',e=>{pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;const selected=world.pick(raycaster,camera,pointer);if(selected){const zone=facility.findZone(selected.id);selected.metadata.zone=zone?.name??'unassigned';selected.metadata.connections=facility.neighbors(selected.id).join(',');}inspector.show(selected);});
let last=performance.now(); function frame(now:number){requestAnimationFrame(frame);const dt=(now-last)/1000;last=now;sim.update(dt);const snap=sim.snapshot();world.sync(snap);hud.innerHTML=`<b>HAZARDLENS</b><br/>FACILITY ONLINE<br/>TIME ${snap.time.toFixed(1)}s<br/>FIRES ${snap.twins.filter(t=>t.kind==='fire'&&t.active).length}<br/>RELEASES ${snap.twins.filter(t=>t.kind==='release'&&t.active).length}<br/>FAILED ${snap.twins.filter(t=>!t.active&&t.kind!=='fire'&&t.kind!=='release').length}`;controls.update();renderer.render(scene,camera)} requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
