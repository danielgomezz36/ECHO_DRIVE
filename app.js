/* EchoDrive · interfaz de la demo. La lógica "pura" está en logic.js (EchoLogic). */
(function () {
  'use strict';
  const L = window.EchoLogic;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------------------------- Pestañas ----------------------------- */
  const tabs = $$('[role=tab]');
  function selectTab(t) {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(n); n.focus();
    });
  });

  /* ---------------- Iconos y chips (codificación redundante) ---------------- */
  const ICONS = {
    oct: (c) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><polygon points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8" fill="${c}"/><text x="12" y="16.5" text-anchor="middle" font-size="13" font-weight="700" fill="#0B0F14">!</text></svg>`,
    tri: (c) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 23,21 1,21" fill="${c}"/><text x="12" y="18.5" text-anchor="middle" font-size="13" font-weight="700" fill="#0B0F14">!</text></svg>`,
    chk: (c) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="${c}"/><path d="M6.5 12.5l3.8 3.8 7.2-8" fill="none" stroke="#0B0F14" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    arr: (c) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><polygon points="2,9 13,9 13,3 22,12 13,21 13,15 2,15" fill="${c}"/></svg>`
  };
  function chipHtml(c, redundant) {
    if (!redundant) return `<div class="chip plain" style="--c:${c.color}"><span><span class="tx">${c.text}</span></span></div>`;
    return `<div class="chip ${c.role === 'critico' ? 'crit' : ''}" style="--c:${c.color}">${ICONS[c.icon](c.color)}<span><span class="lv">${c.label}</span><span class="tx">${c.text}</span></span></div>`;
  }

  /* ============================ RETO 1 ============================ */
  const PAL = {
    actual: {
      lane: ['#00E676', '#FFD600'],
      chips: [
        { role: 'principal', label: 'PRINCIPAL', text: 'Conectado a EchoDrive Hub', color: '#00E5FF', icon: 'chk' },
        { role: 'atencion', label: 'PELIGRO', text: 'Vehículo en punto ciego', color: '#FFD600', icon: 'tri' },
        { role: 'exito', label: 'ÉXITO', text: 'Dispositivos vinculados', color: '#00E676', icon: 'chk' },
        { role: 'guia', label: 'GUÍA', text: 'Gira en 350 m', color: '#2979FF', icon: 'arr' }
      ]
    },
    propuesta: {
      lane: ['#00E5FF', '#FFD600'],
      chips: [
        { role: 'critico', label: 'CRÍTICO', text: 'Frenar: peatón delante', color: '#FF6B6B', icon: 'oct' },
        { role: 'atencion', label: 'ATENCIÓN', text: 'Vehículo en punto ciego', color: '#FFD600', icon: 'tri' },
        { role: 'exito', label: 'ÉXITO', text: 'Perfil guardado', color: '#00E5FF', icon: 'chk' },
        { role: 'guia', label: 'GUÍA', text: 'Gira en 300 m', color: '#2979FF', icon: 'arr' }
      ]
    }
  };
  const KIND_LABEL = { normal: 'visión normal', protanopia: 'protanopía', deuteranopia: 'deuteranopía', tritanopia: 'tritanopía' };
  const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();

  function renderHud1() {
    const kind = $('#sim').value, pal = PAL[$('#pal').value], red = $('#redundant').checked;
    const [lc, rc] = pal.lane;
    const lane = `<div class="lane"><h3>Vista de carriles</h3>
      <svg viewBox="0 0 200 120" role="img" aria-label="Carril izquierdo correcto; borde derecho con aviso">
        <polygon points="30,118 170,118 135,26 65,26" fill="#0F151C"/>
        <line x1="42" y1="116" x2="72" y2="30" stroke="${lc}" stroke-width="5" stroke-linecap="round"/>
        <line x1="158" y1="116" x2="128" y2="30" stroke="${rc}" stroke-width="5" ${red ? 'stroke-dasharray="9 7"' : 'stroke-linecap="round"'}/>
        ${red ? `<text x="4" y="14" font-size="10" fill="${lc}" font-weight="700">● Izq.: OK</text><text x="196" y="14" font-size="10" fill="${rc}" text-anchor="end" font-weight="700">▲ Dcha.: aviso</text>` : ''}
      </svg></div>`;
    $('#hud1').innerHTML = lane + '<div class="chips">' + pal.chips.map((c) => chipHtml(c, red)).join('') + '</div>';
    $('#hud1').style.filter = kind === 'normal' ? 'none' : `url(#f-${kind})`;

    const best = L.minPairDeltaE(pal.chips.map((c) => c.color), kind);
    const risky = best.de < 30;
    $('#de-readout').innerHTML = `Distancia de color mínima (ΔE) entre los 4 colores de la paleta, con ${KIND_LABEL[kind]}: ` +
      `<b class="${risky ? 'bad' : 'good'}">${best.de.toFixed(1)}</b> (${cap(pal.chips[best.i].label)} ↔ ${cap(pal.chips[best.j].label)}) — ` +
      `${risky ? 'RIESGO DE CONFUSIÓN: no confíes solo en el color' : 'colores separables'}.`;
  }
  ['#sim', '#pal', '#redundant'].forEach((s) => $(s).addEventListener('change', renderHud1));

  /* ============================ RETO 4 ============================ */
  const mgr = new L.AlertManager({ concentration: true });
  const A_TEXT = { info: 'Conectado a EchoDrive Hub', guia: 'Gira a la derecha en 300 m', atencion: 'Vehículo en punto ciego', critico: 'Peatón delante: frena' };
  const A_CHIP = {
    info: { label: 'INFO', color: '#9AA7B5', icon: 'chk' },
    guia: { label: 'GUÍA', color: '#2979FF', icon: 'arr' },
    atencion: { label: 'ATENCIÓN', color: '#FFD600', icon: 'tri' },
    critico: { label: 'CRÍTICO', color: '#FF6B6B', icon: 'oct', role: 'critico' }
  };
  const A_NAME = { info: 'Info', guia: 'Guía', atencion: 'Atención', critico: 'Crítico' };
  let lastSig = '';

  function setStatus2(t) { $('#status2').textContent = t; }
  function fire(type) {
    const r = mgr.push({ type, text: A_TEXT[type] }, Date.now());
    const msg = {
      shown: `${A_NAME[type]}: mostrado.`,
      queued: `${A_NAME[type]}: en cola (hay un aviso igual o más importante en pantalla).`,
      preempted: `${A_NAME[type]}: tiene más prioridad y sustituye al aviso actual (el anterior vuelve a la cola).`,
      ignored: `${A_NAME[type]}: ignorado (${r.reason}: repetido hace menos de 8 s).`,
      dropped: `${A_NAME[type]}: descartado (${r.reason}).`
    }[r.status];
    setStatus2(msg); renderHud2(true);
  }

  function renderHud2(force) {
    const speed = +$('#speed').value, moving = L.movementState(speed) === 'en_marcha', conc = $('#conc').checked;
    const restricted = conc && moving, vis = mgr.visible(), q = mgr.queued();
    const sig = JSON.stringify([vis.map((a) => a.seq), q.map((a) => a.seq), restricted, conc]);
    if (!force && sig === lastSig) return;
    lastSig = sig;

    const alerts = vis.map((a) => chipHtml(Object.assign({ text: a.text }, A_CHIP[a.type]), true)).join('');
    $('#hud2').innerHTML =
      `<div class="blk nav"><h3>Navegación</h3><b>300 m</b>Gira a la derecha · Av. de la Constitución</div>
       <div class="alertslot">${alerts || '<span class="more">Sin avisos</span>'}${conc && q.length ? `<div class="more">+${q.length} en cola</div>` : ''}</div>
       ${restricted ? '<div class="blk folded">♪ Radio Clásica (plegado en marcha)</div>' : '<div class="blk"><h3>Reproductor</h3>Radio Clásica · Anterior · Pausa · Siguiente</div>'}
       ${restricted ? '<div class="blk locked"><h3>Ajustes y vista ADAS</h3>Bloqueados en marcha. Disponibles al parar o por voz.</div>' : '<div class="blk"><h3>Ajustes y vista ADAS</h3>Disponibles.</div>'}
       <div class="blk voice">Te escucho… · el control por voz siempre está disponible</div>`;

    const els = L.visibleElements({ concentration: conc, moving, alerts: vis.length });
    $('#elementsReadout').innerHTML = `Elementos compitiendo por la atención ahora: <b>${els.length}</b> (${els.join(', ')}).`;
  }

  $('#speed').addEventListener('input', () => {
    const s = +$('#speed').value;
    $('#speedOut').textContent = s + ' km/h';
    $('#moveState').textContent = L.movementState(s) === 'en_marcha' ? 'En marcha' : 'Parado';
    renderHud2(true);
  });
  $('#conc').addEventListener('change', () => { mgr.setConcentration($('#conc').checked); setStatus2(''); renderHud2(true); });
  $$('[data-fire]').forEach((b) => b.addEventListener('click', () => fire(b.dataset.fire)));
  $('#burst').addEventListener('click', () => ['guia', 'info', 'atencion', 'critico'].forEach(fire));
  $('#dismiss').addEventListener('click', () => { mgr.dismiss(Date.now()); renderHud2(true); });
  setInterval(() => { mgr.tick(Date.now()); renderHud2(false); }, 250);

  /* ============================ RETO 9 ============================ */
  const CH_NAME = { visual: 'Visual', sound: 'Sonoro', haptic: 'Háptico' };
  let audioCtx = null, hapticTimers = [], visualTimer = null;

  function ac() {
    if (!audioCtx) { const C = window.AudioContext || window.webkitAudioContext; if (C) audioCtx = new C(); }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function playSound(pattern, k, type) {
    const ctx = ac(); if (!ctx) return;
    const t0 = ctx.currentTime + 0.02, vol = Math.min(0.5, (type === 'critico' ? 0.2 : 0.1) * k);
    pattern.forEach(([s, e, f]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), a = t0 + s / 1000, b = t0 + e / 1000;
      o.type = type === 'critico' ? 'square' : 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(vol, a + 0.01);
      g.gain.setValueAtTime(vol, Math.max(a + 0.01, b - 0.02)); g.gain.linearRampToValueAtTime(0, b);
      o.connect(g); g.connect(ctx.destination); o.start(a); o.stop(b + 0.03);
    });
  }
  /* iPhone: Safari no ofrece navigator.vibrate, pero un <input type="checkbox" switch> da un toque háptico
     al activarse. Solo responde a pulsaciones del usuario y no controla la duración: es una aproximación
     (un toque por cada pulso del patrón). */
  const hs = { A: null, B: null };
  /* Variante A (la que usan las librerías de háptica web): <label for> + <input switch> por separado. */
  function buildA() {
    const inp = document.createElement('input'); inp.type = 'checkbox'; inp.setAttribute('switch', ''); inp.id = 'hsw-a'; inp.tabIndex = -1;
    const lab = document.createElement('label'); lab.htmlFor = 'hsw-a'; lab.className = 'hsw-a'; lab.setAttribute('aria-hidden', 'true');
    inp.className = 'hsw-a'; document.body.appendChild(inp); document.body.appendChild(lab); return lab;
  }
  /* Variante B: el interruptor dentro de la etiqueta. */
  function buildB() {
    const lab = document.createElement('label'); lab.className = 'hsw-b'; lab.setAttribute('aria-hidden', 'true');
    const inp = document.createElement('input'); inp.type = 'checkbox'; inp.setAttribute('switch', ''); inp.tabIndex = -1;
    lab.appendChild(inp); document.body.appendChild(lab); return lab;
  }
  function iosTick(v) {
    v = v || 'A';
    if (!hs[v]) hs[v] = v === 'A' ? buildA() : buildB();
    hs[v].click();
  }
  function iosPattern(p) { p.forEach((x) => { if (x[0] === 0) iosTick(); else setTimeout(iosTick, x[0]); }); }
  function hapticTick() { if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) { /* noop */ } } else iosTick(); }

  function playHaptic(pattern, k, sideMode) {
    const p = L.scalePattern(pattern, k);
    if (navigator.vibrate) { try { navigator.vibrate(L.toVibrateArray(p)); } catch (e) { /* sin vibración */ } }
    else iosPattern(p);
    const side = $('#side').value;
    const arcs = sideMode === 'both' ? [$('#arcL'), $('#arcR')] : [side === 'left' ? $('#arcL') : $('#arcR')];
    hapticTimers.forEach(clearTimeout); hapticTimers = [];
    p.forEach(([s, e]) => {
      hapticTimers.push(setTimeout(() => arcs.forEach((a) => a.classList.add('on')), s));
      hapticTimers.push(setTimeout(() => arcs.forEach((a) => a.classList.remove('on')), e));
    });
  }
  function sideName() { return $('#side').value === 'left' ? 'izquierda' : 'derecha'; }

  const EV_CHIP = (type) => ({
    guia: { label: 'GUÍA', color: '#2979FF', icon: 'arr', text: `Gira a la ${sideName()} en 300 m` },
    atencion: { label: 'ATENCIÓN', color: '#FFD600', icon: 'tri', text: `Vehículo en punto ciego (${sideName()})` },
    critico: { label: 'CRÍTICO', color: '#FF6B6B', icon: 'oct', role: 'critico', text: 'Peatón delante: frena' },
    confirmacion: { label: 'CONFIRMADO', color: '#00E5FF', icon: 'chk', text: 'Perfil guardado' }
  })[type];

  function playEvent(type, over) {
    const enabled = { visual: $('#chV').checked, sound: $('#chS').checked, haptic: $('#chH').checked };
    const r = L.resolveChannels(type, enabled), P = L.PATTERNS[type], k = +$('#inten').value;
    const chip = Object.assign(EV_CHIP(type), over || {});
    if (r.channels.includes('visual')) {
      $('#visualOut').innerHTML = chipHtml(chip, true);
      clearTimeout(visualTimer);
      visualTimer = setTimeout(() => { $('#visualOut').innerHTML = '<span class="muted">Sin aviso</span>'; }, 4500);
    }
    if (r.channels.includes('sound')) playSound(P.sound, k, type);
    if (r.channels.includes('haptic')) playHaptic(P.haptic, k, P.side);

    const li = document.createElement('li');
    const hora = new Date().toLocaleTimeString('es-ES');
    let txt = `${hora} · ${chip.text} · `;
    txt += r.channels.length ? r.channels.map((c) => CH_NAME[c]).join(' + ') : 'sin salida (silenciado por tus ajustes)';
    if (r.channels.includes('haptic') && P.side !== 'both') txt += ` (volante ${sideName()})`;
    if (r.forced.length) txt += ` · canal reactivado solo para este aviso crítico: ${r.forced.map((c) => CH_NAME[c]).join(', ')}`;
    li.textContent = txt;
    $('#log').prepend(li);
  }
  $$('[data-ev]').forEach((b) => b.addEventListener('click', () => playEvent(b.dataset.ev)));
  $('#vibSupport').textContent = navigator.vibrate
    ? 'El navegador ofrece la API de vibración (solo vibrará en dispositivos con motor háptico, p. ej. un móvil Android). Aquí también se simula en el volante.'
    : 'Este navegador no ofrece vibración web (iPhone/Safari). Se usa la alternativa de toques hápticos de Safari: un toque por pulso, solo al pulsar un botón y sin controlar la duración. También se simula en el volante.';
  $('#vibTest').addEventListener('click', () => { playHaptic(L.PATTERNS.critico.haptic, +$('#inten').value, 'both'); });

  /* --- Diagnóstico de vibración (para localizar qué método funciona en cada dispositivo) --- */
  const ua = navigator.userAgent || '';
  const m = /OS (\d+)[_.](\d+)/.exec(ua);
  $('#diagInfo').textContent = `Navegador: ${/iPhone|iPad/.test(ua) ? 'iOS' + (m ? ' ' + m[1] + '.' + m[2] + ' (según el navegador)' : '') : 'no es iPhone/iPad'} · navigator.vibrate: ${navigator.vibrate ? 'sí' : 'no'} · página segura (https): ${window.isSecureContext ? 'sí' : 'no'}`;
  $('#diagA').addEventListener('click', () => { iosTick('A'); $('#diagMsg').textContent = 'Enviado el toque por código (variante A). ¿Lo has notado?'; });
  $('#diagB').addEventListener('click', () => { iosTick('B'); $('#diagMsg').textContent = 'Enviado el toque por código (variante B). ¿Lo has notado?'; });
  $('#diagReal').addEventListener('change', () => { $('#diagMsg').textContent = 'Has tocado el interruptor real. ¿Lo has notado?'; });

  /* --- SOS: confirmar manteniendo pulsado (feedback continuo) --- */
  const HOLD_MS = 1500, CIRC = 163.4;
  const sos = $('#sos'), ring = $('#ring'), st = $('#sosStatus'), undo = $('#undo');
  let holdStart = null, raf = null, undoTimer = null;

  function startHold() {
    if (holdStart !== null) return;
    holdStart = performance.now();
    st.textContent = 'Mantén pulsado… (1,5 s)';
    hapticTick();
    playSound([[0, 40, 700]], 0.8, 'guia');
    loop();
  }
  function loop() {
    const p = Math.min(1, (performance.now() - holdStart) / HOLD_MS);
    ring.style.strokeDashoffset = CIRC * (1 - p);
    if (p >= 1) { finishHold(); return; }
    raf = requestAnimationFrame(loop);
  }
  function cancelHold() {
    if (holdStart === null) return;
    cancelAnimationFrame(raf); holdStart = null; ring.style.strokeDashoffset = CIRC;
    st.textContent = 'Soltaste antes de tiempo: SOS no enviado.';
    playSound([[0, 120, 300]], 0.8, 'guia');
  }
  function finishHold() {
    holdStart = null; ring.style.strokeDashoffset = CIRC;
    st.textContent = 'SOS enviado (simulado). Puedes deshacerlo durante 5 s.';
    playEvent('confirmacion', { label: 'ENVIADO', text: 'SOS enviado (simulado)' });
    let left = 5; undo.hidden = false; $('#undoLeft').textContent = left;
    clearInterval(undoTimer);
    undoTimer = setInterval(() => {
      left -= 1; $('#undoLeft').textContent = left;
      if (left <= 0) { clearInterval(undoTimer); undo.hidden = true; st.textContent = 'SOS enviado (simulado).'; }
    }, 1000);
  }
  undo.addEventListener('click', () => {
    clearInterval(undoTimer); undo.hidden = true; st.textContent = 'SOS cancelado.';
    playSound([[0, 120, 300], [160, 280, 220]], 0.8, 'guia');
  });
  sos.addEventListener('pointerdown', (e) => { e.preventDefault(); startHold(); });
  sos.addEventListener('pointerleave', cancelHold);
  window.addEventListener('pointerup', cancelHold);
  window.addEventListener('pointercancel', cancelHold);
  sos.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHold(); } });
  sos.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') cancelHold(); });
  sos.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ===================== TEST DE DALTONISMO ===================== */
  const T_COND = {
    A: { name: 'A · Diseño anterior (solo color)', chips: PAL.actual.chips, red: false },
    B: { name: 'B · Diseño propuesto (color + icono + etiqueta)', chips: PAL.propuesta.chips, red: true }
  };
  const T = { order: ['A', 'B'], idx: 0, trials: [], k: 0, results: [], t0: 0, meta: {}, busy: false };
  const tStage = $('#tStage');
  function tRender(html) {
    tStage.innerHTML = html;
    const sim = $('#tSim').value;
    tStage.style.filter = sim === 'normal' ? 'none' : `url(#f-${sim})`;
  }
  function tLegend() {
    const c = T_COND[T.order[T.idx]];
    tRender(`<h3>Referencia · ${c.name}</h3>
      <p class="small">Estos son los niveles de aviso de este diseño. Fíjate bien: después verás avisos sueltos y tendrás que decir de qué nivel son.</p>
      <div class="chips">${c.chips.map((x) => chipHtml(Object.assign({}, x, { text: c.red ? 'Ejemplo de aviso' : cap(x.label) }), c.red)).join('')}</div>
      <button id="tGo" class="primary">Entendido, empezar (${T.order.indexOf(T.order[T.idx]) + 1} de 2)</button>`);
  }
  function tNext() {
    const cond = T.order[T.idx], c = T_COND[cond];
    if (T.k >= T.trials.length) {
      T.idx++;
      if (T.idx < T.order.length) tLegend(); else tShowResults();
      return;
    }
    const level = T.trials[T.k], chip = c.chips.find((x) => x.label === level);
    tRender(`<div class="prog">${c.name} · ensayo ${T.k + 1} de ${T.trials.length}</div>
      ${chipHtml(Object.assign({}, chip, { text: 'Mensaje del sistema' }), c.red)}
      <p class="small">¿De qué nivel es este aviso?</p>
      <div class="answers">${c.chips.map((x) => `<button data-ans="${x.label}">${cap(x.label)}</button>`).join('')}</div>`);
    T.t0 = performance.now(); T.busy = false;
  }
  function tShowResults() {
    const sum = L.summarize(T.results), csv = L.toCsv(T.meta, T.results);
    const rows = T.order.map((k) => {
      const s = sum[k]; if (!s) return '';
      const conf = Object.keys(s.conf).sort((a, b) => s.conf[b] - s.conf[a]).slice(0, 3).map((x) => `${cap(x.split(' → ')[0])} → ${cap(x.split(' → ')[1])} (${s.conf[x]})`).join('; ') || '—';
      return `<tr><td>${T_COND[k].name}</td><td>${s.ok} / ${s.n}</td><td>${(s.acc * 100).toFixed(0)} %</td><td>${Math.round(s.meanRt)} ms</td><td>${conf}</td></tr>`;
    }).join('');
    tRender('<h3>Test terminado</h3><p class="small">Gracias. Resultados abajo.</p>');
    $('#tResults').innerHTML = `<h2>Resultados de ${T.meta.pid} (${T.meta.decl}; simulación: ${KIND_LABEL[T.meta.sim]})</h2>
      <table class="rtable"><tr><th>Condición</th><th>Aciertos</th><th>% acierto</th><th>Tiempo medio</th><th>Confusiones más frecuentes</th></tr>${rows}</table>
      <p class="small">CSV (una fila por ensayo). Cópialo o descárgalo para tu hoja de cálculo:</p>
      <textarea class="csv" id="csvOut" readonly aria-label="Resultados en CSV"></textarea>
      <div class="controls"><button id="tCopy">Copiar CSV</button><button id="tDl">Descargar CSV</button><button id="tReset">Nuevo participante</button></div>
      <p id="tMsg" class="readout" aria-live="polite"></p>`;
    $('#csvOut').value = csv;
  }
  $('#tStart').addEventListener('click', () => {
    T.order = $('#tOrder').value.split('');
    T.meta = { pid: $('#tPid').value.trim() || 'sin-codigo', decl: $('#tDecl').value, sim: $('#tSim').value };
    T.reps = +$('#tReps').value; T.results = []; T.idx = 0; T.k = 0; T.trials = [];
    $('#tResults').innerHTML = '';
    tLegend();
  });
  tStage.addEventListener('click', (e) => {
    if (e.target.closest('#tGo')) {
      const c = T_COND[T.order[T.idx]];
      T.trials = L.makeTrials(c.chips.map((x) => x.label), T.reps); T.k = 0; tNext(); return;
    }
    const b = e.target.closest('[data-ans]');
    if (!b || T.busy) return;
    T.busy = true;
    const rt = Math.round(performance.now() - T.t0);
    T.results.push({ cond: T.order[T.idx], n: T.k + 1, shown: T.trials[T.k], answer: b.dataset.ans, rt });
    T.k++;
    tRender('<div class="blank" aria-hidden="true"></div>');
    setTimeout(tNext, 450);
  });
  $('#tResults').addEventListener('click', (e) => {
    const msg = (t) => { $('#tMsg').textContent = t; };
    if (e.target.id === 'tCopy') {
      const txt = $('#csvOut').value;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => msg('CSV copiado.'), () => { $('#csvOut').select(); msg('No se pudo copiar solo: el texto está seleccionado, cópialo a mano.'); });
      else { $('#csvOut').select(); msg('Texto seleccionado: cópialo a mano.'); }
    }
    if (e.target.id === 'tDl') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([$('#csvOut').value], { type: 'text/csv' }));
      a.download = `test_daltonismo_${T.meta.pid}.csv`; document.body.appendChild(a); a.click(); a.remove(); msg('Descarga iniciada.');
    }
    if (e.target.id === 'tReset') { $('#tResults').innerHTML = ''; tRender('<p class="muted">Rellena los datos y pulsa «Empezar test».</p>'); $('#tPid').value = ''; }
  });

  /* ------------------------------ Inicio ------------------------------ */
  renderHud1();
  renderHud2(true);
})();
