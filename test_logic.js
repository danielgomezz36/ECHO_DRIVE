// Pruebas de la lógica de la demo.  Uso:  node test_logic.js
const assert = require('assert');
const L = require('./logic.js');

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ` esperado ${b}, obtenido ${a.toFixed(2)}`);

console.log('Reto 1 · daltonismo');
const OLD = ['#00E5FF', '#FFD600', '#00E676', '#2979FF'];   // paleta del perfil Deuteranopía del prototipo
const NEW = ['#FF6B6B', '#FFD600', '#00E5FF', '#2979FF'];   // paleta propuesta
test('paleta del prototipo: ΔE mínimo por tipo de visión', () => {
  near(L.minPairDeltaE(OLD, 'normal').de, 75.3, 0.2);
  near(L.minPairDeltaE(OLD, 'protanopia').de, 32.5, 0.2);
  near(L.minPairDeltaE(OLD, 'deuteranopia').de, 48.5, 0.2);
  near(L.minPairDeltaE(OLD, 'tritanopia').de, 11.6, 0.2);
});
test('paleta propuesta: ΔE mínimo por tipo de visión', () => {
  near(L.minPairDeltaE(NEW, 'normal').de, 83.3, 0.2);
  near(L.minPairDeltaE(NEW, 'protanopia').de, 47.6, 0.2);
  near(L.minPairDeltaE(NEW, 'deuteranopia').de, 52.9, 0.2);
  near(L.minPairDeltaE(NEW, 'tritanopia').de, 36.6, 0.2);
});
test('la propuesta mejora el peor caso', () => {
  const worst = (p) => Math.min(...['normal', 'protanopia', 'deuteranopia', 'tritanopia'].map((k) => L.minPairDeltaE(p, k).de));
  assert.ok(worst(NEW) > worst(OLD) * 3);
});
test('el gris no cambia con la simulación', () => {
  const g = L.simulate([0.5, 0.5, 0.5], 'deuteranopia');
  g.forEach((v) => near(v, 0.5, 0.01));
});

console.log('Reto 4 · gestor de avisos');
const T0 = 1000000;
const mk = (type, text) => ({ type, text: text || type });
test('un aviso crítico desplaza a uno de guía, que vuelve a la cola', () => {
  const m = new L.AlertManager();
  assert.strictEqual(m.push(mk('guia'), T0).status, 'shown');
  assert.strictEqual(m.push(mk('critico'), T0 + 10).status, 'preempted');
  assert.strictEqual(m.visible().length, 1);
  assert.strictEqual(m.visible()[0].type, 'critico');
  assert.strictEqual(m.queued()[0].type, 'guia');
});
test('un aviso de menor prioridad espera en cola', () => {
  const m = new L.AlertManager();
  m.push(mk('atencion'), T0);
  assert.strictEqual(m.push(mk('guia'), T0 + 5).status, 'queued');
  assert.strictEqual(m.visible()[0].type, 'atencion');
});
test('duplicados dentro del enfriamiento se ignoran (salvo crítico fuera de cola)', () => {
  const m = new L.AlertManager({ cooldownMs: 8000 });
  m.push(mk('guia', 'giro'), T0);
  m.tick(T0 + 5500);                                   // caduca (TTL 5 s)
  assert.strictEqual(m.visible().length, 0);
  assert.strictEqual(m.push(mk('guia', 'giro'), T0 + 6000).status, 'ignored');
  assert.strictEqual(m.push(mk('guia', 'giro'), T0 + 9000).status, 'shown');
});
test('la cola está acotada y descarta lo menos importante', () => {
  const m = new L.AlertManager({ maxQueue: 2 });
  m.push(mk('critico', 'c'), T0);
  m.push(mk('atencion', 'a'), T0 + 1);
  m.push(mk('guia', 'g'), T0 + 2);
  const r = m.push(mk('info', 'i'), T0 + 3);
  assert.strictEqual(r.status, 'dropped');
  assert.strictEqual(m.queued().length, 2);
});
test('al caducar el aviso activo se promueve el más prioritario de la cola', () => {
  const m = new L.AlertManager();
  m.push(mk('critico', 'c'), T0);
  m.push(mk('guia', 'g'), T0 + 1);
  m.push(mk('atencion', 'a'), T0 + 2);
  m.tick(T0 + 8001);
  assert.strictEqual(m.visible()[0].type, 'atencion');
});
test('los avisos viejos en cola se descartan', () => {
  const m = new L.AlertManager({ maxAgeMs: 15000 });
  m.push(mk('critico', 'c'), T0);
  m.push(mk('guia', 'g'), T0 + 1);
  m.tick(T0 + 8001);                                   // promueve 'guia' (tiene 8 s)
  assert.strictEqual(m.visible()[0].type, 'guia');
  const m2 = new L.AlertManager({ maxAgeMs: 5000 });
  m2.push(mk('critico', 'c'), T0);
  m2.push(mk('guia', 'g'), T0 + 1);
  m2.tick(T0 + 8001);
  assert.strictEqual(m2.visible().length, 0);
});
test('sin modo concentración todos los avisos se apilan', () => {
  const m = new L.AlertManager({ concentration: false });
  ['info', 'guia', 'atencion', 'critico'].forEach((t, i) => m.push(mk(t), T0 + i));
  assert.strictEqual(m.visible().length, 4);
});
test('elementos visibles: en marcha con modo concentración < sin modo', () => {
  const a = L.visibleElements({ concentration: true, moving: true, alerts: 1 }).length;
  const b = L.visibleElements({ concentration: false, moving: true, alerts: 4 }).length;
  assert.ok(a < b);
  assert.strictEqual(a, 3);
  assert.strictEqual(L.visibleElements({ concentration: true, moving: false, alerts: 0 }).length, 4);
});
test('estado de movimiento', () => {
  assert.strictEqual(L.movementState(0), 'parado');
  assert.strictEqual(L.movementState(4.9), 'parado');
  assert.strictEqual(L.movementState(5), 'en_marcha');
});

