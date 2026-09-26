import * as THREE from 'three';
import { AvatarBase } from './avatar-base.js';
import { auraVertex, auraFragment, haloVertex, haloFragment, glassVertex, glassFragment } from './shaders.js';
import { DEFAULTS, COLOR_KEYS, STATES, EMOTIONS } from './presets.js';

const GLOW_SCALE = 1; // the glow fills the glass right to its wall

/** Blurred cyan/blue/magenta mass drifting inside an always-round glass sphere. */
export class AuraAvatar extends AvatarBase {
  constructor(container, options = {}) {
    super(container, options, {
      defaults: DEFAULTS, colorKeys: COLOR_KEYS, states: STATES, emotions: EMOTIONS,
      phases: {
        flow: 'flow', swirl: 'swirl', pulse: 'pulseRate',
        bounce: 'bounceRate', breath: 'breathRate', float: 'floatRate',
      },
      impulses: { pop: 4, spin: 2, spill: 2.5 },
      options: { background: null },
      cameraZ: 7,
    });
  }

  _build() {
    const c = this.cur;
    this.uniforms = {
      uTime: { value: 0 }, uFlowT: { value: 0 }, uSwirlT: { value: 0 },
      uCoverage: { value: 0 }, uSoftness: { value: 0.3 }, uFreq: { value: 1 },
      uOpacity: { value: 1 }, uMint: { value: 0 }, uJitter: { value: 0 }, uWobble: { value: 0 }, uLook: { value: new THREE.Vector2() },
      uGlow: { value: 1 }, uGlass: { value: 1 },
      uColA: { value: c.colorA.clone() }, uColB: { value: c.colorB.clone() }, uColC: { value: c.colorC.clone() },
    };

    this.halo = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.ShaderMaterial({
        vertexShader: haloVertex, fragmentShader: haloFragment, uniforms: this.uniforms,
        transparent: true, depthWrite: false,
      }),
    );
    this.halo.position.z = -1.2;
    this.scene.add(this.halo);

    this.sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 96),
      new THREE.ShaderMaterial({
        vertexShader: auraVertex, fragmentShader: auraFragment, uniforms: this.uniforms,
        transparent: true, depthWrite: false,
      }),
    );
    this.scene.add(this.sphere);

    // Glass shell around the glow, drawn last.
    this.glass = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 96),
      new THREE.ShaderMaterial({
        vertexShader: glassVertex, fragmentShader: glassFragment, uniforms: this.uniforms,
        transparent: true, depthWrite: false,
      }),
    );
    this.glass.renderOrder = 2;
    this.scene.add(this.glass);
  }

  _frame(c, dt, motion) {
    const p = this._phase;
    const u = this.uniforms;
    const audio = this._audio * Math.min(1, c.audioReact);
    p.swirl += this._impulse.spin * dt * 5;

    u.uTime.value = this._time;
    u.uFlowT.value = p.flow;
    u.uSwirlT.value = p.swirl;
    // Coverage: base + periodic pulse + voice + a surprise "spill" that briefly floods the sphere.
    u.uCoverage.value = c.coverage + c.pulse * Math.sin(p.pulse * Math.PI * 2) + audio * 0.4 + this._impulse.spill * 0.5;
    u.uSoftness.value = c.softness;
    u.uFreq.value = c.freq;
    u.uOpacity.value = c.opacity;
    u.uMint.value = c.mint;
    u.uJitter.value = c.jitter * motion;
    u.uWobble.value = c.wobble * 0.5 * Math.sin(this._time * 2.4) * motion;
    u.uGlow.value = c.glow * (1 + audio * 0.3);
    u.uGlass.value = c.glass;
    u.uLook.value.set(this._look.x, -this._look.y);
    u.uColA.value.copy(c.colorA);
    u.uColB.value.copy(c.colorB);
    u.uColC.value.copy(c.colorC);

    // Uniform scale + translation only, so the outline stays a circle.
    const breath = 1 + c.breathAmp * Math.sin(p.breath * Math.PI * 2);
    const s = c.radius * breath * (1 + audio * 0.03) * (1 + this._impulse.pop);
    this.glass.scale.setScalar(s);
    this.sphere.scale.setScalar(s * GLOW_SCALE);
    this.halo.scale.setScalar(s);
    const hop = Math.abs(Math.sin(p.bounce * Math.PI));
    const y = c.float * Math.sin(p.float * Math.PI * 2) + c.bounce * (hop - 0.4) * motion - c.sink;
    this.sphere.position.y = y;
    this.glass.position.y = y;
    this.halo.position.y = y;
  }
}
