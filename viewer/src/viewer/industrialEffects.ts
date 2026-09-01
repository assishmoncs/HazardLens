import * as THREE from 'three';

function softTexture(smoke = false) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, smoke ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,1)');
  gradient.addColorStop(.26, smoke ? 'rgba(255,255,255,.45)' : 'rgba(255,210,90,.92)');
  gradient.addColorStop(.68, smoke ? 'rgba(255,255,255,.14)' : 'rgba(255,90,5,.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export class IndustrialFireEffect {
  readonly root = new THREE.Group();
  private flames: THREE.Sprite[] = [];
  private smoke: THREE.Sprite[] = [];
  private fireMap = softTexture(false);
  private smokeMap = softTexture(true);
  private light = new THREE.PointLight(0xff7d2e, 40, 18, 2);

  constructor() {
    for (let i = 0; i < 18; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.fireMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      this.flames.push(sprite); this.root.add(sprite);
    }
    for (let i = 0; i < 14; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeMap, color: 0x303538, depthWrite: false, transparent: true }));
      this.smoke.push(sprite); this.root.add(sprite);
    }
    this.light.position.y = 2; this.root.add(this.light);
  }

  update(time: number, intensity: number) {
    const strength = Math.min(2, .6 + intensity * .1);
    this.flames.forEach((sprite, i) => {
      const age = (time * (.7 + (i % 3) * .07) + i / this.flames.length) % 1;
      const a = i * 2.399;
      sprite.position.set(Math.sin(a + time * 2) * (1 - age) * .8, .2 + age * 3.3 * strength, Math.cos(a + time) * (1 - age) * .7);
      sprite.scale.setScalar((1 - age) * 1.5 * strength + .1);
      sprite.material.opacity = Math.sin(age * Math.PI) * .9;
      sprite.material.rotation = Math.sin(time + i) * .3;
    });
    this.smoke.forEach((sprite, i) => {
      const age = (time * .12 + i / this.smoke.length) % 1;
      sprite.position.set(Math.sin(i * 2.4 + age * 3) * age * 1.6, 2 + age * 5.2, Math.cos(i * 2.4) * age * 1.2);
      sprite.scale.setScalar(1.2 + age * 2.8);
      sprite.material.opacity = Math.sin(age * Math.PI) * .38;
      sprite.material.rotation = i + time * .08;
    });
    this.light.intensity = (30 + intensity * 7) * (1 + .12 * Math.sin(time * 17));
  }

  dispose() { this.fireMap.dispose(); this.smokeMap.dispose(); }
}

export class IndustrialBlastEffect {
  readonly root = new THREE.Group();
  private ring = new THREE.Mesh(new THREE.TorusGeometry(1, .035, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffc18b, transparent: true, depthWrite: false }));
  private flash = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffdc91, transparent: true, depthWrite: false }));
  private light = new THREE.PointLight(0xffbd78, 0, 32);
  private sparks = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffbe73, size: .12, transparent: true, depthWrite: false }));

  constructor() {
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = .2;
    this.root.add(this.ring, this.flash, this.light, this.sparks);
    this.sparks.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(54 * 3), 3));
  }

  update(age: number, radius: number) {
    const progress = Math.min(1, age / 1.1);
    this.ring.scale.setScalar(Math.max(.01, progress * radius));
    this.ring.material.opacity = Math.max(0, 1 - progress);
    this.flash.scale.setScalar(.1 + Math.sin(Math.min(1, age / .8) * Math.PI) * radius * .3);
    this.flash.material.opacity = Math.max(0, 1 - age / .6);
    this.light.intensity = Math.max(0, 170 * (1 - age / .5));
    const positions = this.sparks.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < 54; i++) {
      const a = i * 2.399, velocity = 3 + i % 8;
      positions.setXYZ(i, Math.sin(a) * age * velocity, Math.max(.05, age * (3 + i % 5) - 4.9 * age * age), Math.cos(a) * age * velocity);
    }
    positions.needsUpdate = true;
    this.sparks.material.opacity = Math.max(0, 1 - age / 3);
  }
}
