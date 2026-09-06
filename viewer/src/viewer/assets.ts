import * as THREE from 'three';

const material = (color: number, metalness = .58, roughness = .34) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const detail = material(0x9aa7b2, .72, .28);
const safetyRed = material(0xd93829, .4, .5);
const safetyYellow = material(0xe5b834, .2, .6);
const safetyGreen = material(0x27ae60, .3, .5);
const shadow = (o: THREE.Object3D) => { o.traverse(n => { if (n instanceof THREE.Mesh) { n.castShadow = true; n.receiveShadow = true; } }); return o; };

export function tankAsset() {
  const group = new THREE.Group();
  const steel = material(0x778895, .72, .27), dark = material(0x29343b, .72, .35);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 5.2, 40), steel); shell.position.y = 2.6;
  const roof = new THREE.Mesh(new THREE.SphereGeometry(2.15, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), steel); roof.position.y = 5.18;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.22, .075, 8, 48), dark); ring.rotation.x = Math.PI / 2; ring.position.y = 4.45;
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .85, 14), detail); nozzle.position.y = 6.05;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, .25, 40), dark); base.position.y = -.15;
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(.09, 4.8, .09), dark); ladder.position.set(2.2, 2.2, 0);
  const gauge = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .12, 16), material(0xe5ecef, .35, .2)); gauge.rotation.x = Math.PI / 2; gauge.position.set(0, 3.0, 2.18);
  group.add(shell, roof, ring, nozzle, base, ladder, gauge); return shadow(group);
}

/**
 * Pressurized Horton Sphere for LPG / Propane Storage.
 * Prominent spherical vessel with equatorial ring, support pillars, deluge spray ring, and top PRV.
 */
export function sphereTankAsset(radius = 3.2) {
  const group = new THREE.Group();
  const sphereMat = material(0x8fa0af, 0.7, 0.25);
  const darkMetal = material(0x2c3840, 0.65, 0.4);

  // Main Sphere
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 32), sphereMat);
  sphere.position.y = radius + 1.2;
  group.add(sphere);

  // Equatorial weld / stiffening ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.015, 0.08, 8, 48), detail);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = radius + 1.2;
  group.add(ring);

  // Deluge water spray cooling ring (NFPA 15 fixed fire protection)
  const delugeRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.06, 0.045, 6, 40), safetyRed);
  delugeRing.rotation.x = Math.PI / 2;
  delugeRing.position.y = radius + 2.4;
  group.add(delugeRing);

  // Top Pressure Relief Valve (PRV) manifold & vent stack
  const prvBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.6, 16), detail);
  prvBase.position.y = radius * 2 + 1.4;
  const prvVent = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.4, 14), material(0x9ca9b3, 0.75, 0.25));
  prvVent.position.y = radius * 2 + 2.2;
  const prvCap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.3, 14), safetyRed);
  prvCap.position.y = radius * 2 + 3.0;
  group.add(prvBase, prvVent, prvCap);

  // 6 Structural Tubular Support Columns
  const numPillars = 6;
  const legRadius = radius * 0.92;
  for (let i = 0; i < numPillars; i++) {
    const angle = (i / numPillars) * Math.PI * 2;
    const px = Math.cos(angle) * legRadius;
    const pz = Math.sin(angle) * legRadius;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, radius + 1.4, 16), darkMetal);
    leg.position.set(px, (radius + 1.4) / 2, pz);
    
    // Footing foundation
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), material(0x404b52, 0.2, 0.8));
    foot.position.set(px, 0.1, pz);
    group.add(leg, foot);
  }

  // Spiral ladder walkway around sphere
  const walkwayGroup = new THREE.Group();
  for (let step = 0; step < 16; step++) {
    const t = step / 16;
    const theta = t * Math.PI * 1.5;
    const h = 0.5 + t * (radius * 1.6);
    const rAtH = Math.sqrt(Math.max(0.1, radius * radius - Math.pow(h - (radius + 1.2), 2))) + 0.35;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.25), detail);
    tread.position.set(Math.cos(theta) * rAtH, h, Math.sin(theta) * rAtH);
    tread.rotation.y = -theta;
    walkwayGroup.add(tread);
  }
  group.add(walkwayGroup);

  return shadow(group);
}

