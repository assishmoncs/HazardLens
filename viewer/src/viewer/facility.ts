import * as THREE from 'three';

const metal = (color:number) => new THREE.MeshStandardMaterial({color, metalness:.68, roughness:.34});
const concrete = (color:number) => new THREE.MeshStandardMaterial({color, metalness:.18, roughness:.76});

function box(scene:THREE.Scene, size:[number,number,number], position:[number,number,number], material:THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position); scene.add(mesh); return mesh;
}

export function createFacility(scene: THREE.Scene) {
  box(scene,[70,.3,55],[5,-.2,12],concrete(0x151d24));

  const addZone = (x:number,z:number,w:number,d:number,label:string) => {
    const zone = new THREE.Mesh(new THREE.BoxGeometry(w,.08,d),new THREE.MeshStandardMaterial({color:0x22313d,transparent:true,opacity:.42}));
    zone.position.set(x,0,z); zone.name=label; scene.add(zone);
  };

  addZone(-16,-6,24,20,'PROCESSING_AREA');
  addZone(16,-6,26,20,'STORAGE_AREA');
  addZone(0,18,54,16,'UTILITY_AREA');

  // Pipe racks
  for (let row=0; row<3; row++) {
    const z = 2 + row*2.3;
    box(scene,[58,.16,.18],[-2,z,-17],metal(0x64727d));
    for (const x of [-27,-14,-1,12,25]) box(scene,[.18,2.3,.18],[x,z/2,-17],metal(0x52606b));
  }

  // Control building
  box(scene,[16,5,7],[0,2.5,31],concrete(0x303a43));
  box(scene,[16.5,.28,7.5],[0,5.15,31],metal(0x4c5b66));
  for (let x=-6; x<=6; x+=3) {
    const win=new THREE.Mesh(new THREE.BoxGeometry(1.65,1.25,.06),new THREE.MeshStandardMaterial({color:0x5bbbd2,emissive:0x154b5b,emissiveIntensity:.55,metalness:.2,roughness:.2}));
    win.position.set(x,2.9,34.54); scene.add(win);
  }

  // Cooling / utility blocks
  for (let x=-20; x<=20; x+=8) {
    box(scene,[5,2,4],[x,1,18],metal(0x394752));
    box(scene,[1.5,3,1.5],[x,2.5,18],metal(0x53636f));
  }

  // Elevated stack and flare tower
  const tower=new THREE.Mesh(new THREE.CylinderGeometry(.7,1,11,24),metal(0x394751));
  tower.position.set(25,5.5,-5); scene.add(tower);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,.35,24),metal(0x5e6c76));
  top.position.set(25,11,-5); scene.add(top);

  // Safety barrier perimeter
  for (let x=-32; x<=32; x+=8) {
    box(scene,[.12,1.2,.12],[x,.6,-25],metal(0xb07a2b));
    box(scene,[.12,1.2,.12],[x,.6,40],metal(0xb07a2b));
  }
}
