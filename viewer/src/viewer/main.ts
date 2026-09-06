import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ViewerSimulation } from './sim.js';
import type { FaultMode, InterventionMode } from './sim.js';
import { WorldRenderer } from './worldRenderer.js';
import { TwinInspector } from './inspector.js';
import { createFacility } from './facility.js';
import { FacilityGraph } from './facilityGraph.js';
import { createIndustrialEnvironment } from './sceneEnvironment.js';
import { CHEMICAL_DATABASE } from '../../../src/models/substances.js';
import { estimateThermalThreatZones } from '../../../src/models/threatZones.js';
import type { TwinState } from '../../../src/core/types.js';

const app = document.getElementById('app')!;
const scene = new THREE.Scene();
createIndustrialEnvironment(scene);
scene.fog = new THREE.Fog(0x182127, 75, 185);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(46, 32, 56);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.65, 0.82));
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(8, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2 - 0.04;

createFacility(scene);

const facility = new FacilityGraph();
const sim = new ViewerSimulation();
const world = new WorldRenderer(scene);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let selectedTwinId: string | null = null;

const style = document.createElement('style');
style.textContent = `
  :root { --bg:#03070b; --glass:rgba(7,15,22,.78); --line:rgba(122,175,204,.2); --cyan:#55d7ff; --orange:#ff9b47; --red:#ff5f56; --green:#5fe3a1; --text:#eef8ff; --muted:#8ea6b6; --shadow:0 18px 60px rgba(0,0,0,.34); }
  *{box-sizing:border-box} html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  button,select,input{font:inherit} button{transition:transform .16s ease,border-color .16s ease,background .16s ease,box-shadow .16s ease} button:hover{transform:translateY(-1px);border-color:rgba(85,215,255,.55)!important;box-shadow:0 8px 22px rgba(0,0,0,.18)} select:focus,input:focus{outline:none;border-color:rgba(85,215,255,.55);box-shadow:0 0 0 3px rgba(85,215,255,.09)}
  .hl-glass{background:linear-gradient(145deg,rgba(15,27,38,.82),rgba(4,10,15,.76));border:1px solid var(--line);box-shadow:var(--shadow),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(18px) saturate(130%);-webkit-backdrop-filter:blur(18px) saturate(130%);border-radius:18px}
  .hl-card{overflow:hidden;min-width:0;flex:0 0 auto}.hl-summary{list-style:none;cursor:pointer;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:48px}.hl-summary::-webkit-details-marker{display:none}.hl-summary::after{content:'+';color:var(--muted);font-size:16px;flex:0 0 auto}details[open]>.hl-summary::after{content:'−';color:var(--cyan)}
  .hl-body{padding:0 14px 14px;min-width:0}.hl-body>*+*{margin-top:8px}.hl-kicker{color:var(--muted);text-transform:uppercase;letter-spacing:.12em;font-size:9.5px}.hl-section-title{font-weight:800;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
  .hl-grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.hl-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.hl-grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
  .hl-control{width:100%;min-width:0;padding:8px 10px;border-radius:10px;border:1px solid rgba(125,171,199,.22);background:rgba(5,13,20,.75);color:var(--text);font-size:11px}
  .hl-btn{width:100%;min-width:0;min-height:36px;padding:8px 10px;border-radius:10px;border:1px solid rgba(125,171,199,.18);background:rgba(11,24,33,.86);color:var(--text);font-weight:750;cursor:pointer;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.15;white-space:normal;font-size:10px}
  .hl-btn-primary{background:linear-gradient(180deg,rgba(255,119,57,.25),rgba(117,31,12,.42));border-color:rgba(255,128,65,.72);box-shadow:0 0 22px rgba(255,108,45,.2)}
  .hl-btn-green{border-color:rgba(95,227,161,.35);background:rgba(14,36,28,.8)}
  .hl-btn-cyan{border-color:rgba(85,215,255,.38);background:rgba(10,30,42,.8)}
  .hl-btn-alert{border-color:rgba(255,95,86,.45);background:rgba(42,12,12,.8)}
  .hl-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:10px}
  .hl-metric{padding:9px 10px;min-width:0}.hl-metric-value{font-size:18px;font-weight:850;line-height:1;margin-top:4px}.hl-metric-label{color:var(--muted);font-size:8.5px;letter-spacing:.09em;text-transform:uppercase}
  .hl-cascade{display:flex;align-items:center;gap:6px;overflow-x:auto;overflow-y:hidden;padding:10px 12px 6px;scrollbar-width:thin;min-width:0}
  .hl-node{white-space:nowrap;border-radius:999px;padding:6px 9px;font:700 9.5px/1 ui-monospace,monospace;border:1px solid rgba(85,215,255,.24);background:rgba(12,34,44,.82);color:#cdeffd;flex:0 0 auto}
  .hl-node.warn{border-color:rgba(255,155,71,.42);background:rgba(66,39,20,.64);color:#ffd9b7}
  .hl-node.critical{border-color:rgba(255,95,86,.56);background:rgba(65,18,17,.72);color:#ffd0cd}
  .hl-arrow{color:#557889;font-size:13px;flex:0 0 auto}
  .hl-riskbar{margin:0 12px 12px;padding:8px 10px;border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(5,12,18,.65);border:1px solid var(--line)}
  .hl-risk-low{color:var(--green)}.hl-risk-escalate{color:var(--orange)}.hl-risk-critical{color:var(--red)}
  .hl-feed{display:grid;gap:5px;min-width:0}
  .hl-log{display:grid;grid-template-columns:44px 72px minmax(0,1fr);gap:6px;font:9.5px/1.3 ui-monospace,monospace;color:#bfd3de;min-width:0}
  .hl-log span:last-child{min-width:0;overflow-wrap:anywhere}.hl-log-time{color:#6f8796}
  .hl-tag{border-radius:999px;padding:2px 5px;text-align:center;font-size:8.5px;font-weight:800}
  .hl-tag-info{background:rgba(85,167,255,.13);color:#9bc9ff}.hl-tag-warning{background:rgba(255,155,71,.14);color:#ffbf86}.hl-tag-cascade{background:rgba(255,95,86,.16);color:#ff9d97}.hl-tag-intervention{background:rgba(95,227,161,.13);color:#98f1c2}
  .hl-brand{display:flex;align-items:center;gap:9px;min-width:0}
  .hl-dot{width:9px;height:9px;border-radius:50%;background:var(--cyan);box-shadow:0 0 16px rgba(85,215,255,.8);flex:0 0 auto}
  .hl-scroll{flex:1 1 auto;min-height:0;min-width:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(85,215,255,.28) transparent}
  .hl-scroll::-webkit-scrollbar{width:6px}
  .hl-scroll::-webkit-scrollbar-thumb{background:rgba(85,215,255,.24);border-radius:999px}
  .hl-alarm-banner{padding:4px 10px;border-radius:8px;font:700 9.5px ui-monospace,monospace;display:flex;align-items:center;gap:8px;letter-spacing:.06em}
  .hl-alarm-banner.normal{background:rgba(95,227,161,.12);color:#5fe3a1;border:1px solid rgba(95,227,161,.28)}
  .hl-alarm-banner.warning{background:rgba(255,155,71,.16);color:#ff9b47;border:1px solid rgba(255,155,71,.35);animation:pulse 1.6s infinite}
  .hl-alarm-banner.critical{background:rgba(255,95,86,.22);color:#ff5f56;border:1px solid rgba(255,95,86,.5);animation:pulse .8s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
`;
document.head.appendChild(style);

function text(value: string, muted = false) {
  const el = document.createElement('div');
  el.textContent = value;
  if (muted) el.style.color = 'var(--muted)';
  return el;
}
function selectControl(options: { value: string; label: string }[], initial?: string) {
  const s = document.createElement('select');
  s.className = 'hl-control';
  for (const option of options) {
    const o = document.createElement('option');
    o.value = option.value;
    o.textContent = option.label;
    s.appendChild(o);
  }
  if (initial) s.value = initial;
  return s;
}
function button(label: string, fn: () => void, variant = '') {
  const b = document.createElement('button');
  b.textContent = label;
  b.className = `hl-btn ${variant}`.trim();
  b.onclick = fn;
  return b;
}
function card(title: string, subtitle = '', open = true) {
  const d = document.createElement('details');
  d.className = 'hl-glass hl-card';
  d.open = open;
  const summary = document.createElement('summary');
  summary.className = 'hl-summary';
  const left = document.createElement('div');
  left.innerHTML = `<div class="hl-section-title">${title}</div>${subtitle ? `<div class="hl-kicker" style="margin-top:2px">${subtitle}</div>` : ''}`;
  summary.appendChild(left);
  d.appendChild(summary);
  const body = document.createElement('div');
  body.className = 'hl-body';
  d.appendChild(body);
  return { root: d, body };
}

// Top Bar Header
const topBar = document.createElement('div');
topBar.className = 'hl-glass';
topBar.style.cssText =
  'position:fixed;left:18px;right:18px;top:16px;height:58px;z-index:20;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:15px;min-width:0';
document.body.appendChild(topBar);

const brand = document.createElement('div');
brand.className = 'hl-brand';
brand.innerHTML =
  '<span class="hl-dot"></span><div><div style="font-size:15px;font-weight:900;letter-spacing:.05em">HAZARDLENS · DIGITAL TWIN</div><div class="hl-kicker">DER-02: THREAT-ZONE ESTIMATION & EXPLOSION RESPONSE PLATFORM</div></div>';
topBar.appendChild(brand);

const alarmAnnunciator = document.createElement('div');
alarmAnnunciator.className = 'hl-alarm-banner normal';
alarmAnnunciator.innerHTML = '● PLANT SCADA NORMAL · ALL SAFETY BARRIERS SECURE';
topBar.appendChild(alarmAnnunciator);

// Left Panel: Disturbance Injection & Plant Interventions
const leftRail = document.createElement('div');
leftRail.style.cssText =
  'position:fixed;left:18px;top:86px;bottom:18px;width:340px;height:auto;z-index:15;display:flex;flex-direction:column;gap:10px;pointer-events:none;min-height:0';
document.body.appendChild(leftRail);

const leftInner = document.createElement('div');
leftInner.className = 'hl-scroll';
leftInner.style.cssText = 'display:flex;flex-direction:column;gap:10px;pointer-events:auto;padding-right:4px';
leftRail.appendChild(leftInner);

// 1. Primary Disturbance Injector
const disturbance = card('Process Disturbance', 'Inject Initiating Event', true);
leftInner.appendChild(disturbance.root);

const assetSelect = selectControl([
  { value: 'S-01', label: 'S-01 · LPG HORTON SPHERE (BLEVE)' },
  { value: 'C-01', label: 'C-01 · DISTILLATION COLUMN' },
  { value: 'P-17', label: 'PIPE P-17 · HYDROCARBON FEED' },
  { value: 'P-18', label: 'PIPE P-18 · PROCESS RUN' },
  { value: 'T-04', label: 'TANK T-04 · PROPANE STORAGE' },
  { value: 'T-05', label: 'TANK T-05 · CRUDE STORAGE' },
  { value: 'V-01', label: 'VESSEL V-01 · TOXIC AMMONIA' },
  { value: 'R-01', label: 'REACTOR R-01 · CHEMICAL PROCESS' },
  { value: 'HX-01', label: 'HX-01 · HEAT EXCHANGER' },
  { value: 'PUMP-01', label: 'PUMP-01 · CHARGE PUMP' },
  { value: 'COMP-01', label: 'COMP-01 · GAS COMPRESSOR' },
  { value: 'V-17', label: 'VALVE V-17 · ISOLATION SKID' },
  { value: 'FL-01', label: 'FL-01 · FLARE STACK' },
  { value: 'M-04', label: 'M-04 · ELECTRICAL IGNITION' },
  { value: 'W-07', label: 'WALL W-07 · BLAST BARRIER' }
]);
disturbance.body.appendChild(text('TARGET INDUSTRIAL ASSET', true));
disturbance.body.appendChild(assetSelect);

const chemSelect = selectControl([
  { value: 'propane', label: 'CHEMICAL: PROPANE (LPG)' },
  { value: 'methane', label: 'CHEMICAL: METHANE (NATURAL GAS)' },
  { value: 'ammonia', label: 'CHEMICAL: ANHYDROUS AMMONIA (TOXIC)' },
  { value: 'hydrogen', label: 'CHEMICAL: COMPRESSED HYDROGEN' },
  { value: 'crude_oil', label: 'CHEMICAL: LIGHT CRUDE OIL' }
], 'propane');
disturbance.body.appendChild(chemSelect);

const faultSelect = selectControl([
  { value: 'bleve', label: 'BLEVE · THERMAL VESSEL RUPTURE' },
  { value: 'rupture', label: 'RUPTURE · CATASTROPHIC RELEASE' },
  { value: 'leak', label: 'LEAK · ORIFICE LOSS OF CONTAINMENT' },
  { value: 'fire', label: 'IGNITION · DIRECT JET / POOL FIRE' },
  { value: 'toxic_release', label: 'TOXIC DISPERSION (AMMONIA PLUME)' },
  { value: 'overheat', label: 'OVERHEAT · THERMAL RUNAWAY' },
  { value: 'overpressure', label: 'OVERPRESSURE · VESSEL EXCURSION' },
  { value: 'valve_fail', label: 'VALVE FAILURE · UNCONTAINED FLOW' },
  { value: 'pump_fail', label: 'PUMP FAILURE · MECHANICAL SEAL' },
  { value: 'power_loss', label: 'TOTAL SUBSTATION POWER LOSS' },
  { value: 'structural_damage', label: 'STRUCTURAL COMPONENT DAMAGE' }
]);
disturbance.body.appendChild(text('DISTURBANCE MODE', true));
disturbance.body.appendChild(faultSelect);

const severityWrap = document.createElement('div');
severityWrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px;min-width:0';
severityWrap.appendChild(text('SEVERITY', true));
const severity = document.createElement('input');
severity.type = 'range';
severity.min = '0.1';
severity.max = '1';
severity.step = '0.1';
severity.value = '0.7';
severity.style.flex = '1';
severity.style.minWidth = '0';
const sevValue = document.createElement('b');
sevValue.textContent = '70%';
severity.oninput = () => (sevValue.textContent = `${Math.round(Number(severity.value) * 100)}%`);
severityWrap.append(severity, sevValue);
disturbance.body.appendChild(severityWrap);

const windRow = document.createElement('div');
windRow.className = 'hl-grid2';
const windSelect = selectControl(
  [
    { value: 'East', label: 'WIND → EAST' },
    { value: 'West', label: 'WIND → WEST' },
    { value: 'North', label: 'WIND → NORTH' },
    { value: 'South', label: 'WIND → SOUTH' }
  ],
  'East'
);
const weatherSelect = selectControl(
  [
    { value: 'stable', label: 'ATMOSPHERE: STABLE (F)' },
    { value: 'neutral', label: 'ATMOSPHERE: NEUTRAL (D)' },
    { value: 'unstable', label: 'ATMOSPHERE: UNSTABLE (A)' }
  ],
  'neutral'
);
windRow.append(windSelect, weatherSelect);
disturbance.body.appendChild(windRow);

const inject = button(
  '⚠  INJECT INCIDENT INTO EVENT FABRIC',
  () => {
    const winds: Record<string, [number, number]> = {
      East: [3.5, 0],
      West: [-3.5, 0],
      North: [0, -3.5],
      South: [0, 3.5]
    };
    const [windX, windZ] = winds[windSelect.value];
    sim.injectIncident({
      assetId: assetSelect.value,
      mode: faultSelect.value as FaultMode,
      severity: Number(severity.value),
      windX,
      windZ,
      chemical: chemSelect.value
    });
  },
  'hl-btn-primary'
);
disturbance.body.appendChild(inject);

// 2. Safety Systems & Emergency Countermeasures
const response = card('Emergency Interventions', 'Execute Mitigations', true);
leftInner.appendChild(response.root);
const responseGrid = document.createElement('div');
responseGrid.className = 'hl-grid2';

const interventions: [string, InterventionMode, string][] = [
  ['NFPA 15 DELUGE SPRAY', 'deluge', 'hl-btn-green'],
  ['FLARE BLOWDOWN', 'blowdown', 'hl-btn-cyan'],
  ['ISOLATE INVENTORY', 'isolate', 'hl-btn-cyan'],
  ['WATER CURTAIN COOL', 'cool', 'hl-btn-cyan'],
  ['SUPPRESS ACTIVE FIRE', 'suppress', 'hl-btn-green'],
  ['EVACUATE TO MUSTER', 'evacuate', 'hl-btn-alert'],
  ['EMERGENCY SHUTDOWN', 'shutdown', 'hl-btn-alert'],
  ['REMOTE FIRE MONITOR', 'fire_monitor', '']
];

for (const [label, mode, cls] of interventions) {
  responseGrid.appendChild(button(label, () => sim.intervene(mode), cls));
}
response.body.appendChild(responseGrid);

// 3. Simulation & Threat-Zone Overlays
const simControls = card('Runtime & DER-02 Overlays', 'Visual Diagnostics', true);
leftInner.appendChild(simControls.root);
const simGrid = document.createElement('div');
simGrid.className = 'hl-grid3';
simGrid.appendChild(button('PAUSE', () => (sim.running = false)));
simGrid.appendChild(button('RESUME', () => (sim.running = true), 'hl-btn-cyan'));
simGrid.appendChild(
  button('RESET', () => {
    sim.reset();
    selectedTwinId = null;
    inspector.show();
  })
);
simControls.body.appendChild(simGrid);

const tzBtn = button('TOGGLE DER-02 THREAT ZONES', () => {
  world.showThreatZones = !world.showThreatZones;
  tzBtn.textContent = world.showThreatZones ? 'HIDE DER-02 THREAT ZONES' : 'SHOW DER-02 THREAT ZONES';
}, 'hl-btn-cyan');
simControls.body.appendChild(tzBtn);

// 4. Live Domino Cascade Propagation
const cascadeCard = card('Domino Cascade Chain', 'Physical Consequence Vector', true);
leftInner.appendChild(cascadeCard.root);
const cascade = document.createElement('div');
cascade.className = 'hl-cascade';
cascade.innerHTML = '<div class="hl-kicker">Awaiting disturbance injection…</div>';
cascadeCard.body.appendChild(cascade);

const riskBar = document.createElement('div');
riskBar.className = 'hl-riskbar';
riskBar.innerHTML = '<span class="hl-kicker">DOMINO ESCALATION RISK</span><b class="hl-risk-low">LOW</b>';
cascadeCard.body.appendChild(riskBar);

// Right Panel: Live Event Feed & Interactive Twin Inspector
const rightRail = document.createElement('div');
rightRail.style.cssText =
  'position:fixed;right:18px;top:86px;bottom:18px;width:360px;height:auto;z-index:15;display:flex;flex-direction:column;gap:10px;pointer-events:none;min-height:0';
document.body.appendChild(rightRail);

const rightInner = document.createElement('div');
rightInner.className = 'hl-scroll';
rightInner.style.cssText = 'display:flex;flex-direction:column;gap:10px;pointer-events:auto;padding-left:4px';
rightRail.appendChild(rightInner);

// 5. Twin Inspector
const inspectorCard = card('Asset Digital Twin Telemetry', 'Click Any 3D Equipment to Inspect', true);
rightInner.appendChild(inspectorCard.root);

const inspector = new TwinInspector(inspectorCard.body, (action, assetId) => {
  if (action === 'isolate') {
    sim.runtime.emit({ type: 'valve.command', sourceId: 'operator', targetId: assetId, payload: { action: 'close' } });
  } else if (action === 'deluge') {
    sim.runtime.emit({ type: 'deluge.activated', sourceId: 'operator', targetId: assetId, payload: { rateKw: 900 } });
  } else if (action === 'blowdown') {
    sim.runtime.emit({ type: 'blowdown.command', sourceId: 'operator', targetId: assetId, payload: { destination: 'FL-01' } });
  }
});
inspector.show();

// 6. Live Causal Event Stream
const feedCard = card('Event Fabric Stream', 'Real-Time Telemetry & Alarms', true);
rightInner.appendChild(feedCard.root);
const eventFeed = document.createElement('div');
eventFeed.className = 'hl-feed';
feedCard.body.appendChild(eventFeed);

// Top KPI Metrics Bar
const metrics = document.createElement('div');
metrics.className = 'hl-metrics';
metrics.style.cssText += 'position:fixed;left:378px;right:396px;top:86px;z-index:14;';
document.body.appendChild(metrics);

const metricValues = new Map<string, HTMLElement>();
for (const [key, label] of [
  ['time', 'TIME'],
  ['fire', 'FIRES'],
  ['release', 'RELEASES'],
  ['bleve', 'BLEVE PROB.'],
  ['cascade', 'DOMINO ESC.'],
  ['personnel', 'PERSONNEL RISK']
]) {
  const m = document.createElement('div');
  m.className = 'hl-glass hl-metric';
  m.innerHTML = `<div class="hl-metric-label">${label}</div><div class="hl-metric-value">0</div>`;
  metrics.appendChild(m);
  metricValues.set(key, m.querySelector('.hl-metric-value') as HTMLElement);
}

const cascadeLabel = (eventType: string) => {
  const map: Record<string, string> = {
    'fault.pipe_leak': 'Pipe Leak',
    'fault.rupture': 'Rupture',
    'release.created': 'Vapor Cloud',
    'release.ignited': 'Ignition',
    'fire.created': 'Fire Escalation',
    'thermal.exposure': 'Thermal Load',
    'overpressure.received': 'Overpressure',
    'asset.degraded': 'Asset Degraded',
    'asset.failed': 'Secondary Failure',
    'bleve.occurred': 'BLEVE Explosion',
    'route.blocked': 'Egress Blocked',
    'deluge.activated': 'NFPA 15 Deluge',
    'blowdown.command': 'Flare Blowdown',
    'alarm.triggered': 'Safety Alarm',
    'suppression.command': 'Suppression',
    'cooling.command': 'Cooling',
    'valve.command': 'Isolation',
    'shutdown.command': 'ESD Trip',
    'evacuation.command': 'Muster Evac'
  };
  return map[eventType] ?? eventType.replaceAll('.', ' ');
};

const severityOf = (type: string) => {
  if (type.includes('bleve') || type.includes('asset.failed') || type.includes('fire') || type.includes('release.ignited')) {
    return ['CASCADE', 'critical'] as const;
  }
  if (type.includes('thermal') || type.includes('degraded') || type.includes('fault') || type.includes('release') || type.includes('alarm')) {
    return ['WARNING', 'warn'] as const;
  }
  if (type.includes('command') || type.includes('deluge')) {
    return ['INTERVENTION', ''] as const;
  }
  return ['INFO', ''] as const;
};

// Interactive Raycasting for 3D Twin Selection
renderer.domElement.addEventListener('pointerdown', e => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  const picked = world.pick(raycaster, camera, pointer);
  if (picked) {
    selectedTwinId = picked.id;
    const twinObj = sim.runtime.get(picked.id);
    if (twinObj) {
      const state = structuredClone(twinObj.state);
      const zone = facility.findZone(picked.id);
      state.metadata.zone = zone?.name ?? 'Process Unit';
      state.metadata.connections = facility.neighbors(picked.id).join(', ');
      inspector.show(state);
    }
  }
});

