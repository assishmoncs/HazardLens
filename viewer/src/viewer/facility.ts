import * as THREE from 'three';

export function createFacility(scene: THREE.Scene) {
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.3, 22),
    new THREE.MeshStandardMaterial({ color: 0x1b2229, roughness: 0.9 })
  );
  floor.position.set(7, -0.2, 0);
  scene.add(floor);

  const addZone = (x:number,z:number,label:string) => {
    const zone = new THREE.Mesh(
      new THREE.BoxGeometry(10,0.08,7),
      new THREE.MeshStandardMaterial({color:0x27333d,transparent:true,opacity:0.55})
    );
    zone.position.set(x,0,z);
    zone.name = label;
    scene.add(zone);
  };

  addZone(5,0,'PROCESSING_AREA');
  addZone(17,0,'STORAGE_AREA');

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6,0.8,8,20),
    new THREE.MeshStandardMaterial({color:0x34424d,metalness:0.5})
  );
  tower.position.set(18,4,-4);
  scene.add(tower);
}
