import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewerSimulation } from './sim.js';
import { WorldRenderer } from './worldRenderer.js';
import { TwinInspector } from './inspector.js';
import { createFacility } from './facility.js';
import { FacilityGraph } from './facilityGraph.js';

const app=document.getElementById('app')!;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x05070b); scene.fog=new THREE.Fog(0x05070b,35,80);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,1000); camera.position.set(24,18,28);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); app.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.target.set(8,1,0); controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xcfe7ff,0x202020,1.7)); const light=new THREE.DirectionalLight(0xffffff,2); light.position.set(15,25,10); scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(70,50),new THREE.MeshStandardMaterial({color:0x111820})); ground.rotation.x=-Math.PI/2; scene.add(ground);
createFacility(scene);
const facility=new FacilityGraph();
const sim=new ViewerSimulation(); const world=new WorldRenderer(scene); const inspector=new TwinInspector(); const raycaster=new THREE.Raycaster(); const pointer=new THREE.Vector2();
const hud=document.createElement('div'); hud.style.cssText='position:fixed;left:18px;top:18px;color:white;background:#071019dd;padding:14px;border-radius:14px;z-index:5'; document.body.appendChild(hud);
const actions=document.createElement('div'); actions.style.cssText='position:fixed;left:18px;bottom:18px;z-index:5;display:flex;gap:8px'; document.body.appendChild(actions);
function button(label:string,fn:()=>void){const b=document.createElement('button');b.textContent=label;b.onclick=fn;actions.appendChild(b)}
button('BREAK P-17',()=>sim.breakPipe()); button('INTERVENE',()=>sim.suppress()); button('RESET',()=>{sim.reset();inspector.show()});
renderer.domElement.addEventListener('pointerdown',e=>{pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;const selected=world.pick(raycaster,camera,pointer);if(selected){const zone=facility.findZone(selected.id);selected.metadata.zone=zone?.name??'unassigned';selected.metadata.connections=facility.neighbors(selected.id).join(',');}inspector.show(selected);});
let last=performance.now(); function frame(now:number){requestAnimationFrame(frame);const dt=(now-last)/1000;last=now;sim.update(dt);const snap=sim.snapshot();world.sync(snap);hud.innerHTML=`<b>HAZARDLENS</b><br/>FACILITY ONLINE<br/>TIME ${snap.time.toFixed(1)}s<br/>FIRES ${snap.twins.filter(t=>t.kind==='fire').length}<br/>RELEASES ${snap.twins.filter(t=>t.kind==='release').length}`;controls.update();renderer.render(scene,camera)} requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
