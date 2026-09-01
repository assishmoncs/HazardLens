import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewerSimulation } from './sim.js';
import type { FaultMode, InterventionMode } from './sim.js';
import { WorldRenderer } from './worldRenderer.js';
import { TwinInspector } from './inspector.js';
import { createFacility } from './facility.js';
import { FacilityGraph } from './facilityGraph.js';

const app = document.getElementById('app')!;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);
scene.fog = new THREE.Fog(0x05070b, 45, 150);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(32, 22, 38);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(10, 2, 2);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xcfe7ff, 0x202020, 1.7));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(15, 25, 10);
scene.add(light);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 100), new THREE.MeshStandardMaterial({ color: 0x111820 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
createFacility(scene);

const facility = new FacilityGraph();
const sim = new ViewerSimulation();
const world = new WorldRenderer(scene);
const inspector = new TwinInspector();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const style = 'position:fixed;z-index:10;color:#eaf6ff;background:rgba(5,12,18,.94);border:1px solid #294658;box-shadow:0 14px 40px rgba(0,0,0,.35);backdrop-filter:blur(10px);font:12px/1.4 Inter,system-ui,sans-serif';
const panel = document.createElement('div');
panel.style.cssText = `${style};right:18px;top:18px;width:310px;padding:16px;border-radius:16px;max-height:calc(100vh - 36px);overflow:auto`;
document.body.appendChild(panel);
const header = document.createElement('div');
header.innerHTML = '<div style="font-size:17px;font-weight:800;letter-spacing:.04em">HAZARDLENS</div><div style="opacity:.58;margin-top:2px">TACTICAL INCIDENT CONSOLE</div>';
panel.appendChild(header);

function section(title: string, icon: string) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px solid #1f3441';
  const h = document.createElement('div');
  h.innerHTML = `<span style="opacity:.8">${icon}</span> <b>${title}</b>`;
  h.style.cssText = 'font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px';
  wrap.appendChild(h); panel.appendChild(wrap); return wrap;
}
function selectControl(parent: HTMLElement, options: { value: string; label: string }[], initial?: string) {
  const s = document.createElement('select');
  s.style.cssText = 'width:100%;padding:8px 9px;border-radius:9px;background:#0c1923;color:#fff;border:1px solid #355266;outline:none';
  for (const option of options) { const o = document.createElement('option'); o.value = option.value; o.textContent = option.label; s.appendChild(o); }
  if (initial) s.value = initial; parent.appendChild(s); return s;
}
function actionButton(parent: HTMLElement, text: string, fn: () => void, emphasis = false) {
  const b = document.createElement('button'); b.textContent = text; b.onclick = fn;
  b.style.cssText = `padding:8px 9px;border-radius:9px;border:1px solid ${emphasis ? '#9b5327' : '#355266'};background:${emphasis ? '#3a1e13' : '#0e1b25'};color:#fff;cursor:pointer;font-weight:700`;
  parent.appendChild(b); return b;
}

const incident = section('Disturbance', '⚠');
const assetSelect = selectControl(incident, [
  { value: 'P-17', label: 'Pipe P-17' }, { value: 'P-18', label: 'Pipe P-18' },
  { value: 'T-04', label: 'Tank T-04' }, { value: 'T-05', label: 'Tank T-05' },
  { value: 'V-01', label: 'Pressure Vessel V-01' }, { value: 'R-01', label: 'Reactor R-01' },
  { value: 'HX-01', label: 'Heat Exchanger HX-01' }, { value: 'V-17', label: 'Valve V-17' },
  { value: 'PUMP-01', label: 'Pump 01' }, { value: 'COMP-01', label: 'Compressor 01' },
  { value: 'W-07', label: 'Wall W-07' }, { value: 'COL-01', label: 'Column 01' }, { value: 'WIN-01', label: 'Window 01' }
]);
const faultSelect = selectControl(incident, [
  { value: 'leak', label: 'Leak' }, { value: 'rupture', label: 'Full rupture' }, { value: 'fire', label: 'Ignition / fire' },
  { value: 'overheat', label: 'Overheating' }, { value: 'overpressure', label: 'Overpressure' },
  { value: 'valve_fail', label: 'Valve failure' }, { value: 'pump_fail', label: 'Pump / compressor failure' },
  { value: 'power_loss', label: 'Power loss' }, { value: 'structural_damage', label: 'Structural damage' }
]);
const severityRow = document.createElement('div'); severityRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px';
const severity = document.createElement('input'); severity.type='range'; severity.min='0.1'; severity.max='1'; severity.step='0.1'; severity.value='0.6'; severity.style.width='100%';
const sevValue = document.createElement('b'); sevValue.textContent='60%'; sevValue.style.minWidth='32px';
severity.oninput = () => sevValue.textContent = `${Math.round(Number(severity.value)*100)}%`; severityRow.append(severity, sevValue); incident.appendChild(severityRow);
const windRow = document.createElement('div'); windRow.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px'; incident.appendChild(windRow);
const windSelect = selectControl(windRow, [{value:'East',label:'Wind → East'},{value:'West',label:'Wind → West'},{value:'North',label:'Wind → North'},{value:'South',label:'Wind → South'}], 'East');
const inject = actionButton(windRow, 'INJECT DISTURBANCE', () => {
  const winds: Record<string,[number,number]> = { East:[3,0], West:[-3,0], North:[0,-3], South:[0,3] };
  const [windX, windZ] = winds[windSelect.value];
  sim.injectIncident({ assetId: assetSelect.value, mode: faultSelect.value as FaultMode, severity:Number(severity.value), windX, windZ });
}, true); inject.style.gridColumn='1 / -1';

const response = section('Response actions', '✚');
const responseGrid = document.createElement('div'); responseGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:7px'; response.appendChild(responseGrid);
for (const [text, mode] of [['ISOLATE','isolate'],['COOL EXPOSED','cool'],['SUPPRESS FIRE','suppress'],['EVACUATE','evacuate'],['EMERGENCY SHUTDOWN','shutdown'],['FIRE MONITOR','fire_monitor']] as [string, InterventionMode][]) actionButton(responseGrid, text, () => sim.intervene(mode));

const playback = section('Simulation', '◉');
const playbackGrid = document.createElement('div'); playbackGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px'; playback.appendChild(playbackGrid);
actionButton(playbackGrid, 'PAUSE', () => sim.running = false);
actionButton(playbackGrid, 'RESUME', () => sim.running = true);
actionButton(playbackGrid, 'RESET', () => { sim.reset(); inspector.show(); });
const speed = selectControl(playback, [{value:'0.5',label:'0.5× speed'},{value:'1',label:'1× speed'},{value:'2',label:'2× speed'},{value:'4',label:'4× speed'}], '1'); speed.onchange=()=>sim.speed=Number(speed.value);

const hint = document.createElement('div'); hint.style.cssText='margin-top:10px;padding:9px;border-radius:9px;background:#0b1620;color:#9eb8c8'; hint.textContent='Tip: select any asset, change the disturbance, and inject. The 3D state will evolve from the simulation.'; playback.appendChild(hint);

const hud = document.createElement('div'); hud.style.cssText = `${style};left:18px;top:18px;min-width:210px;padding:14px;border-radius:14px`; document.body.appendChild(hud);
const eventFeed = document.createElement('div'); eventFeed.style.cssText = `${style};left:18px;bottom:18px;width:320px;padding:12px;border-radius:14px;max-height:190px;overflow:hidden`; document.body.appendChild(eventFeed);

renderer.domElement.addEventListener('pointerdown', e => { pointer.x=e.clientX/innerWidth*2-1; pointer.y=-(e.clientY/innerHeight)*2+1; const selected=world.pick(raycaster,camera,pointer); if(selected){ const zone=facility.findZone(selected.id); selected.metadata.zone=zone?.name??'unassigned'; selected.metadata.connections=facility.neighbors(selected.id).join(','); } inspector.show(selected); });
let last=performance.now();
function frame(now:number){ requestAnimationFrame(frame); const dt=(now-last)/1000; last=now; sim.update(dt); const snap=sim.snapshot(); world.sync(snap);
  const activeFires=snap.twins.filter(t=>t.kind==='fire'&&t.active).length; const activeReleases=snap.twins.filter(t=>t.kind==='release'&&t.active).length; const failed=snap.twins.filter(t=>!t.active&&!['fire','release'].includes(t.kind)).length; const risk=Math.min(999,activeFires*18+activeReleases*12+failed*20);
  const incident=sim.getIncident(); hud.innerHTML=`<div style="font-weight:800;font-size:14px">HAZARDLENS</div><div style="opacity:.6">${sim.running?'SIMULATION RUNNING':'SIMULATION PAUSED'}</div><div style="margin-top:8px">TIME <b>${snap.time.toFixed(1)}s</b></div><div>FIRES <b>${activeFires}</b> &nbsp; RELEASES <b>${activeReleases}</b></div><div>FAILED <b>${failed}</b> &nbsp; RISK <b>${risk.toFixed(0)}</b></div>${incident?`<div style="margin-top:7px;opacity:.7">LAST: ${incident.assetId} · ${incident.mode.toUpperCase()}</div>`:''}`;
  const recent=snap.events.slice(-6).reverse(); eventFeed.innerHTML=`<div style="font-weight:800;margin-bottom:6px">LIVE EVENT STREAM</div>${recent.length?recent.map(e=>`<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.82">${e.type}</div>`).join(''):'<div style="opacity:.5">Awaiting incident…</div>'}`;
  controls.update(); renderer.render(scene,camera);
}
requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