/**
 * Tall Distillation Column / Fractionation Tower.
 * Features tray shell, structural skirt base, caged ladders, 4 circular operating platforms with handrails, and top vapor line.
 */
export function distillationColumnAsset(height = 16, diameter = 1.8) {
  const group = new THREE.Group();
  const columnSteel = material(0x758592, 0.72, 0.26);
  const railingMat = material(0x2d3a44, 0.6, 0.4);

  // Base Skirt
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(diameter * 0.55, diameter * 0.65, 2.5, 28), material(0x35414a, 0.7, 0.4));
  skirt.position.y = 1.25;
  group.add(skirt);

  // Column Main Cylindrical Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(diameter * 0.5, diameter * 0.5, height, 32), columnSteel);
  body.position.y = height / 2 + 2.5;
  group.add(body);

  // Top Ellipsoidal / Hemispherical Head
  const topHead = new THREE.Mesh(new THREE.SphereGeometry(diameter * 0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), columnSteel);
  topHead.position.y = height + 2.5;
  group.add(topHead);

  // Top Overhead Vapor Line (P-01 to Condenser)
  const vaporPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 16), detail);
  vaporPipe.position.set(diameter * 0.35, height + 3.2, 0);
  const vaporBend = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.16, 8, 16, Math.PI / 2), detail);
  vaporBend.position.set(0, height + 3.2, 0);
  group.add(vaporPipe, vaporBend);

  // 4 Operating Catwalk Platforms with safety handrails
  const platformLevels = [6, 10, 14, height + 1.5];
  platformLevels.forEach(level => {
    const platform = new THREE.Group();
    // Grating Floor
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(diameter * 0.95, diameter * 0.95, 0.1, 28), material(0x404e57, 0.65, 0.45));
    floor.position.y = level;
    platform.add(floor);

    // Handrail Ring
    const rail = new THREE.Mesh(new THREE.TorusGeometry(diameter * 0.92, 0.035, 6, 28), railingMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = level + 0.85;
    platform.add(rail);

    // Vertical railing stanchions
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8), railingMat);
      stanchion.position.set(Math.cos(angle) * diameter * 0.92, level + 0.425, Math.sin(angle) * diameter * 0.92);
      platform.add(stanchion);
    }
    group.add(platform);
  });

  // Vertical Caged Ladder
  const ladderRungs = new THREE.Group();
  for (let y = 3; y < height + 2; y += 0.5) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), material(0xd9a834, 0.5, 0.5));
    rung.position.set(diameter * 0.58, y, 0);
    ladderRungs.add(rung);
  }
  group.add(ladderRungs);

  return shadow(group);
}

/**
 * Emergency Flare Stack with Lattice Derrick & Pilot Burner.
 */
export function flareStackAsset(height = 24) {
  const group = new THREE.Group();
  const derrickMat = material(0x3e4952, 0.7, 0.35);

  // Central Flare Riser Pipe
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, height, 20), material(0x8a98a3, 0.7, 0.3));
  riser.position.y = height / 2;
  group.add(riser);

  // 4 Corner Structural Legs
  const legSpread = 2.4;
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, height, 10), derrickMat);
    leg.position.set(x * (legSpread / 2), height / 2, z * (legSpread / 2));
    group.add(leg);
  }

  // Cross-bracing Girts along height
  for (let y = 3; y < height; y += 3) {
    const ring = new THREE.Mesh(new THREE.BoxGeometry(legSpread, 0.08, legSpread), derrickMat);
    ring.position.y = y;
    group.add(ring);
  }

  // Upper Flare Tip Wind Cowl
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.42, 2.2, 20), material(0x232c33, 0.8, 0.3));
  tip.position.y = height + 1.0;
  group.add(tip);

  // Continuous Pilot Flame Burner Nozzles
  const pilot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 10), material(0xb37424, 0.6, 0.3));
  pilot.position.set(0.45, height + 1.8, 0);
  group.add(pilot);

  // Aerial obstruction warning light at tip
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({
    color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 2.0
  }));
  beacon.position.set(0, height + 2.3, 0);
  group.add(beacon);

  return shadow(group);
}