console.log('Reto 9 · feedback multimodal');
test('aviso crítico: siempre >= 2 canales', () => {
  const r = L.resolveChannels('critico', { visual: false, sound: true, haptic: false });
  assert.ok(r.channels.length >= 2);
  assert.deepStrictEqual(r.channels.sort(), ['sound', 'visual']);
  assert.deepStrictEqual(r.forced, ['visual']);
});
test('aviso crítico con todo desactivado: visual + háptico', () => {
  const r = L.resolveChannels('critico', { visual: false, sound: false, haptic: false });
  assert.deepStrictEqual(r.channels.sort(), ['haptic', 'visual']);
});
test('aviso crítico con canales suficientes: no se fuerza nada', () => {
  const r = L.resolveChannels('critico', { visual: true, sound: false, haptic: true });
  assert.deepStrictEqual(r.forced, []);
});
test('avisos no críticos respetan las preferencias (incluso silencio total)', () => {
  const r = L.resolveChannels('guia', { visual: false, sound: false, haptic: false });
  assert.deepStrictEqual(r.channels, []);
  assert.strictEqual(r.suppressed, true);
});
test('conductor con pérdida auditiva (sin sonido): visual + háptico sin forzar', () => {
  const r = L.resolveChannels('critico', { visual: true, sound: false, haptic: true });
  assert.deepStrictEqual(r.channels.sort(), ['haptic', 'visual']);
  assert.deepStrictEqual(r.forced, []);
});
test('patrón de vibración y escalado de intensidad', () => {
  assert.deepStrictEqual(L.toVibrateArray(L.PATTERNS.critico.haptic), [200, 80, 200, 80, 200]);
  assert.deepStrictEqual(L.toVibrateArray(L.PATTERNS.guia.haptic), [60]);
  assert.deepStrictEqual(L.scalePattern([[0, 100]], 1.4), [[0, 140]]);
});
test('cada tipo de aviso tiene un patrón sonoro y háptico distinto', () => {
  const sig = (p) => JSON.stringify([p.sound, p.haptic]);
  const set = new Set(Object.values(L.PATTERNS).map(sig));
  assert.strictEqual(set.size, Object.keys(L.PATTERNS).length);
});

console.log('Test de identificación (daltonismo)');
test('makeTrials: cada nivel aparece `reps` veces y es reproducible con semilla', () => {
  const lv = ['A', 'B', 'C', 'D'];
  const t1 = L.makeTrials(lv, 3, L.mulberry32(7)), t2 = L.makeTrials(lv, 3, L.mulberry32(7));
  assert.strictEqual(t1.length, 12);
  assert.deepStrictEqual(t1, t2);
  lv.forEach((l) => assert.strictEqual(t1.filter((x) => x === l).length, 3));
});
test('summarize: aciertos, tiempos y confusiones por condición', () => {
  const res = [
    { cond: 'A', shown: 'X', answer: 'X', rt: 1000 },
    { cond: 'A', shown: 'X', answer: 'Y', rt: 3000 },
    { cond: 'A', shown: 'Y', answer: 'Y', rt: 2000 },
    { cond: 'B', shown: 'X', answer: 'X', rt: 500 }
  ];
  const s = L.summarize(res);
  assert.strictEqual(s.A.n, 3); assert.strictEqual(s.A.ok, 2);
  near(s.A.acc, 2 / 3, 1e-9); near(s.A.meanRt, 2000, 1e-9); near(s.A.meanRtOk, 1500, 1e-9);
  assert.deepStrictEqual(s.A.conf, { 'X → Y': 1 });
  assert.strictEqual(s.B.acc, 1);
});
test('toCsv: cabecera, una fila por ensayo y escapado de comas/comillas', () => {
  const csv = L.toCsv({ pid: 'P1, "alias"', decl: 'No indicada', sim: 'deuteranopia' },
    [{ cond: 'A', n: 1, shown: 'Peligro', answer: 'Éxito', rt: 1234 }]).split('\n');
  assert.strictEqual(csv.length, 2);
  assert.strictEqual(csv[0].split(',').length, 9);
  assert.strictEqual(csv[1], '"P1, ""alias""",No indicada,deuteranopia,A,1,Peligro,Éxito,0,1234');
});

console.log(`\n${n} pruebas superadas`);