let last = performance.now();
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = (now - last) / 1000;
  last = now;

  sim.update(dt);
  const snap = sim.snapshot();
  world.sync(snap);

  // Dynamic Telemetry & Threat Metrics
  const activeFires = snap.twins.filter(t => t.kind === 'fire' && t.active).length;
  const activeReleases = snap.twins.filter(t => t.kind === 'release' && t.active).length;
  const failed = snap.twins.filter(t => !t.active && !['fire', 'release'].includes(t.kind)).length;
  const escalationEvents = snap.events.filter(e =>
    ['asset.failed', 'fire.created', 'release.ignited', 'overpressure.received', 'route.blocked', 'bleve.occurred'].includes(e.type)
  ).length;
  const personnelRisk = snap.twins
    .filter(t => t.kind === 'worker')
    .reduce((sum, t) => sum + Number(t.metadata.exposure ?? 0), 0);

  // BLEVE Risk Estimation across pressurized vessels
  const maxBleveRisk = snap.twins
    .filter(t => t.kind === 'sphere-tank' || t.kind === 'tank' || t.kind === 'pressure-vessel')
    .reduce((max, t) => Math.max(max, Number(t.metadata.bleveRisk ?? t.metadata.failureRisk ?? 0)), 0);

  const riskScore = activeFires * 18 + activeReleases * 12 + failed * 22 + escalationEvents * 5 + personnelRisk * 0.1;
  const riskLevel = riskScore >= 70 ? 'CRITICAL' : riskScore >= 28 ? 'ESCALATE' : 'LOW';
  const riskClass = riskScore >= 70 ? 'hl-risk-critical' : riskScore >= 28 ? 'hl-risk-escalate' : 'hl-risk-low';

  metricValues.get('time')!.textContent = `${snap.time.toFixed(1)}s`;
  metricValues.get('fire')!.textContent = String(activeFires);
  metricValues.get('release')!.textContent = String(activeReleases);
  metricValues.get('bleve')!.textContent = `${(maxBleveRisk * 100).toFixed(0)}%`;
  metricValues.get('cascade')!.textContent = String(escalationEvents);
  metricValues.get('personnel')!.textContent = personnelRisk > 40 ? 'HIGH' : personnelRisk > 10 ? 'MED' : 'LOW';

  riskBar.innerHTML = `<span class="hl-kicker">DOMINO ESCALATION INDEX · ${riskScore.toFixed(0)}</span><b class="${riskClass}">${riskLevel}</b>`;

  // Update SCADA Alarm Annunciator
  const activeAlarms = snap.events.filter(e => e.type === 'alarm.triggered' || e.type === 'bleve.occurred').slice(-3);
  if (snap.events.some(e => e.type === 'bleve.occurred')) {
    alarmAnnunciator.className = 'hl-alarm-banner critical';
    alarmAnnunciator.innerHTML = '🚨 CRITICAL: CATASTROPHIC BLEVE OCCURRED · EVACUATE TO MUSTER';
  } else if (activeAlarms.length > 0) {
    alarmAnnunciator.className = 'hl-alarm-banner warning';
    alarmAnnunciator.innerHTML = `⚠ ALARM TRIP: ${cascadeLabel(activeAlarms[activeAlarms.length - 1].type)} (${String(activeAlarms[activeAlarms.length - 1].sourceId)})`;
  } else if (activeFires > 0) {
    alarmAnnunciator.className = 'hl-alarm-banner critical';
    alarmAnnunciator.innerHTML = '🔥 ACTIVE PROCESS FIRE DETECTED · ENGAGE DELUGE / ESD';
  } else {
    alarmAnnunciator.className = 'hl-alarm-banner normal';
    alarmAnnunciator.innerHTML = '● PLANT SCADA NORMAL · ALL SAFETY BARRIERS SECURE';
  }

  // Live Inspector Telemetry sync for selected asset
  if (selectedTwinId) {
    const activeSelected = snap.twins.find(t => t.id === selectedTwinId);
    if (activeSelected) {
      const zone = facility.findZone(selectedTwinId);
      activeSelected.metadata.zone = zone?.name ?? 'Process Area';
      activeSelected.metadata.connections = facility.neighbors(selectedTwinId).join(', ');
      inspector.show(activeSelected);
    }
  }

  // Live Domino Cascade visualization nodes
  const cascadeEvents = snap.events
    .filter(e =>
      [
        'fault.pipe_leak', 'fault.rupture', 'release.created', 'release.ignited', 'fire.created',
        'thermal.exposure', 'overpressure.received', 'asset.degraded', 'asset.failed', 'bleve.occurred',
        'deluge.activated', 'blowdown.command', 'route.blocked'
      ].includes(e.type)
    )
    .slice(-6);

  if (cascadeEvents.length === 0) {
    cascade.innerHTML = '<div class="hl-kicker">Awaiting initiating disturbance…</div>';
  } else {
    cascade.innerHTML = '';
    cascadeEvents.forEach((e, i) => {
      const [, cls] = severityOf(e.type);
      const node = document.createElement('div');
      node.className = `hl-node ${cls}`;
      node.textContent = cascadeLabel(e.type);
      cascade.appendChild(node);
      if (i < cascadeEvents.length - 1) {
        const arrow = document.createElement('span');
        arrow.className = 'hl-arrow';
        arrow.textContent = '➜';
        cascade.appendChild(arrow);
      }
    });
  }

  // Event stream feed
  const recent = snap.events.slice(-10).reverse();
  eventFeed.innerHTML = recent.length
    ? recent
        .map(e => {
          const [tag] = severityOf(e.type);
          const tagClass =
            tag === 'CASCADE'
              ? 'hl-tag-cascade'
              : tag === 'WARNING'
                ? 'hl-tag-warning'
                : tag === 'INTERVENTION'
                  ? 'hl-tag-intervention'
                  : 'hl-tag-info';
          const stamp = `${e.time.toFixed(1)}s`;
          const msg = `${cascadeLabel(e.type)}${e.targetId ? ` · ${e.targetId}` : ''}`;
          return `<div class="hl-log"><span class="hl-log-time">${stamp}</span><span class="hl-tag ${tagClass}">${tag}</span><span>${msg}</span></div>`;
        })
        .join('')
    : '<div class="hl-kicker">Awaiting incident…</div>';

  controls.update();
  composer.render();
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