/**
 * Automated Deluge Valve Skid & Distribution Manifold.
 */
export function delugeAsset() {
  const group = new THREE.Group();
  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.9), material(0x35424a, 0.6, 0.5));
  frame.position.y = 0.6;
  // Red Deluge Valve Body
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 18), safetyRed);
  valve.position.set(0, 0.7, 0);
  // Manual Release Lever
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.05), safetyYellow);
  lever.position.set(0.25, 0.85, 0);
  // Pressure Gauges
  const gauge1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), detail);
  gauge1.rotation.x = Math.PI / 2;
  gauge1.position.set(-0.25, 0.8, 0.35);
  group.add(frame, valve, lever, gauge1);
  return shadow(group);
}

/**
 * Optical / Catalytic Gas Detector Head with Dual Status LEDs.
 */
export function gasDetectorAsset() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.4, 12), detail);
  pole.position.y = 0.7;
  // Explosion-proof junction housing
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.16), safetyYellow);
  housing.position.y = 1.35;
  // Sintered sensor head
  const sensorHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 14), detail);
  sensorHead.position.set(0, 1.18, 0);
  // Status LED Beacon (normal green / alarm red)
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshStandardMaterial({
    color: 0x55ff77, emissive: 0x33ff55, emissiveIntensity: 1.6
  }));
  led.position.set(0, 1.48, 0);
  group.add(pole, housing, sensorHead, led);
  return shadow(group);
}

/**
 * Multi-Spectrum Optical UV/IR Flame Detector.
 */
export function flameDetectorAsset() {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 12), detail);
  post.position.y = 1.1;
  const detector = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.32, 16), material(0xd4402a, 0.6, 0.4));
  detector.rotation.x = Math.PI / 4;
  detector.position.set(0, 2.2, 0.1);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshStandardMaterial({
    color: 0x44ddff, emissive: 0x0088cc, emissiveIntensity: 1.2
  }));
  lens.rotation.x = Math.PI / 4;
  lens.position.set(0, 2.32, 0.22);
  group.add(post, detector, lens);
  return shadow(group);
}

/**
 * Reinforced Concrete Secondary Containment Bund / Dike Wall.
 */
export function bundWallAsset(width = 18, depth = 16, height = 1.4, wallThick = 0.4) {
  const group = new THREE.Group();
  const concMat = material(0x4a555e, 0.2, 0.85);

  // Front & Back walls
  const wallFB = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThick), concMat);
  wallFB.position.set(0, height / 2, depth / 2);
  const wallBB = wallFB.clone();
  wallBB.position.z = -depth / 2;

  // Left & Right walls
  const wallLR = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth), concMat);
  wallLR.position.set(-width / 2, height / 2, 0);
  const wallRR = wallLR.clone();
  wallRR.position.x = width / 2;

  group.add(wallFB, wallBB, wallLR, wallRR);
  return shadow(group);
}

/**
 * Designated Emergency Evacuation Muster Station.
 */
export function musterStationAsset() {
  const group = new THREE.Group();
  // Safe muster platform
  const pad = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.15, 4.5), safetyGreen);
  pad.position.y = 0.075;
  // Canopy shelter
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 4.2), material(0x35434d, 0.5, 0.5));
  roof.position.y = 2.8;
  // Support poles
  for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [1.9, 1.9], [-1.9, 1.9]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.7, 10), detail);
    pole.position.set(x, 1.35, z);
    group.add(pole);
  }
  // Green Muster Point Assembly Sign
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.08), new THREE.MeshStandardMaterial({
    color: 0x1f8b4c, emissive: 0x10552b, emissiveIntensity: 0.6
  }));
  sign.position.set(0, 2.0, -1.95);
  group.add(pad, roof, sign);
  return shadow(group);
}

/**
 * Omnidirectional Emergency Alarm Siren & Strobe Mast.
 */
