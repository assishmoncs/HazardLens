import * as THREE from 'three';
import type { TwinState, WorldSnapshot } from '../../../src/core/types.js';
import { tankAsset, pipeAsset, wallAsset } from './assets.js';

export class WorldRenderer {
 private objects=new Map<string,THREE.Object3D>();
 constructor(private scene:THREE.Scene){}
 sync(snapshot:WorldSnapshot){const alive=new Set<string>();for(const twin of snapshot.twins){alive.add(twin.id);let o=this.objects.get(twin.id);if(!o){o=this.create(twin);this.objects.set(twin.id,o);this.scene.add(o)}this.update(o,twin)}for(const [id,o] of this.objects)if(!alive.has(id)){this.scene.remove(o);this.objects.delete(id)}}
 private create(t:TwinState):THREE.Object3D{let o:THREE.Object3D;switch(t.kind){case'tank':o=tankAsset();break;case'pipe':o=pipeAsset();break;case'wall':o=wallAsset();break;case'fire':o=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshStandardMaterial({color:0xff6418,emissive:0xff2200,emissiveIntensity:2,transparent:true,opacity:.8}));break;case'release':o=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshStandardMaterial({color:0x8ec5cf,transparent:true,opacity:.18,depthWrite:false}));break;default:o=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.7),new THREE.MeshStandardMaterial({color:0xd6b34a}))}o.userData.twinId=t.id;return o}
 private update(o:THREE.Object3D,t:TwinState){o.position.set(t.position.x,t.position.y,t.position.z);o.visible=t.active||['tank','pipe','wall'].includes(t.kind);if(t.kind==='release'){const r=Number(t.metadata.radiusM??1);o.scale.setScalar(Math.max(.25,r))}if(t.kind==='fire'){const i=Number(t.metadata.intensityMw??1);o.scale.set(1+i*.12,1.2+i*.18,1+i*.12)}if(['tank','pipe','wall'].includes(t.kind)){const mesh=o.children[0] as THREE.Mesh??o as THREE.Mesh;const mat=mesh.material as THREE.MeshStandardMaterial;const heat=Math.min(1,Math.max(0,(t.temperatureK-303)/250));mat.emissive.setRGB(heat*.7,heat*.1,0);mat.emissiveIntensity=heat*2;if(t.integrity<.7)o.rotation.z=(1-t.integrity)*.12}}
 getObject(id:string){return this.objects.get(id)}
}
