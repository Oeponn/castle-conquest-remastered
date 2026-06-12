// Particle effects ported from gameClass: makeSmoke, makeSmokePoof,
// makeStreamSmoke, makeAsplode, makeBoom. The original used Director's
// particle model resources; parameters (colors, speeds, lifetimes, counts,
// gravity, wind) are carried over. Rendered as THREE.Points.

import * as THREE from "three";

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  grav: THREE.Vector3;
  wind: THREE.Vector3;
  age: number;
  life: number; // seconds
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  sizeStart: number;
  sizeEnd: number;
  blendStart: number; // opacity 0..100
  blendEnd: number;
}

const MAX = 4000;

export class ParticleSystem {
  points: THREE.Points;
  private parts: Particle[] = [];
  private geo = new THREE.BufferGeometry();
  private positions = new Float32Array(MAX * 3);
  private colors = new Float32Array(MAX * 4);
  private sizes = new Float32Array(MAX);

  constructor(scene: THREE.Scene, texture?: THREE.Texture) {
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute("color", new THREE.BufferAttribute(this.colors, 4));
    this.geo.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { tex: { value: texture ?? null }, useTex: { value: texture ? 1 : 0 } },
      vertexShader: `
        attribute float size; attribute vec4 color; varying vec4 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D tex; uniform int useTex; varying vec4 vColor;
        void main() {
          vec4 c = vColor;
          if (useTex == 1) { c *= texture2D(tex, gl_PointCoord); }
          else {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            c.a *= smoothstep(0.5, 0.2, d);
          }
          gl_FragColor = c;
        }`,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  private emit(opts: {
    pos: THREE.Vector3;
    count: number;
    minSpeed: number;
    maxSpeed: number;
    direction: THREE.Vector3;
    spread?: number;
    colorStart: number;
    colorEnd: number;
    sizeStart: number;
    sizeEnd?: number;
    blendStart?: number;
    blendEnd?: number;
    gravity: THREE.Vector3;
    wind?: THREE.Vector3;
    lifeMs: number;
  }) {
    const dir = opts.direction.clone().normalize();
    for (let i = 0; i < opts.count; i++) {
      if (this.parts.length >= MAX) break;
      const speed = opts.minSpeed + Math.random() * (opts.maxSpeed - opts.minSpeed);
      const spread = opts.spread ?? 1;
      const v = dir
        .clone()
        .add(new THREE.Vector3((Math.random() - 0.5) * spread * 2, (Math.random() - 0.5) * spread * 2, (Math.random() - 0.5) * spread * 2))
        .normalize()
        .multiplyScalar(speed);
      this.parts.push({
        pos: opts.pos.clone(),
        vel: v,
        grav: opts.gravity.clone(),
        wind: opts.wind?.clone() ?? new THREE.Vector3(),
        age: 0,
        life: opts.lifeMs / 1000,
        colorStart: new THREE.Color(opts.colorStart),
        colorEnd: new THREE.Color(opts.colorEnd),
        sizeStart: opts.sizeStart,
        sizeEnd: opts.sizeEnd ?? opts.sizeStart,
        blendStart: opts.blendStart ?? 100,
        blendEnd: opts.blendEnd ?? 0,
      });
    }
  }

  /** cannon muzzle smoke trail burst (makeSmoke) */
  makeSmoke(pos: THREE.Vector3, opacityPerc: number, dir: number) {
    this.emit({
      pos, count: 25, minSpeed: 0.5 * 10, maxSpeed: 2 * 10,
      direction: new THREE.Vector3(-dir, 0, 0), spread: 0.8,
      colorStart: 0x5a5a5a, colorEnd: 0x8c8c8c,
      sizeStart: 3, sizeEnd: 5,
      blendStart: 80 * opacityPerc, blendEnd: 0,
      gravity: new THREE.Vector3(0, 0, -0.5 * 10), wind: new THREE.Vector3(0, 2 * 10, 0),
      lifeMs: 1500,
    });
  }

  /** ground hit poof (makeSmokePoof) */
  makeSmokePoof(pos: THREE.Vector3, velPerc: number) {
    this.emit({
      pos, count: 20, minSpeed: 10, maxSpeed: 17 * 10 * velPerc,
      direction: new THREE.Vector3(0, 0, 1), spread: 1.2,
      colorStart: 0x787878, colorEnd: 0xc8c8c8,
      sizeStart: 1.5, sizeEnd: 3,
      blendStart: 80 * velPerc, blendEnd: 0,
      gravity: new THREE.Vector3(0, 0, -0.5 * 10), wind: new THREE.Vector3(0, 2 * 10, 0),
      lifeMs: 800,
    });
  }

  /** castle hit explosion: brick chunks + fire + dust (makeAsplode) */
  makeAsplode(pos: THREE.Vector3, velPerc: number, playerDir: number) {
    // brick chunks (textured in original with brick_bmp)
    this.emit({
      pos, count: 5, minSpeed: 30, maxSpeed: 60,
      direction: new THREE.Vector3(10 * playerDir, 0, 3).normalize(), spread: 0.5,
      colorStart: 0xb98a6a, colorEnd: 0x8a5a3a,
      sizeStart: 5, gravity: new THREE.Vector3(0, 0, -10 * 10),
      lifeMs: 2000,
    });
    // fire
    this.emit({
      pos, count: 100, minSpeed: 5, maxSpeed: 30,
      direction: new THREE.Vector3(0, 0, 1), spread: 1.5,
      colorStart: 0xffff00, colorEnd: 0xb40000,
      sizeStart: 1, sizeEnd: 3, blendStart: 70 * Math.max(velPerc, 0.4),
      gravity: new THREE.Vector3(0, 0, -10), lifeMs: 1200,
    });
    // dust
    this.emit({
      pos, count: 20, minSpeed: 10, maxSpeed: 35,
      direction: new THREE.Vector3(-1, 0, 0.3), spread: 1.5,
      colorStart: 0x787878, colorEnd: 0xc8c8c8,
      sizeStart: 1, sizeEnd: 3, blendStart: 80,
      gravity: new THREE.Vector3(0, playerDir * 10, -0.5 * 10),
      wind: new THREE.Vector3(0, 2 * 10, 0), lifeMs: 800,
    });
  }

  /** cannon destroyed fountain (makeBoom) */
  makeBoom(pos: THREE.Vector3) {
    this.emit({
      pos, count: 600, minSpeed: 1, maxSpeed: 12 * 10,
      direction: new THREE.Vector3(0, 0, 1), spread: 0.6,
      colorStart: 0xffff00, colorEnd: 0xffa000,
      sizeStart: 2, gravity: new THREE.Vector3(0, 0, 10),
      lifeMs: 2000,
    });
  }

  update(dt: number) {
    const alive: Particle[] = [];
    for (const p of this.parts) {
      p.age += dt;
      if (p.age < p.life) {
        p.vel.addScaledVector(p.grav, dt);
        p.vel.addScaledVector(p.wind, dt * 0.2);
        p.pos.addScaledVector(p.vel, dt);
        alive.push(p);
      }
    }
    this.parts = alive;
    for (let i = 0; i < alive.length; i++) {
      const p = alive[i];
      const t = p.age / p.life;
      this.positions[i * 3] = p.pos.x;
      this.positions[i * 3 + 1] = p.pos.y;
      this.positions[i * 3 + 2] = p.pos.z;
      const c = p.colorStart.clone().lerp(p.colorEnd, t);
      this.colors[i * 4] = c.r;
      this.colors[i * 4 + 1] = c.g;
      this.colors[i * 4 + 2] = c.b;
      this.colors[i * 4 + 3] = ((p.blendStart + (p.blendEnd - p.blendStart) * t) / 100);
      this.sizes[i] = p.sizeStart + (p.sizeEnd - p.sizeStart) * t;
    }
    this.geo.setDrawRange(0, alive.length);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
  }

  clear() {
    this.parts = [];
    this.geo.setDrawRange(0, 0);
  }
}