export function alarmSirenAsset() {
  const group = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.5, 14), detail);
  mast.position.y = 2.75;
  // 4 Horn Projectors
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 14), safetyYellow);
    horn.rotation.z = Math.PI / 2;
    horn.rotation.y = angle;
    horn.position.set(Math.cos(angle) * 0.35, 5.2, Math.sin(angle) * 0.35);
    group.add(horn);
  }
  // Strobe beacon
  const strobe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 14), new THREE.MeshStandardMaterial({
    color: 0xff8800, emissive: 0xffaa00, emissiveIntensity: 2.2
  }));
  strobe.position.y = 5.65;
  group.add(mast, strobe);
  return shadow(group);
}

/**
 * Standby Emergency Diesel Power Generator.
 */
export function generatorAsset() {
  const group = new THREE.Group();
  // Acoustic Enclosure
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 1.8), material(0x2f5233, 0.4, 0.6));
  body.position.y = 1.1;
  // Silencer Stack
  const silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6, 16), material(0x1a2126, 0.8, 0.3));
  silencer.position.set(1.2, 2.6, 0);
  // Ventilation Louver Panel
  const louver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 1.2), material(0x182024, 0.7, 0.3));
  louver.position.set(-1.82, 1.1, 0);
  group.add(body, silencer, louver);
  return shadow(group);
}

