/*
 * EchoDrive · lógica pura de la demo (sin DOM, comprobable con Node).
 *  - Simulación de deficiencias de color (Machado, Oliveira y Fernandes, 2009; severidad 1.0)
 *    y distancia de color ΔE (CIE76) entre los colores de una paleta.
 *  - Gestor de avisos con prioridad ("modo concentración").
 *  - Reglas de canales (visual / sonoro / háptico) y patrones de feedback.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EchoLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Reto 1 · Daltonismo                                                  */
  /* ------------------------------------------------------------------ */
  const MATRICES = {
    protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
  };

  const hexToRgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255); };
  const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const l2s = (c) => { c = Math.min(1, Math.max(0, c)); return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; };

  function simulate(rgb, kind) {
    if (kind === 'normal' || !MATRICES[kind]) return rgb.slice();
    const lin = rgb.map(s2l);
    return MATRICES[kind].map((r) => l2s(r[0] * lin[0] + r[1] * lin[1] + r[2] * lin[2]));
  }

  function toLab(rgb) {
    const [r, g, b] = rgb.map(s2l);
    const X = 0.4124 * r + 0.3576 * g + 0.1805 * b;
    const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(X / 0.95047), fy = f(Y / 1.0), fz = f(Z / 1.08883);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  const deltaE = (a, b) => { const A = toLab(a), B = toLab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };

  /** Par de colores más parecido de una paleta (hex[]) bajo un tipo de visión. */
  function minPairDeltaE(hexList, kind) {
    const sim = hexList.map((h) => simulate(hexToRgb(h), kind));
    let best = { de: Infinity, i: -1, j: -1 };
    for (let i = 0; i < sim.length; i++) for (let j = i + 1; j < sim.length; j++) {
      const d = deltaE(sim[i], sim[j]);
      if (d < best.de) best = { de: d, i, j };
    }
    return best;
  }

  /* ------------------------------------------------------------------ */
  /* Reto 4 · Multitarea y distracción                                    */
  /* ------------------------------------------------------------------ */
  const PRIORITY = { info: 0, guia: 1, atencion: 2, critico: 3 };
  const TTL_MS = { info: 4000, guia: 5000, atencion: 6000, critico: 8000 };
  const SPEED_THRESHOLD_KMH = 5; // hipótesis de diseño: parámetro a validar con usuarios

  const movementState = (speed, th) => (speed >= (th == null ? SPEED_THRESHOLD_KMH : th) ? 'en_marcha' : 'parado');

  class AlertManager {
    constructor(opts) {
      opts = opts || {};
      this.concentration = opts.concentration !== false;
      this.maxQueue = opts.maxQueue || 3;
      this.cooldownMs = opts.cooldownMs || 8000;
      this.maxAgeMs = opts.maxAgeMs || 15000; // un aviso en cola más viejo que esto ya no es útil
      this.reset();
    }
    reset() { this.active = null; this.queue = []; this.stack = []; this.lastShown = {}; this._seq = 0; }
    setConcentration(on) { this.concentration = !!on; this.reset(); }
    _key(a) { return a.type + '|' + a.text; }
    _activate(a, now) { this.active = Object.assign({}, a, { start: now }); this.lastShown[this._key(a)] = now; }
    _sortQueue() { this.queue.sort((x, y) => (PRIORITY[y.type] - PRIORITY[x.type]) || (x.seq - y.seq)); }

    /** Devuelve {status: 'shown'|'queued'|'preempted'|'ignored'|'dropped', reason?} */
    push(alert, now) {
      const a = Object.assign({}, alert, { seq: ++this._seq, at: now });
      const key = this._key(a);

      if (!this.concentration) { // prototipo actual: todo se apila
        this.stack.push(Object.assign({}, a, { start: now }));
        return { status: 'shown' };
      }
      const isDup = (this.active && this._key(this.active) === key) || this.queue.some((q) => this._key(q) === key);
      const recent = this.lastShown[key] != null && now - this.lastShown[key] < this.cooldownMs;
      if (isDup || (recent && a.type !== 'critico')) return { status: 'ignored', reason: 'duplicado' };

      if (!this.active) { this._activate(a, now); return { status: 'shown' }; }

      if (PRIORITY[a.type] > PRIORITY[this.active.type]) {
        const prev = this.active;
        if (prev.type !== 'info') { this.queue.push(Object.assign({}, prev, { seq: prev.seq })); }
        this._activate(a, now); this._sortQueue(); this._trim();
        return { status: 'preempted' };
      }
      this.queue.push(a); this._sortQueue();
      const dropped = this._trim();
      return dropped === a ? { status: 'dropped', reason: 'cola llena' } : { status: 'queued' };
    }
    _trim() {
      let dropped = null;
      while (this.queue.length > this.maxQueue) dropped = this.queue.pop();
      return dropped;
    }
    _promote(now) {
      this.queue = this.queue.filter((q) => now - q.at <= this.maxAgeMs);
      this._sortQueue();
      this.active = null;
      if (this.queue.length) this._activate(this.queue.shift(), now);
    }
    tick(now) {
      if (!this.concentration) { this.stack = this.stack.filter((s) => now - s.start < TTL_MS[s.type]); return; }
      if (this.active && now - this.active.start >= TTL_MS[this.active.type]) this._promote(now);
      else if (!this.active && this.queue.length) this._promote(now);
    }
    dismiss(now) { if (this.active) this._promote(now); }
    visible() { return this.concentration ? (this.active ? [this.active] : []) : this.stack.slice(); }
    queued() { return this.queue.slice(); }
  }

  /** Elementos de interfaz que compiten por la atención del conductor. */
  function visibleElements(o) {
    const els = ['Navegación', 'Control por voz'];
    const restricted = o.concentration && o.moving;
    if (!restricted) els.push('Reproductor y controles', 'Pestañas y ajustes');
    for (let i = 0; i < (o.alerts || 0); i++) els.push('Aviso ' + (i + 1));
    return els;
  }

  /* ------------------------------------------------------------------ */
  /* Reto 9 · Feedback multimodal                                         */
  /* ------------------------------------------------------------------ */
  // [inicio_ms, fin_ms, frecuencia_Hz] y [inicio_ms, fin_ms]
  const PATTERNS = {
    critico:      { label: 'Crítico',      sound: [[0, 120, 1200], [180, 300, 1200], [360, 480, 1200]], haptic: [[0, 200], [280, 480], [560, 760]], side: 'both' },
    atencion:     { label: 'Atención',     sound: [[0, 150, 800], [250, 400, 800]],                     haptic: [[0, 120], [220, 340]],            side: 'risk' },
    guia:         { label: 'Guía',         sound: [[0, 200, 520]],                                      haptic: [[0, 60]],                         side: 'turn' },
    confirmacion: { label: 'Confirmación', sound: [[0, 100, 600], [130, 230, 900]],                     haptic: [[0, 40], [90, 130]],              side: 'both' }
  };
  const CHANNEL_ORDER = ['visual', 'haptic', 'sound']; // orden en que se "rescata" un canal si hace falta

  /**
   * Decide por qué canales sale un aviso.
   * Regla: un aviso crítico sale siempre por >= 2 canales; si el conductor desactivó
   * demasiados, se reactivan (solo para ese aviso) en el orden visual, háptico, sonoro.
   */
  function resolveChannels(type, enabled) {
    const on = ['visual', 'sound', 'haptic'].filter((c) => enabled[c]);
    if (type !== 'critico') return { channels: on, forced: [], suppressed: on.length === 0 };
    const channels = on.slice(), forced = [];
    for (const c of CHANNEL_ORDER) {
      if (channels.length >= 2) break;
      if (!channels.includes(c)) { channels.push(c); forced.push(c); }
    }
    return { channels, forced, suppressed: false };
  }

  const scalePattern = (arr, k) => arr.map((p) => p.map((v, i) => (i < 2 ? Math.round(v * k) : v)));

  /** [[s,e],...] -> patrón para navigator.vibrate ([vibra, pausa, vibra, ...]) */
  function toVibrateArray(haptic) {
    const out = [];
    haptic.forEach((p, i) => {
      out.push(p[1] - p[0]);
      if (i < haptic.length - 1) out.push(haptic[i + 1][0] - p[1]);
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Test de identificación de avisos (daltonismo)                        */
  /* ------------------------------------------------------------------ */
  /** Generador pseudoaleatorio con semilla (para pruebas reproducibles). */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  /** Lista de ensayos: cada nivel aparece `reps` veces, en orden aleatorio. */
  function makeTrials(levels, reps, rnd) {
    const list = [];
    for (let r = 0; r < reps; r++) levels.forEach((l) => list.push(l));
    return shuffle(list, rnd || Math.random);
  }
  /** results: [{cond, shown, answer, rt}] -> por condición: n, ok, acc, meanRt, meanRtOk, conf{} */
  function summarize(results) {
    const by = {};
    results.forEach((r) => {
      const c = by[r.cond] = by[r.cond] || { n: 0, ok: 0, rt: 0, rtOk: 0, conf: {} };
      c.n++; c.rt += r.rt;
      if (r.shown === r.answer) { c.ok++; c.rtOk += r.rt; }
      else { const k = r.shown + ' → ' + r.answer; c.conf[k] = (c.conf[k] || 0) + 1; }
    });
    Object.keys(by).forEach((k) => {
      const c = by[k];
      c.acc = c.n ? c.ok / c.n : 0; c.meanRt = c.n ? c.rt / c.n : 0; c.meanRtOk = c.ok ? c.rtOk / c.ok : 0;
    });
    return by;
  }
  const csvField = (v) => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  /** CSV (separado por comas) con una fila por ensayo. */
  function toCsv(meta, results) {
    const head = ['participante', 'vision_declarada', 'simulacion', 'condicion', 'ensayo', 'nivel_mostrado', 'respuesta', 'acierto', 'tiempo_ms'];
    const rows = results.map((r) => [meta.pid, meta.decl, meta.sim, r.cond, r.n, r.shown, r.answer, r.shown === r.answer ? 1 : 0, r.rt].map(csvField).join(','));
    return [head.join(',')].concat(rows).join('\n');
  }

  return {
    MATRICES, hexToRgb, simulate, toLab, deltaE, minPairDeltaE,
    PRIORITY, TTL_MS, SPEED_THRESHOLD_KMH, movementState, AlertManager, visibleElements,
    PATTERNS, resolveChannels, scalePattern, toVibrateArray,
    mulberry32, shuffle, makeTrials, summarize, toCsv
  };
});
