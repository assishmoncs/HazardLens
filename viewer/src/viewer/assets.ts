import * as THREE from 'three';

const material=(color:number)=>new THREE.MeshStandardMaterial({color,metalness:.55,roughness:.38});

export function tankAsset(){
 const group=new THREE.Group();
 const shell=new THREE.Mesh(new THREE.CylinderGeometry(2,2,4,48),material(0x607080));
 const top=new THREE.Mesh(new THREE.CylinderGeometry(1.75,1.75,.12,48),material(0x8796a5));
 top.position.y=2.05;
 const valve=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.8,16),material(0xb8c4ce));
 valve.position.set(0,2.45,0);
 group.add(shell,top,valve);
 return group;
}

export function pipeAsset(){
 const group=new THREE.Group();
 const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,8,24),material(0x9099a2));
 pipe.rotation.z=Math.PI/2;
 const joint=new THREE.Mesh(new THREE.TorusGeometry(.35,.08,12,24),material(0xb7c1ca));
 joint.rotation.y=Math.PI/2;
 group.add(pipe,joint);
 return group;
}

export function wallAsset(){
 const wall=new THREE.Mesh(new THREE.BoxGeometry(8,4,.35),material(0x56616a));
 return wall;
}
