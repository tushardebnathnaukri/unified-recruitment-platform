import * as THREE from 'three';

const LABELS = {
  idle: 'Idle', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking',
  sleeping: 'Sleeping', error: 'Something went wrong',
};

/**
 * Shared engine for every avatar variant: status + emotion blending, audio,
 * impulses, pointer follow, render loop. Variants supply presets and implement
 * `_build()` (scene setup) and `_frame(params, dt, motion)` (per-frame update).
 *
 *   avatar.setState('thinking');
 *   avatar.emote('happy');            // transient, returns to previous emotion
 *   avatar.setEmotion('sad');         // held until cleared with setEmotion(null)
 *   avatar.setAudioLevel(0.6);        // 0..1, drives listening/speaking
 *
 * spec: { defaults, colorKeys, states, emotions, phases, impulses, options, cameraZ }
 *   phases   — { phaseName: 'speedParam' } accumulated each frame (avoids jumps when speeds change)
 *   impulses — { name: decayPerSecond } one-shot values fired by presets' `impulse` field
 */
export class AvatarBase {
  constructor(container, options, spec) {
    this.container = container;
    this.spec = spec;
    this.opts = { followPointer: true, autoSpeak: true, maxPixelRatio: 2, ...spec.options, ...options };

    const { defaults, colorKeys } = spec;
    this._colorKeys = colorKeys;
    this._numericKeys = Object.keys(defaults).filter((k) => !colorKeys.includes(k));
    const base = this._toParams(defaults);
    this._states = Object.fromEntries(Object.entries(spec.states).map(([k, v]) => [k, { ...base, ...this._toParams(v) }]));
    this._emotions = Object.fromEntries(Object.entries(spec.emotions).map(([k, v]) => [k, this._toParams(v)]));
    this.states = Object.keys(spec.states);
    this.emotions = Object.keys(spec.emotions);

    this.state = 'idle';
    this.emotion = null;
    this._heldEmotion = null;
    this._emotionWeight = 0;
    this._emotionTarget = 0;
    this._emoteTimer = null;

    this._audio = 0;
    this._audioInput = 0;
    this._audioInputAt = -Infinity;
    this._analyser = null;

    this.cur = this._clone(this._states.idle);
    this._target = this._clone(this._states.idle);
    this._impulse = Object.fromEntries(Object.keys(spec.impulses).map((k) => [k, 0]));
    this._phase = Object.fromEntries(Object.keys(spec.phases).map((k) => [k, 0]));
    this._pointer = new THREE.Vector2();
    this._look = new THREE.Vector2();
    this._time = 0;
    this._last = performance.now();
    this._reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._initRenderer();
    this._build();
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.container);
    this._resize();
    this._bindEvents();
    this._setAria();
    this._raf = requestAnimationFrame(this._tick);
  }

  // ---------- public API ----------

  setState(name) {
    if (!this.spec.states[name]) throw new Error(`Unknown state "${name}". Try: ${this.states.join(', ')}`);
    if (name === this.state) return;
    this.state = name;
    this._fireImpulse(this.spec.states[name].impulse);
    this._setAria();
  }

  /** Hold an emotion until changed. Pass null to clear. */
  setEmotion(name, { intensity = 1 } = {}) {
    clearTimeout(this._emoteTimer);
    this._heldEmotion = name ? { name, intensity } : null;
    this._applyEmotion(name, intensity);
  }

  /** Play an emotion briefly, then fall back to whatever was held before. */
  emote(name, { duration = 2600, intensity = 1 } = {}) {
    clearTimeout(this._emoteTimer);
    this._applyEmotion(name, intensity);
    this._emoteTimer = setTimeout(() => {
      const held = this._heldEmotion;
      this._applyEmotion(held?.name ?? null, held?.intensity ?? 1, false);
    }, duration);
  }

  /** Feed a 0..1 loudness value (e.g. from TTS or mic). */
  setAudioLevel(level) {
    this._audioInput = THREE.MathUtils.clamp(level, 0, 1);
    this._audioInputAt = this._time;
  }

  /** Let the avatar read loudness from any Web Audio node (mic, <audio> element, TTS stream). */
  connectAudio(sourceNode) {
    this.disconnectAudio();
    const analyser = sourceNode.context.createAnalyser();
    analyser.fftSize = 512;
    sourceNode.connect(analyser);
    this._analyser = { node: analyser, source: sourceNode, buf: new Float32Array(analyser.fftSize) };
  }

  disconnectAudio() {
    if (!this._analyser) return;
    try { this._analyser.source.disconnect(this._analyser.node); } catch { /* already gone */ }
    this._analyser = null;
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    clearTimeout(this._emoteTimer);
    this.disconnectAudio();
    this._resizeObserver.disconnect();
    window.removeEventListener('pointermove', this._onPointer);
    this.scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    this._disposeExtra?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ---------- hooks for variants ----------

  _build() {}
  _frame(/* params, dt, motion */) {}
  _onResize(/* w, h */) {}
  _render() { this.renderer.render(this.scene, this.camera); }

  // ---------- internals ----------

  _toParams(preset) {
    const out = {};
    for (const [k, v] of Object.entries(preset)) {
      if (k === 'impulse') continue;
      out[k] = this._colorKeys.includes(k) ? new THREE.Color(v) : v;
    }
    return out;
  }

  _clone(p) {
    const out = { ...p };
    for (const k of this._colorKeys) out[k] = p[k].clone();
    return out;
  }

  _initRenderer() {
    const transparent = this.opts.background == null;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: transparent, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.opts.maxPixelRatio));
    this.renderer.setClearColor(0x000000, transparent ? 0 : 1);
    Object.assign(this.renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // scene.background rather than setClearColor: r186's composer gamma-encodes the clear colour twice.
    if (!transparent) this.scene.background = new THREE.Color(this.opts.background);
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    this.camera.position.set(0, 0, this.spec.cameraZ ?? 5.6);
  }

  _resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Keep the avatar fully in view on narrow (portrait) containers.
    this.camera.position.z = (this.spec.cameraZ ?? 5.6) / Math.min(1, aspect);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this._onResize(w, h);
  }

  _bindEvents() {
    this._onPointer = (e) => {
      const r = this.container.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      this._pointer.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
    };
    if (this.opts.followPointer) window.addEventListener('pointermove', this._onPointer, { passive: true });
  }

  _applyEmotion(name, intensity, fire = true) {
    if (name && !this.spec.emotions[name]) throw new Error(`Unknown emotion "${name}". Try: ${this.emotions.join(', ')}`);
    if (name) {
      if (fire || name !== this.emotion) this._fireImpulse(this.spec.emotions[name].impulse, intensity);
      this.emotion = name;
      this._emotionTarget = intensity;
    } else {
      this._emotionTarget = 0; // emotion is dropped once the blend fades out
    }
    this._setAria();
  }

  _fireImpulse(impulse, scale = 1) {
    if (!impulse) return;
    for (const [k, v] of Object.entries(impulse)) {
      if (k in this._impulse) this._impulse[k] = Math.max(this._impulse[k], v * scale);
    }
  }

  _setAria() {
    const label = `AI assistant: ${LABELS[this.state]}${this._emotionTarget > 0 && this.emotion ? `, ${this.emotion}` : ''}`;
    this.container.setAttribute('role', 'img');
    this.container.setAttribute('aria-label', label);
  }

  _composeTarget(dt) {
    const base = this._states[this.state];
    const t = this._target;
    for (const k of this._numericKeys) t[k] = base[k];
    for (const k of this._colorKeys) t[k].copy(base[k]);

    this._emotionWeight += (this._emotionTarget - this._emotionWeight) * (1 - Math.exp(-dt * 4));
    if (this._emotionTarget === 0 && this._emotionWeight < 0.003) {
      this._emotionWeight = 0;
      if (this.emotion) { this.emotion = null; this._setAria(); }
    }
    const emo = this.emotion && this._emotions[this.emotion];
    const w = Math.min(this._emotionWeight, 1);
    if (emo && w > 0) {
      for (const [k, v] of Object.entries(emo)) {
        if (k === 'ease') continue;
        if (this._colorKeys.includes(k)) t[k].lerp(v, w);
        else t[k] += (v - t[k]) * w;
      }
    }
    return t;
  }

  _updateAudio(dt) {
    let level = 0;
    if (this._analyser) {
      const { node, buf } = this._analyser;
      node.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      level = Math.min(1, Math.sqrt(sum / buf.length) * 5);
    } else if (this._time - this._audioInputAt < 0.4) {
      level = this._audioInput;
    } else if (this.opts.autoSpeak && this.state === 'speaking') {
      const t = this._time;
      const syllables = Math.abs(Math.sin(t * 9.3) * Math.sin(t * 3.7 + 1.3));
      const phrase = Math.sin(t * 0.9) > -0.55 ? 1 : 0.08;
      level = (0.25 + 0.75 * syllables) * phrase * 0.8;
    }
    // Fast attack, slower release.
    const rate = level > this._audio ? 18 : 6;
    this._audio += (level - this._audio) * (1 - Math.exp(-dt * rate));
  }

  _tick = (now) => {
    this._raf = requestAnimationFrame(this._tick);
    const dt = Math.min((now - this._last) / 1000, 1 / 20);
    this._last = now;
    this._time += dt;

    const motion = this._reducedMotion ? 0.4 : 1;
    const target = this._composeTarget(dt);
    const c = this.cur;
    const k = 1 - Math.exp(-dt * target.ease);
    for (const key of this._numericKeys) c[key] += (target[key] - c[key]) * k;
    for (const key of this._colorKeys) c[key].lerp(target[key], k);

    this._updateAudio(dt);
    for (const [name, decay] of Object.entries(this.spec.impulses)) this._impulse[name] *= Math.exp(-dt * decay);
    for (const [name, speedKey] of Object.entries(this.spec.phases)) this._phase[name] += c[speedKey] * dt * motion;
    this._look.lerp(this._pointer, 1 - Math.exp(-dt * 2.5));

    this._frame(c, dt, motion);
    this._render();
  };
}