export function pressureVesselAsset() { const group = tankAsset(); group.scale.set(1.05, .82, 1.05); return group; }
export function reactorAsset(height = 6.5) { const group = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.9, height, 28), material(0x6c7b84, .72, .3)); body.position.y = height / 2; const top = new THREE.Mesh(new THREE.SphereGeometry(1.65, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), material(0x82909a, .7, .28)); top.position.y = height; const jacket = new THREE.Mesh(new THREE.TorusGeometry(1.78, .09, 8, 32), detail); jacket.rotation.x = Math.PI / 2; jacket.position.y = height * .62; const legs = [-.9,.9].flatMap(x => { const m = new THREE.Mesh(new THREE.BoxGeometry(.16, .8, .16), detail); m.position.set(x, -.4, 0); return [m]; }); group.add(body, top, jacket, ...legs); return shadow(group); }\nexport function pipeAsset(length = 8) { const group = new THREE.Group(); const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,length,24), material(0x9ba5ae,.72,.25)); pipe.rotation.z=Math.PI/2; const joint = new THREE.Mesh(new THREE.TorusGeometry(.36,.085,10,24),detail); joint.rotation.y=Math.PI/2; const left=joint.clone(); left.position.x=-length*.28; const right=joint.clone(); right.position.x=length*.28; const s1=new THREE.Mesh(new THREE.BoxGeometry(.16,.65,.16),detail); s1.position.set(-length*.28,-.38,0); const s2=s1.clone(); s2.position.x=length*.28; group.add(pipe,joint,left,right,s1,s2); return shadow(group); }\nexport function wallAsset() { return shadow(new THREE.Mesh(new THREE.BoxGeometry(8,4,.35),material(0x59636a,.2,.82))); }\nexport function valveAsset() { const group=new THREE.Group(); const body=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.72,20),detail); body.rotation.z=Math.PI/2; const stem=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.72,12),detail); stem.position.y=.55; const wheel=new THREE.Mesh(new THREE.TorusGeometry(.35,.065,10,24),material(0xc2ccd3,.72,.22)); wheel.rotation.x=Math.PI/2; wheel.position.y=.92; group.add(body,stem,wheel); return shadow(group); }\nexport function pumpAsset() { const group=new THREE.Group(); const body=new THREE.Mesh(new THREE.CylinderGeometry(.58,.58,1.55,24),material(0x526372,.7,.32)); body.rotation.z=Math.PI/2; const motor=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,1.15,24),material(0x34424e,.8,.3)); motor.rotation.z=Math.PI/2; motor.position.x=-.95; const base=new THREE.Mesh(new THREE.BoxGeometry(2.9,.2,1.2),material(0x36414b,.7,.45)); base.position.y=-.67; const coupling=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.22,18),detail); coupling.rotation.z=Math.PI/2; coupling.position.x=.62; group.add(body,motor,base,coupling); return shadow(group); }\nexport function compressorAsset() { const group=new THREE.Group(); const body=new THREE.Mesh(new THREE.BoxGeometry(3.8,1.8,2.4),material(0x4f7a88,.62,.32)); body.position.y=1; const motor=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,2.6,24),material(0x53636d,.72,.3)); motor.rotation.z=Math.PI/2; motor.position.x=-.8; const fanL=new THREE.Mesh(new THREE.TorusGeometry(.75,.13,10,24),detail); fanL.position.set(1.35,1.0,1.25); const fanR=fanL.clone(); fanR.position.z=-1.25; group.add(body,motor,fanL,fanR); return shadow(group); }\nexport function heatExchangerAsset() { const group=new THREE.Group(); const shell=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,3.2,28),material(0x697b88,.7,.28)); shell.rotation.z=Math.PI/2; for(let x=-1.4;x<=1.4;x+=.7){const band=new THREE.Mesh(new THREE.TorusGeometry(.64,.055,10,24),detail);band.rotation.y=Math.PI/2;band.position.x=x;group.add(band);} group.add(shell); return shadow(group); }\nexport function coolingAsset() { const group=new THREE.Group(); const tower=new THREE.Mesh(new THREE.CylinderGeometry(3.5,5,8,24),material(0x718f9a,.2,.7)); tower.position.y=4; const rim=new THREE.Mesh(new THREE.TorusGeometry(3.5,.3,8,24),material(0xa5bdc8)); rim.rotation.x=Math.PI/2; rim.position.y=8; group.add(tower,rim); return shadow(group); }\nexport function columnAsset() { const group=new THREE.Group(); const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.34,.48,7,22),material(0x687986,.7,.3)); shaft.position.y=3.5; const foot=new THREE.Mesh(new THREE.BoxGeometry(1.1,.3,1.1),material(0x3c4851,.75,.4)); foot.position.y=-.15; group.add(shaft,foot); return shadow(group); }\nexport function windowAsset() { return shadow(new THREE.Mesh(new THREE.BoxGeometry(1.4,1,.08),new THREE.MeshStandardMaterial({color:0x5bb7cf,metalness:.2,roughness:.18,emissive:0x15485a,emissiveIntensity:.3}))); }\nexport function doorAsset() { const group=new THREE.Group(); const slab=new THREE.Mesh(new THREE.BoxGeometry(1.1,2.3,.12),material(0x33414b,.5,.5)); const handle=new THREE.Mesh(new THREE.SphereGeometry(.05,10,8),detail); handle.position.set(.32,0,-.08); group.add(slab,handle); return shadow(group); }\nexport function routeAsset() { return new THREE.Mesh(new THREE.BoxGeometry(7,.06,1.2),new THREE.MeshStandardMaterial({color:0x24506a,transparent:true,opacity:.72,emissive:0x092331,emissiveIntensity:.4})); }\nexport function buildingAsset() { const group=new THREE.Group(); const body=new THREE.Mesh(new THREE.BoxGeometry(14,5,8),material(0x303b45,.35,.62)); body.position.y=2.5; const roof=new THREE.Mesh(new THREE.BoxGeometry(14.6,.35,8.6),material(0x46545f,.7,.35)); roof.position.y=5.18; for(let x=-5.2;x<=5.2;x+=2.6){const w=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.2,.08),new THREE.MeshStandardMaterial({color:0x5bb7cf,metalness:.25,roughness:.18,emissive:0x15485a,emissiveIntensity:.35})); w.position.set(x,2.2,4.04); group.add(w);} group.add(body,roof); return shadow(group); }\nexport function controlAsset() { const group=new THREE.Group(); const body=new THREE.Mesh(new THREE.BoxGeometry(4.5,1.4,2.2),material(0x314a5a,.2,.7)); body.position.y=.7; for(const x of [-1.3,0,1.3]) { const screen=new THREE.Mesh(new THREE.BoxGeometry(1,.75,.06),new THREE.MeshStandardMaterial({color:0x286278,emissive:0x286278,emissiveIntensity:.6})); screen.position.set(x,1.65,-.15); group.add(screen);} return shadow(group); }\nexport function emergencyAsset() { const group=new THREE.Group(); const body=new THREE.Mesh(new THREE.BoxGeometry(.85,1.8,.65),material(0xb63327,.3,.6)); body.position.y=.9; const beacon=new THREE.Mesh(new THREE.SphereGeometry(.17,12,8),new THREE.MeshStandardMaterial({color:0xffce65,emissive:0xff8a00,emissiveIntensity:1.4})); beacon.position.y=2; group.add(body,beacon); return shadow(group); }\nexport function hydrantAsset() { const group=new THREE.Group(); const stem=new THREE.Mesh(new THREE.CylinderGeometry(.22,.27,1.2,16),material(0xb0443f,.65,.3)); const cap=new THREE.Mesh(new THREE.SphereGeometry(.3,16,8),material(0x9f3632,.65,.3)); cap.position.y=.7; group.add(stem,cap); return shadow(group); }\nexport function fireMonitorAsset() { const group=new THREE.Group(); const base=new THREE.Mesh(new THREE.CylinderGeometry(.38,.45,.25,20),detail); const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.17,.24,1.4,18),material(0x597280,.65,.3)); barrel.rotation.z=Math.PI/2; barrel.position.y=.45; group.add(base,barrel); return shadow(group); }\nexport function workerAsset() { const group=new THREE.Group(); const body=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.45,6,12),material(0xdac34e,.15,.72)); body.position.y=.55; const head=new THREE.Mesh(new THREE.SphereGeometry(.14,16,12),material(0xd5b08d,.05,.9)); head.position.y=.95; const helmet=new THREE.Mesh(new THREE.SphereGeometry(.17,14,8,0,Math.PI*2,0,Math.PI/2),material(0xf4e3a2,.25,.55)); helmet.position.y=1.08; group.add(body,head,helmet); return shadow(group); }\nexport function vehicleAsset() { const group=new THREE.Group(); const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,.7,1),material(0xb33a32,.55,.34)); const cab=new THREE.Mesh(new THREE.BoxGeometry(.75,.52,.9),material(0x465866,.65,.28)); cab.position.x=.62; const wheelGeo=new THREE.CylinderGeometry(.22,.22,.12,16); for(const x of [-.6,.6]) for(const z of [-.48,.48]) { const wheel=new THREE.Mesh(wheelGeo,material(0x20262b,.25,.88)); wheel.rotation.z=Math.PI/2; wheel.position.set(x,-.38,z); group.add(wheel);} group.add(body,cab); return shadow(group); }\nexport function sensorAsset() { const group=new THREE.Group(); const mast=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,.9,12),detail); mast.position.y=.45; const head=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),new THREE.MeshStandardMaterial({color:0x67c4d8,emissive:0x1f7487,emissiveIntensity:1.3})); head.position.y=.95; group.add(mast,head); return shadow(group); }\nexport function roadAsset(length=340,width=10) { const group=new THREE.Group(); const surface=new THREE.Mesh(new THREE.BoxGeometry(length,.05,width),material(0x29353d,0,.95)); group.add(surface); return group; }\nexport function ignitionAsset() { const group=new THREE.Group(); const base=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.2,2.2),material(0x303b42,.55,.4)); base.position.y=.6; const motor=new THREE.Mesh(new THREE.CylinderGeometry(.58,.58,1.8,18),material(0x53636d,.7,.32)); motor.rotation.z=Math.PI/2; motor.position.y=1.55; group.add(base,motor); return shadow(group); }\nexport function sensorTowerAsset() { const group=new THREE.Group(); const mast=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,3.8,12),detail); mast.position.y=1.9; const head=new THREE.Mesh(new THREE.SphereGeometry(.2,16,12),new THREE.MeshStandardMaterial({color:0x67c4d8,emissive:0x1f7487,emissiveIntensity:1.3})); head.position.y=3.9; group.add(mast,head); return shadow(group); }\n