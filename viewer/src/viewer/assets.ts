import * as THREE from 'three';

const material = (color: number, metalness = .55, roughness = .38) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const detail = material(0x9aa7b2, .7, .28);

export function tankAsset() {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 4, 48), material(0x667685, .7, .3));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.78, .14, 48), material(0x8d9aa7, .65, .25)); top.position.y = 2.06;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.75, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), material(0x778896, .65, .3)); dome.position.y = 2.05;
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .7, 16), detail); nozzle.position.set(0, 2.55, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.02, .07, 12, 48), detail); ring.rotation.x = Math.PI / 2; ring.position.y = 1.35;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, .25, 48), material(0x3e4953, .8, .32)); base.position.y = -2.12;
  group.add(shell, top, dome, nozzle, ring, base); return group;
}

export function pressureVesselAsset() { const group = tankAsset(); group.scale.set(1.05, .85, 1.05); return group; }

export function pipeAsset(length = 8) {
  const group = new THREE.Group();
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, length, 24), material(0x9ba5ae, .72, .25)); pipe.rotation.z = Math.PI / 2;
  const joint = new THREE.Mesh(new THREE.TorusGeometry(.35, .08, 12, 24), detail); joint.rotation.y = Math.PI / 2;
  const support1 = new THREE.Mesh(new THREE.BoxGeometry(.18, .65, .18), detail); support1.position.set(-length * .28, -.38, 0);
  const support2 = support1.clone(); support2.position.x = length * .28; group.add(pipe, joint, support1, support2); return group;
}

export function wallAsset() {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 4, .35), material(0x58636d, .3, .7));
  const cap = new THREE.Mesh(new THREE.BoxGeometry(8.15, .1, .42), detail); cap.position.y = 2.05; group.add(wall, cap); return group;
}

export function valveAsset() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .75, 20), detail); body.rotation.z = Math.PI / 2;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .7, 12), detail); stem.position.y = .55;
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(.34, .07, 10, 24), material(0xc2ccd3, .7, .22)); wheel.rotation.x = Math.PI / 2; wheel.position.y = .9;
  group.add(body, stem, wheel); return group;
}

export function pumpAsset() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 1.5, 24), material(0x526372, .7, .32)); body.rotation.z = Math.PI / 2;
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, 1.05, 24), material(0x34424e, .8, .3)); motor.rotation.z = Math.PI / 2; motor.position.x = -.95;
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, .2, 1.15), material(0x36414b, .7, .45)); base.position.y = -.65; group.add(body, motor, base); return group;
}

export function heatExchangerAsset() {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 3.2, 28), material(0x697b88, .7, .28)); shell.rotation.z = Math.PI / 2;
  for (let x = -1.4; x <= 1.4; x += .7) { const band = new THREE.Mesh(new THREE.TorusGeometry(.62, .055, 10, 24), detail); band.rotation.y = Math.PI / 2; band.position.x = x; group.add(band); }
  group.add(shell); return group;
}

export function reactorAsset() { const group = tankAsset(); group.scale.set(1.25, 1.25, 1.25); return group; }

export function columnAsset() {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.22, .32, 6, 20), material(0x687986, .7, .3));
  const foot = new THREE.Mesh(new THREE.BoxGeometry(1, .3, 1), material(0x3c4851, .75, .4)); foot.position.y = -3.15;
  group.add(shaft, foot); return group;
}

export function windowAsset() {
  return new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, .08), new THREE.MeshStandardMaterial({ color: 0x5bb7cf, metalness: .2, roughness: .18, emissive: 0x15485a, emissiveIntensity: .3 }));
}

export function doorAsset() {
  const group = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, .12), material(0x33414b, .5, .5));
  const handle = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), detail); handle.position.set(.32, 0, -.08); group.add(slab, handle); return group;
}

export function routeAsset() {
  return new THREE.Mesh(new THREE.BoxGeometry(7, .06, 1.2), new THREE.MeshStandardMaterial({ color: 0x24506a, transparent: true, opacity: .72, emissive: 0x092331, emissiveIntensity: .4 }));
}

export function buildingAsset() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 8), material(0x303b45, .35, .62));
  const roof = new THREE.Mesh(new THREE.BoxGeometry(14.6, .35, 8.6), material(0x46545f, .7, .35)); roof.position.y = 2.68;
  for (let x = -5.2; x <= 5.2; x += 2.6) { const window = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, .08), new THREE.MeshStandardMaterial({ color: 0x5bb7cf, metalness: .25, roughness: .18, emissive: 0x15485a, emissiveIntensity: .35 })); window.position.set(x, .5, 4.04); group.add(window); }
  group.add(body, roof); return group;
}

export function hydrantAsset() { const group = new THREE.Group(); const stem = new THREE.Mesh(new THREE.CylinderGeometry(.22, .27, 1.2, 16), material(0xb0443f, .65, .3)); const cap = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 8), material(0x9f3632, .65, .3)); cap.position.y = .7; group.add(stem, cap); return group; }
export function fireMonitorAsset() { const group = new THREE.Group(); const base = new THREE.Mesh(new THREE.CylinderGeometry(.38, .45, .25, 20), detail); const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.17, .24, 1.4, 18), material(0x597280, .65, .3)); barrel.rotation.z = Math.PI / 2; barrel.position.y = .45; group.add(base, barrel); return group; }
export function workerAsset() { const group = new THREE.Group(); const body = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .45, 6, 12), material(0xc2a13a, .15, .72)); body.position.y=.55; const head = new THREE.Mesh(new THREE.SphereGeometry(.14,16,12),material(0xd5b08d,.05,.9)); head.position.y=.95; group.add(body,head); return group; }
export function vehicleAsset() { const group=new THREE.Group(); const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,.7,1),material(0xb33a32,.55,.34)); const cab=new THREE.Mesh(new THREE.BoxGeometry(.75,.52,.9),material(0x465866,.65,.28)); cab.position.x=.62; const wheelGeo=new THREE.CylinderGeometry(.22,.22,.12,16); for(const x of [-.6,.6]) for(const z of [-.48,.48]) { const wheel=new THREE.Mesh(wheelGeo,material(0x20262b,.25,.88)); wheel.rotation.z=Math.PI/2; wheel.position.set(x,-.38,z); group.add(wheel); } group.add(body,cab); return group; }
export function sensorAsset() { const group=new THREE.Group(); const mast=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,.9,12),detail); mast.position.y=.45; const head=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),new THREE.MeshStandardMaterial({color:0x67c4d8,emissive:0x1f7487,emissiveIntensity:1.3})); head.position.y=.95; group.add(mast,head); return group; }
