/* Inquietos Caninos — presupuestos, recibos, agenda y ajustes (PWA sin servidor) */
'use strict';

/* ======================= UTILIDADES ======================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const money = (n) => (n < 0 ? '-$' : '$') + nf.format(Math.abs(Math.round(n)));
const pctTxt = (p) => String(+(+p).toFixed(2)).replace('.', ',') + '%';
const clampN = (v, a, b) => Math.min(b, Math.max(a, v));

function lsGet(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio / privado */ } }

function parseDate(s) { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return y ? new Date(y, m - 1, d) : null; }
function fmtDate(s) { const d = parseDate(s); return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : ''; }
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function todayStr() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; }
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function setPath(o, p, v) {
  const ks = p.split('.'); let a = o;
  ks.slice(0, -1).forEach((k) => { if (typeof a[k] !== 'object' || a[k] === null) a[k] = {}; a = a[k]; });
  a[ks[ks.length - 1]] = v;
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 3200);
}

function waNumber(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = '549' + d;            // número argentino sin código de país
  else if (d.startsWith('54') && !d.startsWith('549') && d.length === 12) d = '549' + d.slice(2);
  return d;
}
const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;

/* base64url + compresión para el link del tutor */
function b64u(bytes) {
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64u(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out;
}
async function encodePayload(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if ('CompressionStream' in window) {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return 'z' + b64u(new Uint8Array(await new Response(stream).arrayBuffer()));
    } catch { /* sigue sin comprimir */ }
  }
  return 'j' + b64u(bytes);
}
async function decodePayload(str) {
  const kind = str[0], bytes = unb64u(str.slice(1));
  let data = bytes;
  if (kind === 'z') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    data = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return JSON.parse(new TextDecoder().decode(data));
}

/* ======================= CONFIGURACIÓN ======================= */
/* config.js (window.INQUIETOS) es la fuente: lo comparten la web y la app. */
const SITE = window.INQUIETOS || {};
function fromSite(S) {
  const c = clone(S) || {};
  c.negocio = c.negocio || 'Inquietos Caninos';
  c.telefono = S.whatsapp || '';
  c.redes = S.instagram ? '@' + String(S.instagram).replace(/^@/, '') : '';
  delete c.whatsapp; delete c.instagram;
  c.condiciones = Array.isArray(S.condiciones) ? S.condiciones.join('\n') : (S.condiciones || '');
  c.aviso = typeof S.aviso === 'string' ? { texto: S.aviso } : Object.assign({ texto: '' }, S.aviso);
  c.textos = Object.assign({}, S.textos);
  c.educador = Object.assign({ titulo: '', texto: '', puntos: [] }, S.educador);
  c.requisitos = Object.assign({ llevar: [], vacunas: [] }, S.requisitos);
  c.cupos = Object.assign({ activo: true, capacidad: 5, avisoQuedan: 2 }, S.cupos);
  c.adaptacion = Object.assign({ activa: true, nombre: 'Visita de adaptación', pct: 50, fijo: 0, porPerro: true, validezDias: 30, texto: '' }, S.adaptacion);
  ['servicios', 'extras', 'pagos', 'tamanos', 'fechasEspeciales', 'preguntas', 'forma', 'fotos', 'opiniones'].forEach((k) => { if (!Array.isArray(c[k])) c[k] = []; });
  if (!c.servicios.length) c.servicios = [{ nombre: 'Estadía', precio: 0, cobro: 'dia', unidad: 'día', unidadPlural: 'días' }];
  if (c.mostrarPrecios === undefined) c.mostrarPrecios = true;
  c.horaIn = c.horaIn || '09:00'; c.horaOut = c.horaOut || '18:00';
  c.nextNumero = 1;
  return c;
}
function toSite(c) {
  const S = clone(c);
  S.whatsapp = waNumber(c.telefono);
  S.instagram = String(c.redes || '').replace(/^@/, '').trim();
  delete S.telefono; delete S.redes; delete S.nextNumero;
  S.condiciones = String(c.condiciones || '').split('\n').map((x) => x.trim()).filter(Boolean);
  if (SITE.aviso && SITE.aviso.link && S.aviso && !S.aviso.link) S.aviso.link = SITE.aviso.link;
  return S;
}
const DEFAULT_CFG = fromSite(SITE);

const LS_CFG = 'ic.cfg', LS_HIST = 'ic.hist', LS_DRAFT = 'ic.draft', LS_BASE = 'ic.cfgBase';
const LS_AG = 'ic.agenda', LS_GH = 'ic.gh', LS_PUB = 'ic.pub';

/* Ajustes guardados: si un valor no se tocó desde la app, se toma el de config.js
   (así un cambio publicado en la web llega a la app sin pisar lo que se cambió a mano). */
function loadCfg() {
  const saved = lsGet(LS_CFG, null), base = lsGet(LS_BASE, {});
  const out = clone(DEFAULT_CFG);
  if (saved) for (const k of Object.keys(saved)) {
    if (k === 'whatsapp' || k === 'instagram') continue;
    const untouched = k in base && JSON.stringify(saved[k]) === JSON.stringify(base[k]);
    if (!untouched || k === 'nextNumero') out[k] = saved[k];
  }
  return out;
}
let cfg = loadCfg();
let clientMode = false;
let currentId = null;     // id del historial del presupuesto en edición
let lastResult = null;    // { blob, url, file, data }
let DISP = null;          // disponibilidad: { capacidad, ocupados, cerrados }

function blankState() {
  return {
    cliente: '', telCliente: '', dirCliente: '',
    dogs: [{ nombre: '', raza: '', edad: '', tamano: 0 }],
    observaciones: '',
    servicio: 0, fechaIn: '', horaIn: cfg.horaIn, fechaOut: '', horaOut: cfg.horaOut,
    excluidos: [],        // días dentro del rango en que el perro no viene (YYYY-MM-DD)
    cantidad: '',         // para servicios que se cobran por cantidad (clases, sesiones)
    primeraVez: true,     // incluye la visita de adaptación
    extras: {},           // índice -> cantidad ('' = automático)
    pago: -1,             // -1 = mostrar todas las formas de pago
    descExtra: '', pagado: '',
  };
}
let st = blankState();

/* ======================= CÁLCULO (motor compartido) ======================= */
const pedidoDe = (s, admin = !clientMode) => ({
  servicio: s.servicio, fechaIn: s.fechaIn, fechaOut: s.fechaOut, excluidos: s.excluidos, cantidad: s.cantidad,
  perros: s.dogs, extras: s.extras, primeraVez: s.primeraVez !== false, pago: s.pago,
  descExtra: admin ? s.descExtra : 0, pagado: admin ? s.pagado : 0,
});
const calc = (c, s, admin) => Cotizador.cotizar(c, pedidoDe(s, admin));
const servDe = (c, i) => Cotizador.servicio((c.servicios || [])[i] || (c.servicios || [])[0], i);
const servActual = () => servDe(cfg, st.servicio);
const nombresPerros = (s) => (s.dogs || []).map((d, i) => String(d.nombre || '').trim() || `Perro ${i + 1}`);

/* ======================= DISPONIBILIDAD ======================= */
const agGet = () => Object.assign({ extra: {}, cerrados: [] }, lsGet(LS_AG, {}));
function dispLocal() {
  const ocupados = Cotizador.ocupacion(lsGet(LS_HIST, []));
  const ag = agGet(), hoy = iso(new Date());
  Object.entries(ag.extra).forEach(([k, n]) => { if (num(n)) ocupados[k] = (ocupados[k] || 0) + num(n); });
  Object.keys(ocupados).forEach((k) => { if (k < hoy || !ocupados[k]) delete ocupados[k]; });
  const sorted = {}; Object.keys(ocupados).sort().forEach((k) => (sorted[k] = ocupados[k]));
  return { capacidad: Math.max(1, Math.round(num(cfg.cupos.capacidad)) || 1), ocupados: sorted, cerrados: (ag.cerrados || []).filter((k) => k >= hoy).sort() };
}
const cuposActivos = () => !!(cfg.cupos && cfg.cupos.activo !== false && DISP);
const usaCupos = (s) => cuposActivos() && s.ocupaCupo && s.cobro !== 'cantidad';
function estadoDia(k) { return DISP ? Cotizador.estadoDia(DISP, k) : null; }
/* días de presencia (para cupos): de ingreso a retiro, sin los días excluidos */
function diasPresencia(s, serv) {
  const a = parseDate(s.fechaIn); if (!a) return [];
  const b = parseDate(s.fechaOut) || a, out = [];
  for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) { const k = iso(d); if (serv.cobro === 'noche' || !(s.excluidos || []).includes(k)) out.push(k); }
  return out;
}
function diasLlenos() {
  const s = servActual();
  if (!usaCupos(s)) return [];
  return diasPresencia(st, s).filter((k) => { const e = estadoDia(k); return e && e.lleno; });
}

/* ======================= FORMULARIO ======================= */
const form = $('#form');
const icon = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

/* confirmación propia (más linda que la del navegador) */
function ask(msg, yes = 'Sí') {
  return new Promise((res) => {
    $('#confirmMsg').textContent = msg; $('#confirmYes').textContent = yes; $('#confirm').hidden = false;
    const done = (v) => { $('#confirm').hidden = true; $('#confirmYes').onclick = $('#confirmNo').onclick = null; res(v); };
    $('#confirmYes').onclick = () => done(true); $('#confirmNo').onclick = () => done(false);
  });
}

/* cantidad que se cobra sola de cada extra (se muestra como sugerencia) */
function extraAuto(e) {
  const r = calc(cfg, st), perros = st.dogs.length;
  return { unico: 1, dia: r.qty, perro: perros, perroDia: perros * r.qty }[e.cobro] || 1;
}
function renderForm() {
  // servicios agrupados por categoría
  if (!cfg.servicios[st.servicio]) st.servicio = 0;
  const cats = [];
  cfg.servicios.forEach((raw, i) => {
    const s = Cotizador.servicio(raw, i);
    if (clientMode && !s.web && i !== st.servicio) return;
    let g = cats.find((c) => c.n === s.categoria); if (!g) cats.push(g = { n: s.categoria, items: [] });
    g.items.push([i, s]);
  });
  $('#selServicio').innerHTML = cats.map((g) => (cats.length > 1 ? `<optgroup label="${esc(g.n)}">` : '')
    + g.items.map(([i, s]) => `<option value="${i}">${esc(s.nombre)} · ${money(s.precio)} por ${esc(s.unidad)}</option>`).join('')
    + (cats.length > 1 ? '</optgroup>' : '')).join('');

  $('#dogsList').innerHTML = st.dogs.map((d, i) => `
    <div class="dog">
      <div class="dog-head"><span>Perro ${i + 1}</span>${st.dogs.length > 1 ? `<button type="button" class="iconbtn del" data-deldog="${i}" aria-label="Quitar perro ${i + 1}">${icon('x')}</button>` : ''}</div>
      <div class="field"><label for="dog${i}-n">Nombre</label><input id="dog${i}-n" data-dog="${i}" data-k="nombre" value="${esc(d.nombre)}" placeholder="Tilo"></div>
      <div class="grid2">
        <div class="field"><label for="dog${i}-r">Raza</label><input id="dog${i}-r" data-dog="${i}" data-k="raza" value="${esc(d.raza)}" placeholder="Mestizo"></div>
        <div class="field"><label for="dog${i}-e">Edad</label><input id="dog${i}-e" data-dog="${i}" data-k="edad" value="${esc(d.edad)}" placeholder="3 años"></div>
      </div>
      ${cfg.tamanos.length ? `<div class="field"><label for="dog${i}-t">Tamaño</label><select id="dog${i}-t" data-dog="${i}" data-k="tamano">${cfg.tamanos.map((t, j) => `<option value="${j}" ${+d.tamano === j ? 'selected' : ''}>${esc(t.nombre)}${num(t.recargo) ? ` (+${pctTxt(t.recargo)})` : ''}</option>`).join('')}</select></div>` : ''}
    </div>`).join('');

  const extrasN = cfg.extras.map((x) => Cotizador.extra(x));
  $('#extrasList').innerHTML = extrasN.map((e, i) => (clientMode && !e.web) ? '' : `
    <label class="extra" for="ex${i}">
      <input type="checkbox" id="ex${i}" data-extra="${i}" ${i in st.extras ? 'checked' : ''}>
      <span class="name">${esc(e.nombre)}<span class="price">${money(e.precio)} ${Cotizador.COBRO_EXTRA[e.cobro]}</span></span>
      <input type="number" min="0" step="1" inputmode="numeric" data-extraq="${i}" placeholder="${extraAuto(e)}" value="${esc(st.extras[i] ?? '')}" ${i in st.extras ? '' : 'disabled'} aria-label="Cantidad de ${esc(e.nombre)}, se calcula sola: ${extraAuto(e)}">
    </label>`).join('');
  const anyExtra = extrasN.some((e) => !clientMode || e.web);
  $('#noExtras').hidden = anyExtra;
  $('#extrasList').hidden = !anyExtra;

  if (st.pago >= cfg.pagos.length) st.pago = -1;
  const opts = [{ i: -1, n: cfg.pagos.length > 1 ? 'Todas' : 'Total', d: 0 }, ...cfg.pagos.map((p, i) => ({ i, n: p.nombre, d: num(p.descuento) }))];
  $('#pagos').innerHTML = opts.map((o) => `<button type="button" class="${st.pago === o.i ? 'on' : ''}" data-pago="${o.i}">${esc(o.n)}${o.d ? ` <small>${o.d > 0 ? '−' : '+'}${pctTxt(Math.abs(o.d))}</small>` : ''}</button>`).join('');

  for (const el of form.elements) {
    if (!el.name || !(el.name in st) || typeof st[el.name] === 'object') continue;
    if (el.type === 'checkbox') el.checked = st[el.name] !== false; else el.value = st[el.name];
  }
  $('#adminPayFields').hidden = clientMode;
  updateSummary();
}

/* ---------- calendario: tocás ingreso y retiro ---------- */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
let calView = null;
const shortDate = (str) => { const d = parseDate(str); return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };

function dayAvailClass(k, s) {
  if (!usaCupos(s)) return { cls: '', label: '' };
  const e = estadoDia(k); if (!e) return { cls: '', label: '' };
  if (e.cerrado) return { cls: 'full', label: ', cerrado' };
  if (e.lleno) return { cls: 'full', label: ', completo' };
  if (e.libres <= num(cfg.cupos.avisoQuedan)) return { cls: 'few', label: `, quedan ${e.libres}` };
  return { cls: '', label: '' };
}

function renderCal() {
  if (!calView) { const base = parseDate(st.fechaIn) || new Date(); calView = new Date(base.getFullYear(), base.getMonth(), 1); }
  const y = calView.getFullYear(), m = calView.getMonth();
  $('#calTitle').textContent = `${MESES[m]} ${y}`;
  const A = st.fechaIn, B = st.fechaOut || '', exc = st.excluidos || [];
  const today = iso(new Date()), s = servActual();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  let h = '<span></span>'.repeat(lead);
  for (let d = 1; d <= days; d++) {
    const k = iso(new Date(y, m, d));
    const inR = A && B && k >= A && k <= B;
    const cls = ['day'];
    if (k === today) cls.push('today');
    if (k < today) cls.push('past');
    if (k === A) cls.push('start');
    if (k === B || (k === A && !B)) cls.push('end');
    if (inR && k !== A && k !== B) cls.push(exc.includes(k) ? 'off' : 'mid');
    if (inR && exc.includes(k) && (k === A || k === B)) cls.push('off');
    const av = k >= today ? dayAvailClass(k, s) : { cls: '', label: '' };
    if (av.cls) cls.push(av.cls);
    const blocked = clientMode && av.cls === 'full' && !inR && k !== A;
    h += `<button type="button" class="${cls.join(' ')}" data-day="${k}" aria-pressed="${!!(inR || k === A)}" ${blocked ? 'aria-disabled="true"' : ''} aria-label="${d} de ${MESES[m]}${av.label}">${d}</button>`;
  }
  $('#calGrid').innerHTML = h;
  $('#calLegend').hidden = !usaCupos(s);

  const r = calc(cfg, st), q = r.qty;
  const word = q === 1 ? r.unidad : r.unidadPlural;
  let hint;
  if (!A) hint = 'Tocá el día que lo traés.';
  else if (!B) hint = 'Ahora tocá el día que lo retirás. Si es un solo día, tocá el mismo.';
  else {
    hint = `<b>${q} ${esc(word)}</b>, ${A === B ? 'el ' + shortDate(A) : `del ${shortDate(A)} al ${shortDate(B)}`}.`;
    if (s.cobro === 'dia' && A !== B) hint += ' Si algún día no viene, tocalo para sacarlo.';
    const llenos = diasLlenos();
    if (llenos.length) hint += ` <span class="warn">${clientMode ? 'Sin lugar' : 'Completo'}: ${llenos.map(shortDate).join(', ')}.</span>`;
    if (r.recargos.length) hint += ` <span class="note">Incluye ${r.recargos.map((x) => esc(x.nombre.toLowerCase())).join(' y ')}.</span>`;
  }
  $('#calHint').innerHTML = hint;
  let hasWeekend = false;
  if (A && B && s.cobro === 'dia') for (let d = parseDate(A); iso(d) <= B; d.setDate(d.getDate() + 1)) if ([0, 6].includes(d.getDay()) && !exc.includes(iso(d))) { hasWeekend = true; break; }
  $('#calWeekdays').hidden = !hasWeekend;
  $('#calClear').hidden = !A;
  $('#calTools').hidden = !A;
}

function pickDay(k) {
  const A = st.fechaIn, B = st.fechaOut, s = servActual();
  if (A && B && k > A && k < B && s.cobro === 'dia') {
    const e = st.excluidos || []; st.excluidos = e.includes(k) ? e.filter((x) => x !== k) : [...e, k];
    return;
  }
  if (clientMode && usaCupos(s)) {
    const e = estadoDia(k);
    if (e && e.lleno) { toast(`El ${shortDate(k)} está completo. Elegí otro día o escribinos.`); return; }
  }
  if (A && !B) { if (k < A) st.fechaIn = k; else st.fechaOut = k; }
  else { st.fechaIn = k; st.fechaOut = ''; st.excluidos = []; }
}

function updateSummary() {
  const s = servActual();
  const porCantidad = s.cobro === 'cantidad';
  $('#qtyField').hidden = !porCantidad;
  $('#dateBlock').hidden = porCantidad;
  $('#stepServLbl').textContent = porCantidad ? 'Servicio y cantidad' : 'Servicio y fechas';
  if (porCantidad) {
    const inp = $('#f-cant');
    inp.min = s.cantidadMin; inp.max = s.cantidadMax;
    if (String(st.cantidad).trim() === '') st.cantidad = s.cantidadDefecto;
    if (document.activeElement !== inp) inp.value = st.cantidad;
    $('#qtyLbl').textContent = `Cantidad de ${s.unidadPlural}`;
    const tiers = (s.descCantidad || []).slice().sort((a, b) => a.desde - b.desde);
    $('#qtyHint').textContent = tiers.length ? 'Descuentos: ' + tiers.map((t) => `${pctTxt(t.pct)} desde ${t.desde} ${t.desde === 1 ? s.unidad : s.unidadPlural}`).join(' · ') : '';
  } else renderCal();

  const A = Cotizador.config(cfg).adaptacion;
  const showPv = A.activa && s.adaptacion;
  $('#pvField').hidden = !showPv;
  if (showPv) {
    const unit = A.fijo > 0 ? A.fijo : Math.round(s.precio * A.pct / 100);
    $('#pvTitle').textContent = (cfg.textos && cfg.textos.primeraVez) || 'Es su primera vez con nosotros';
    $('#pvTxt').textContent = `Incluye la ${A.nombre.toLowerCase()} obligatoria: ${money(unit)}${A.porPerro && st.dogs.length > 1 ? ' por perro' : ''}. Desmarcalo si ya la hizo${A.validezDias ? ` (vale hasta ${A.validezDias} días antes del ingreso)` : ''}.`;
  }

  const traslado = cfg.extras.some((e, i) => i in st.extras && /traslad|busc|retir|entreg/i.test(e.nombre));
  $('#dirField').hidden = !(traslado || st.dirCliente);

  const r = calc(cfg, st);
  const best = Math.min(...r.pagos.map((p) => p.total));
  const row = (k, sub, v, cls = '') => `<div class="srow ${cls}"><span class="k">${esc(k)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="v">${v}</span></div>`;
  let h = '';
  r.dogs.forEach((d) => (h += row(d.nombre, d.detalle + (d.notas ? ' · ' + d.notas : ''), money(d.importe))));
  r.recargos.forEach((x) => (h += row(x.nombre, x.detalle, money(x.importe), 'rec')));
  if (r.adaptacion) h += row(r.adaptacion.nombre, r.adaptacion.detalle, money(r.adaptacion.importe));
  r.extras.forEach((e) => (h += row(e.nombre, e.detalle, money(e.importe))));
  if (r.extras.length || r.descuentos.length || r.dogs.length > 1 || r.recargos.length || r.adaptacion) h += row('Subtotal', '', money(r.subtotal), 'dim');
  r.descuentos.forEach((d) => (h += row(d.nombre, '', '−' + money(d.importe), 'disc')));
  r.pagos.forEach((p) => (h += `<div class="srow tot ${r.pagos.length > 1 && p.total === best ? 'best' : ''}"><span class="k">${p.nombre ? esc(p.nombre) : 'Total'}${p.pct > 0 ? `<span class="tag-pct">−${pctTxt(p.pct)}</span>` : ''}</span><span class="v">${money(p.total)}</span></div>`));
  if (r.pagado) h += row('Seña cobrada', '', money(r.pagado), 'dim');
  else if (r.seniaPct) h += row(`Reserva ${pctTxt(r.seniaPct)}`, '', money(r.senia), 'dim');
  if (r.next && !porCantidad && r.next.desde - r.qty <= 7) h += `<p class="nudge">Con ${r.next.desde - r.qty} ${r.next.desde - r.qty === 1 ? r.unidad : r.unidadPlural} más tiene ${pctTxt(r.next.pct)} de descuento.</p>`;
  $('#summary').innerHTML = r.qty ? h : `<p class="empty">${porCantidad ? 'Elegí la cantidad para ver el detalle y el total.' : 'Cuando elijas las fechas vas a ver acá el detalle y el total.'}</p>`;

  const bp = r.pagos.find((p) => p.total === best);
  $('#barTotal').textContent = money(best);
  $('#barTotalLabel').textContent = r.qty ? `${r.pagos.length > 1 && bp.nombre ? 'En ' + bp.nombre.toLowerCase() : 'Total'} · ${r.qty} ${r.qty === 1 ? r.unidad : r.unidadPlural}` : (porCantidad ? 'Elegí la cantidad' : 'Elegí las fechas');
  if (!clientMode) $('#btnGenerar').textContent = num(st.pagado) > 0 ? 'Crear recibo' : 'Crear presupuesto';
  if (!clientMode) lsSet(LS_DRAFT, { st, currentId });
}

form.addEventListener('input', (e) => {
  const t = e.target;
  if (t.getAttribute('aria-invalid')) { t.removeAttribute('aria-invalid'); const er = $('#err-' + t.id); if (er) er.remove(); }
  if (t.dataset.dog != null) {
    st.dogs[+t.dataset.dog][t.dataset.k] = t.dataset.k === 'tamano' ? +t.value : t.value;
  } else if (t.dataset.extra != null) {
    const i = +t.dataset.extra;
    if (t.checked) st.extras[i] = ''; else delete st.extras[i];
    const q = $(`[data-extraq="${i}"]`); q.disabled = !t.checked; if (!t.checked) q.value = '';
  } else if (t.dataset.extraq != null) {
    st.extras[+t.dataset.extraq] = t.value;
  } else if (t.name && t.name in st) {
    if (t.type === 'checkbox') st[t.name] = t.checked;
    else if (t.name === 'servicio') { st.servicio = +t.value; st.cantidad = ''; }
    else st[t.name] = t.value;
  }
  updateSummary();
});
$('#f-cant').addEventListener('change', () => {
  const s = servActual(); st.cantidad = clampN(Math.round(num(st.cantidad)) || s.cantidadDefecto, s.cantidadMin, s.cantidadMax); updateSummary();
});

form.addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.day) {
    pickDay(b.dataset.day);
    if ($('#cal').getAttribute('aria-invalid')) { $('#cal').removeAttribute('aria-invalid'); const er = $('#err-cal'); if (er) er.remove(); }
    updateSummary();
  } else if (b.dataset.qd) {
    const s = servActual();
    st.cantidad = clampN((Math.round(num(st.cantidad)) || s.cantidadDefecto) + +b.dataset.qd, s.cantidadMin, s.cantidadMax);
    updateSummary();
  } else if (b.id === 'calPrev' || b.id === 'calNext') {
    calView = new Date(calView.getFullYear(), calView.getMonth() + (b.id === 'calNext' ? 1 : -1), 1); renderCal();
  } else if (b.id === 'calWeekdays') {
    const ex = new Set(st.excluidos || []);
    for (let d = parseDate(st.fechaIn); iso(d) <= st.fechaOut; d.setDate(d.getDate() + 1)) if ([0, 6].includes(d.getDay())) ex.add(iso(d));
    st.excluidos = [...ex]; updateSummary();
  } else if (b.id === 'calClear') {
    st.fechaIn = ''; st.fechaOut = ''; st.excluidos = []; updateSummary();
  } else if (b.dataset.pago != null) {
    st.pago = +b.dataset.pago;
    $$('#pagos button').forEach((c) => c.classList.toggle('on', c === b)); updateSummary();
  } else if (b.dataset.deldog != null) {
    st.dogs.splice(+b.dataset.deldog, 1); renderForm();
  } else if (b.id === 'btnAddDog') {
    st.dogs.push({ nombre: '', raza: '', edad: '', tamano: 0 }); renderForm();
    $(`#dog${st.dogs.length - 1}-n`).focus();
  } else if (b.id === 'btnReset') {
    if (!(await ask('¿Borrar lo cargado y empezar un presupuesto nuevo?', 'Empezar nuevo'))) return;
    st = blankState(); currentId = null; calView = null; renderForm(); window.scrollTo(0, 0);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  if (!st.cliente.trim()) return focusErr('#f-cliente', 'Falta el nombre del tutor o tutora.');
  if (!st.dogs.some((d) => d.nombre.trim())) return focusErr('#dog0-n', 'Falta el nombre del perro.');
  const s = servActual();
  if (s.cobro === 'cantidad') {
    if (!calc(cfg, st).qty) return focusErr('#f-cant', `Elegí la cantidad de ${s.unidadPlural}.`);
  } else {
    if (!st.fechaIn) return focusErr('#cal', 'Elegí en el calendario el día que lo traés.');
    if (!calc(cfg, st).qty) return focusErr('#cal', 'Elegí el día que lo retirás.');
    if (clientMode) {
      const llenos = diasLlenos();
      if (llenos.length) return focusErr('#cal', `${llenos.length === 1 ? 'Este día está completo' : 'Estos días están completos'}: ${llenos.map(shortDate).join(', ')}. Elegí otras fechas o escribinos.`);
    }
  }
  await generate();
});
function focusErr(sel, msg) {
  const el = $(sel); if (!el) { toast(msg); return; }
  // el aviso queda pegado al campo, no en un cartel que se va
  const id = 'err-' + (el.id || 'campo');
  const p = document.createElement('p'); p.className = 'err'; p.id = id; p.textContent = msg; p.setAttribute('role', 'alert');
  (el.id === 'cal' ? $('#calHint') : el.id === 'f-cant' ? el.parentElement : el).insertAdjacentElement('afterend', p);
  el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', id);
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => (el.id === 'cal' ? ($('#calGrid .today') || $('#calGrid .day')) : el).focus({ preventScroll: true }), 350);
}
function clearErrors() {
  $$('#form .err').forEach((x) => x.remove());
  $$('#form [aria-invalid]').forEach((x) => { x.removeAttribute('aria-invalid'); x.removeAttribute('aria-describedby'); });
}

/* ======================= PRESUPUESTO (CANVAS → PNG) ======================= */
const RC = {
  bg: '#e3edf6', paper: '#ffffff', ink: '#0f2a5c', ink2: '#4b6183', ink3: '#8496ae', rule: '#d9e4ef',
  brand: '#1d4fa6', accent: '#13a6cb', sky: '#eaf5fb', go: '#1e8a55', field: '#f1f6fb', ball: '#e3262b', warm: '#b4531a',
};
/* logo: si existe icons/logo.png se usa en la app y en el presupuesto */
let logoImg = null;
const logoReady = new Promise((res) => {
  const im = new Image();
  im.onload = () => { logoImg = im; res(im); };
  im.onerror = () => res(null);
  im.src = '../icons/logo.png?v=2';
});
const F = {
  disp: (w, px, stretch = 'semi-expanded') => `${w} ${stretch} ${px}px Archivo, "Arial Narrow", sans-serif`,
  body: (w, px) => `${w} ${px}px Onest, system-ui, sans-serif`,
  mono: (w, px) => `${w} ${px}px "Plex Mono", ui-monospace, monospace`,
};
const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MON = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

async function fontsReady() {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('800 40px Archivo'), document.fonts.load('900 40px Archivo'),
      document.fonts.load('400 20px Onest'), document.fonts.load('600 20px Onest'),
      document.fonts.load('500 20px "Plex Mono"'), document.fonts.load('600 20px "Plex Mono"'),
    ]);
  } catch { /* usa las de respaldo */ }
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrap(ctx, text, maxW) {
  const out = [];
  String(text ?? '').split('\n').forEach((para) => {
    const words = para.split(/\s+/).filter(Boolean); let line = '';
    if (!words.length) return;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    }
    out.push(line);
  });
  return out;
}
function fit(ctx, text, maxW, fontFn, start, min) {
  let px = start; ctx.font = fontFn(px);
  while (px > min && ctx.measureText(text).width > maxW) { px -= 2; ctx.font = fontFn(px); }
  return px;
}

function drawReceipt(data) {
  const { c, s, r, numero, fecha, tipo } = data;
  const W = 1080, M = 40, CX = M, CW = W - M * 2, P = CX + 56, IW = CW - 112, R = W - P;
  const layer = document.createElement('canvas'); layer.width = W; layer.height = 7000;
  const ctx = layer.getContext('2d');
  const spacing = (v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = v; };
  const text = (t, x, y, font, color, align = 'left', ls = '0px') => {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; spacing(ls); ctx.fillText(t, x, y); spacing('0px'); ctx.textAlign = 'left';
  };
  const hr = (yy) => { ctx.strokeStyle = RC.rule; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P, yy); ctx.lineTo(R, yy); ctx.stroke(); };
  let y = M;

  /* --- cabecera: logo sobre celeste --- */
  const headH = 230;
  ctx.save(); rr(ctx, CX, y, CW, headH + 30, 28); ctx.clip();
  ctx.fillStyle = RC.sky; ctx.fillRect(CX, y, CW, headH);
  ctx.fillStyle = RC.brand; ctx.fillRect(CX, y + headH - 10, CW, 10);
  ctx.fillStyle = RC.accent; ctx.fillRect(CX, y + headH - 16, CW, 6);
  ctx.restore();
  const metaW = 250;
  if (logoImg) {
    const maxH = 170, maxW = IW - metaW - 30;
    const sc = Math.min(maxH / logoImg.height, maxW / logoImg.width);
    const lw = logoImg.width * sc, lh = logoImg.height * sc;
    ctx.drawImage(logoImg, P - 10, y + (headH - 16 - lh) / 2, lw, lh);
  } else {
    const words = String(c.negocio || 'Inquietos Caninos').toUpperCase().split(/\s+/);
    const first = words.shift(), rest = words.join(' ');
    const wpx = fit(ctx, first, IW - metaW - 40, (px) => F.disp(900, px, 'expanded'), 76, 40);
    text(first, P, y + 104, F.disp(900, wpx, 'expanded'), RC.brand);
    if (rest) text(rest, P, y + 104 + wpx * 0.92, F.disp(900, wpx, 'expanded'), RC.accent);
  }
  const my = y + (headH - 16) / 2;
  text(tipo === 'presupuesto' ? 'PRESUPUESTO' : 'RECIBO', R, my - 34, F.mono(600, 24), RC.accent, 'right', '3px');
  text(numero, R, my + 6, F.mono(600, 32), RC.ink, 'right');
  text(fecha, R, my + 44, F.mono(500, 24), RC.ink2, 'right');
  y += headH + 64;

  /* --- protagonista: el perro --- */
  const names = nombresPerros(s).map((x) => x.toUpperCase());
  const hero = names.length > 2 ? names.slice(0, -1).join(', ') + ' Y ' + names[names.length - 1] : names.join(' Y ');
  let hpx = 132; ctx.font = F.disp(900, hpx, 'expanded');
  while (hpx > 70 && ctx.measureText(hero).width > IW) { hpx -= 4; ctx.font = F.disp(900, hpx, 'expanded'); }
  const heroLines = wrap(ctx, hero, IW);
  heroLines.forEach((ln, i) => text(ln, P - 4, y + hpx * 0.78 + i * hpx * 0.96, F.disp(900, hpx, 'expanded'), RC.brand));
  y += hpx * 0.78 + (heroLines.length - 1) * hpx * 0.96 + 26;
  const dogInfo = s.dogs.map((d) => [d.raza, d.edad].filter(Boolean).join(', ')).filter(Boolean).join(' · ');
  const tagline = [r.serv.nombre.toUpperCase(), `${r.qty} ${(r.qty === 1 ? r.unidad : r.unidadPlural).toUpperCase()}`].join('  ·  ');
  ctx.font = F.mono(600, 28); wrap(ctx, tagline, IW).forEach((ln, i) => text(ln, P, y + 32 + i * 38, F.mono(600, 28), RC.accent, 'left', '2px'));
  y += 44;
  if (dogInfo) { ctx.font = F.body(400, 28); wrap(ctx, dogInfo, IW).forEach((ln) => { text(ln, P, y + 36, F.body(400, 28), RC.ink3); y += 40; }); }
  y += 40;

  /* --- pase de ingreso / retiro (solo servicios con fechas) --- */
  const dateBlock = (x, w, label, ds, hs) => {
    text(label, x + 32, y + 54, F.mono(600, 22), RC.ink2, 'left', '3px');
    const d = parseDate(ds);
    if (d) {
      const dt = `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
      const dpx = fit(ctx, dt, w - 80, (px) => F.disp(800, px), 58, 30);
      text(dt, x + 30, y + 128, F.disp(800, dpx), RC.ink);
      text(`${d.getFullYear()}${hs ? '  ·  ' + hs + ' HS' : ''}`, x + 32, y + 172, F.mono(500, 26), RC.ink2);
    } else text('—', x + 30, y + 128, F.disp(800, 58), RC.ink3);
  };
  const passH = 210;
  if (r.serv.cobro !== 'cantidad' && (s.fechaIn || s.fechaOut)) {
    ctx.fillStyle = RC.sky; rr(ctx, P, y, IW, passH, 22); ctx.fill();
    if (s.fechaOut && s.fechaOut !== s.fechaIn) {
      dateBlock(P, IW / 2, 'INGRESO', s.fechaIn, s.horaIn);
      dateBlock(P + IW / 2 + 10, IW / 2 - 10, 'RETIRO', s.fechaOut, s.horaOut);
      ctx.strokeStyle = RC.rule; ctx.lineWidth = 3; ctx.setLineDash([10, 9]);
      ctx.beginPath(); ctx.moveTo(P + IW / 2, y + 28); ctx.lineTo(P + IW / 2, y + passH - 28); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = RC.paper; ctx.beginPath(); ctx.arc(P + IW / 2, y + passH / 2, 26, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = RC.brand; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(P + IW / 2 - 10, y + passH / 2); ctx.lineTo(P + IW / 2 + 10, y + passH / 2);
      ctx.moveTo(P + IW / 2 + 2, y + passH / 2 - 8); ctx.lineTo(P + IW / 2 + 10, y + passH / 2); ctx.lineTo(P + IW / 2 + 2, y + passH / 2 + 8); ctx.stroke();
    } else {
      dateBlock(P, IW, 'FECHA', s.fechaIn || s.fechaOut, [s.horaIn, s.horaOut].filter(Boolean).join(' A '));
    }
    y += passH + 36;
  }

  /* --- datos del tutor --- */
  const facts = [['TUTOR/A', s.cliente], ['WHATSAPP', s.telCliente], ['DIRECCIÓN', s.dirCliente]];
  const exc = (s.excluidos || []).filter((k) => k > s.fechaIn && k < (s.fechaOut || '')).sort();
  if (r.serv.cobro === 'dia' && exc.length) facts.push(['NO VIENE', exc.map(shortDate).join(', ')]);
  facts.filter((f) => f[1]).forEach(([k, v]) => {
    ctx.font = F.body(600, 30); const lines = wrap(ctx, v, IW - 230);
    text(k, P, y + 38, F.mono(600, 22), RC.ink3, 'left', '2px');
    lines.forEach((ln, i) => text(ln, R, y + 40 + i * 40, F.body(600, 30), RC.ink, 'right'));
    y += 24 + lines.length * 40 + 12; hr(y);
  });
  y += 34;

  /* --- detalle --- */
  text('DETALLE', P, y + 22, F.mono(600, 22), RC.ink3, 'left', '2px');
  text('IMPORTE', R, y + 22, F.mono(600, 22), RC.ink3, 'right', '2px');
  y += 42;
  const item = (name, detail, amount, color = RC.ink) => {
    ctx.font = F.body(600, 34); const lines = wrap(ctx, name, IW - 260);
    lines.forEach((ln, i) => text(ln, P, y + 46 + i * 42, F.body(600, 34), color));
    text(money(amount), R, y + 46, F.body(600, 34), color, 'right');
    let yy = y + 46 + (lines.length - 1) * 42;
    if (detail) { ctx.font = F.mono(500, 25); wrap(ctx, detail, IW - 260).forEach((ln) => { yy += 38; text(ln, P, yy, F.mono(500, 25), RC.ink2); }); }
    y = yy + 26; hr(y);
  };
  hr(y);
  r.dogs.forEach((d) => item(d.nombre, [d.detalle, d.notas].filter(Boolean).join(' · '), d.importe));
  r.recargos.forEach((x) => item(x.nombre, x.detalle, x.importe, RC.warm));
  if (r.adaptacion) item(r.adaptacion.nombre, r.adaptacion.detalle, r.adaptacion.importe);
  r.extras.forEach((e) => item(e.nombre, e.detalle, e.importe));
  const line = (k, v, color, weight = 500) => {
    ctx.font = F.body(weight, 30); const lines = wrap(ctx, k, IW - 240);
    lines.forEach((ln, i) => text(ln, P, y + 46 + i * 40, F.body(weight, 30), color));
    text(v, R, y + 46, F.body(600, 30), color, 'right'); y += 18 + lines.length * 40;
  };
  y += 8;
  if (r.extras.length || r.descuentos.length || r.dogs.length > 1 || r.recargos.length || r.adaptacion) line('Subtotal', money(r.subtotal), RC.ink2);
  r.descuentos.forEach((d) => line(d.nombre, '−' + money(d.importe), RC.go, 600));
  y += 24;

  /* --- totales por forma de pago --- */
  const pagos = r.pagos;
  const best = Math.min(...pagos.map((p) => p.total));
  const cols = pagos.length >= 2 ? 2 : 1, gap = 20, tw = (IW - gap * (cols - 1)) / cols, th = 176;
  pagos.forEach((p, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = P + col * (tw + gap), yy = y + row * (th + gap);
    const hi = pagos.length === 1 || p.total === best;
    ctx.fillStyle = hi ? RC.brand : RC.paper; rr(ctx, x, yy, tw, th, 22); ctx.fill();
    if (!hi) { ctx.strokeStyle = RC.brand; ctx.lineWidth = 3; rr(ctx, x + 1.5, yy + 1.5, tw - 3, th - 3, 21); ctx.stroke(); }
    const fg = hi ? '#ffffff' : RC.brand;
    text((p.nombre ? 'TOTAL ' + p.nombre : 'TOTAL').toUpperCase(), x + 30, yy + 50, F.mono(600, 22), hi ? '#cfe0ff' : RC.ink2, 'left', '2px');
    const amt = money(p.total); const apx = fit(ctx, amt, tw - 60, (px) => F.disp(900, px), cols === 1 ? 84 : 66, 40);
    text(amt, x + 28, yy + 50 + apx + 6, F.disp(900, apx), fg);
    if (p.pct) {
      const t = p.pct > 0 ? `${pctTxt(p.pct)} MENOS` : `${pctTxt(-p.pct)} MÁS`;
      ctx.font = F.mono(600, 22); const tw2 = ctx.measureText(t).width + 24;
      ctx.fillStyle = hi ? RC.ball : RC.go; rr(ctx, x + tw - 26 - tw2, yy + 24, tw2, 38, 19); ctx.fill();
      text(t, x + tw - 26 - tw2 / 2, yy + 50, F.mono(600, 22), '#ffffff', 'center');
    }
  });
  y += Math.ceil(pagos.length / cols) * (th + gap) + 20;

  /* --- notas y condiciones --- */
  const para = (title, body) => {
    if (!String(body || '').trim()) return;
    text(title, P, y + 30, F.mono(600, 22), RC.ink3, 'left', '2px'); y += 44;
    ctx.font = F.body(400, 29); wrap(ctx, body, IW).forEach((ln) => { text(ln, P, y + 32, F.body(400, 29), RC.ink); y += 40; });
    y += 22;
  };
  para('OBSERVACIONES', s.observaciones);
  const conds = String(c.condiciones || '').split('\n').map((x) => x.trim()).filter(Boolean);
  if (conds.length) {
    y += 6; text('CONDICIONES', P, y + 30, F.mono(600, 22), RC.ink3, 'left', '2px'); y += 52;
    conds.forEach((cond) => {
      ctx.font = F.body(400, 28); const lines = wrap(ctx, cond, IW - 56);
      ctx.strokeStyle = RC.accent; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(P + 2, y + 18); ctx.lineTo(P + 11, y + 28); ctx.lineTo(P + 29, y + 6); ctx.stroke();
      lines.forEach((ln, i) => text(ln, P + 52, y + 30 + i * 39, F.body(400, 28), RC.ink));
      y += lines.length * 39 + 20;
    });
  }
  if (num(c.validez) > 0 && tipo === 'presupuesto') { text(`Presupuesto válido por ${num(c.validez)} días desde el ${fecha}.`, P, y + 30, F.body(400, 25), RC.ink3); y += 50; }
  y += 30;

  /* --- talón troquelado: reserva y transferencia --- */
  const perfY = y; y += 56;
  if (r.pagado > 0) {
    text('SEÑA ABONADA', P, y + 26, F.mono(600, 22), RC.go, 'left', '3px');
    text(money(r.pagado), P - 2, y + 108, F.disp(900, 76), RC.ink);
    y += 128;
    const saldos = r.pagos.map((p) => `${p.nombre ? p.nombre + ' ' : ''}${money(Math.max(0, p.total - r.pagado))}`).join('  ·  ');
    ctx.font = F.body(400, 28); wrap(ctx, `Saldo al ingreso: ${saldos}`, IW).forEach((ln) => { text(ln, P, y + 30, F.body(400, 28), RC.ink2); y += 40; });
  } else if (r.seniaPct > 0) {
    text(`RESERVA PARA CONFIRMAR · ${pctTxt(r.seniaPct)}`, P, y + 26, F.mono(600, 22), RC.accent, 'left', '3px');
    text(money(r.senia), P - 2, y + 108, F.disp(900, 76), RC.brand);
    text('El resto se abona al ingreso.', P, y + 152, F.body(400, 28), RC.ink2);
    y += 176;
  }
  const bank = [['ALIAS', c.alias], ['CBU/CVU', c.cbu], ['TITULAR', c.titular], ['BANCO', c.banco]].filter((x) => x[1]);
  if (bank.length) {
    y += 22;
    const bh = 34 + bank.length * 50 + 14;
    ctx.fillStyle = RC.field; rr(ctx, P, y, IW, bh, 18); ctx.fill();
    bank.forEach(([k, v], i) => {
      text(k, P + 28, y + 62 + i * 50, F.mono(600, 22), RC.ink3, 'left', '2px');
      const vpx = fit(ctx, v, IW - 230, (px) => F.mono(600, px), 30, 20);
      text(v, R - 28, y + 63 + i * 50, F.mono(600, vpx), RC.ink, 'right');
    });
    y += bh;
  }
  const foot = [c.telefono && `WhatsApp ${c.telefono}`, c.direccion || c.zona].filter(Boolean).join('  ·  ');
  y += 40;
  if (foot) { ctx.font = F.body(500, 25); wrap(ctx, foot, IW).forEach((ln) => { text(ln, W / 2, y + 26, F.body(500, 25), RC.ink2, 'center'); y += 36; }); }
  y += 24;
  const cardBottom = y;
  const H = Math.ceil(cardBottom + M);

  /* --- composición final: fondo, papel con muescas, contenido --- */
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const o = out.getContext('2d');
  o.fillStyle = RC.bg; o.fillRect(0, 0, W, H);
  o.save(); o.shadowColor = 'rgba(15,42,92,.12)'; o.shadowBlur = 30; o.shadowOffsetY = 8;
  o.fillStyle = RC.paper; rr(o, CX, M, CW, cardBottom - M, 28); o.fill(); o.restore();
  o.fillStyle = RC.bg;
  o.beginPath(); o.arc(CX, perfY, 26, 0, Math.PI * 2); o.fill();
  o.beginPath(); o.arc(CX + CW, perfY, 26, 0, Math.PI * 2); o.fill();
  o.strokeStyle = RC.rule; o.lineWidth = 3; o.setLineDash([3, 12]); o.lineCap = 'round';
  o.beginPath(); o.moveTo(CX + 40, perfY); o.lineTo(CX + CW - 40, perfY); o.stroke(); o.setLineDash([]);
  o.drawImage(layer, 0, 0);
  return out;
}

function summaryText(data) {
  const { c, s, r, numero } = data;
  const L = [];
  L.push(`*${c.negocio}* · ${numero}`);
  L.push(`Tutor/a: ${s.cliente}${s.telCliente ? ' (' + s.telCliente + ')' : ''}`);
  L.push(`Perro${s.dogs.length > 1 ? 's' : ''}: ${nombresPerros(s).join(', ')}`);
  L.push(`Servicio: ${r.serv.nombre}`);
  if (r.serv.cobro !== 'cantidad') {
    if (s.fechaIn || s.fechaOut) L.push(`Fechas: ${[fmtDate(s.fechaIn), fmtDate(s.fechaOut)].filter(Boolean).join(' al ')}`);
    if (s.horaIn || s.horaOut) L.push(`Horario: ${s.horaIn} a ${s.horaOut}`);
  }
  L.push(`Cantidad: ${r.qty} ${r.qty === 1 ? r.unidad : r.unidadPlural}`);
  r.recargos.forEach((x) => L.push(`${x.nombre}: ${money(x.importe)}`));
  if (r.adaptacion) L.push(`${r.adaptacion.nombre}: ${money(r.adaptacion.importe)}`);
  r.extras.forEach((e) => L.push(`+ ${e.nombre}: ${money(e.importe)}`));
  r.descuentos.forEach((d) => L.push(`${d.nombre}: −${money(d.importe)}`));
  r.pagos.forEach((p) => L.push(`*Total${p.nombre ? ' ' + p.nombre.toLowerCase() : ''}: ${money(p.total)}*`));
  if (r.pagado) L.push(`Seña abonada: ${money(r.pagado)}`);
  else if (r.seniaPct) L.push(`Reserva (${pctTxt(r.seniaPct)}): ${money(r.senia)}`);
  if (s.observaciones) L.push(`Obs.: ${s.observaciones}`);
  return L.join('\n');
}

async function generate(fromHistory) {
  let numero, fecha, c = cfg, s = st;
  const tipo = !clientMode && num((fromHistory ? fromHistory.s : st).pagado) > 0 ? 'recibo' : 'presupuesto';
  if (fromHistory) {
    ({ numero, fecha, c, s } = fromHistory);
  } else if (clientMode) {
    numero = 'P-' + Date.now().toString(36).slice(-5).toUpperCase(); fecha = todayStr();
  } else {
    const hist = lsGet(LS_HIST, []);
    const prev = currentId && hist.find((h) => h.id === currentId);
    if (prev) { numero = prev.numero; fecha = todayStr(); }
    else {
      numero = 'N° ' + String(cfg.nextNumero).padStart(4, '0'); fecha = todayStr();
      cfg.nextNumero = num(cfg.nextNumero) + 1; saveCfg(); fillCfgForm();
      currentId = 'r' + Date.now();
    }
    const estado = (prev && prev.estado && prev.estado !== 'enviado') ? prev.estado : (num(st.pagado) > 0 ? 'senado' : 'enviado');
    const entry = { id: currentId, numero, fecha, ts: Date.now(), estado, c: clone(cfg), s: clone(st) };
    lsSet(LS_HIST, [entry, ...hist.filter((h) => h.id !== currentId)].slice(0, 100));
    renderHistory(); lsSet(LS_DRAFT, { st, currentId }); refreshDisp();
  }
  await Promise.all([fontsReady(), logoReady]);
  const r = calc(c, s, !clientMode);
  const data = { c, s, r, numero, fecha, tipo };
  const canvas = drawReceipt(data);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (lastResult) URL.revokeObjectURL(lastResult.url);
  const safe = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '');
  const fname = `${tipo}-${safe(nombresPerros(s)[0])}-${safe(numero)}.png`.toLowerCase();
  lastResult = { blob, url: URL.createObjectURL(blob), file: new File([blob], fname, { type: 'image/png' }), data };

  $('#previewImg').src = lastResult.url;
  $('#modalTitle').textContent = clientMode ? 'Tu presupuesto' : `${tipo === 'recibo' ? 'Recibo' : 'Presupuesto'} ${numero}`;
  const wa = $('#btnWaSend');
  if (clientMode) {
    wa.lastChild.textContent = 'Mandar para reservar'; wa.hidden = !c.telefono;
    wa.href = waLink(c.telefono, `¡Hola! Quiero reservar.\n\n${summaryText(data)}`);
  } else {
    wa.lastChild.textContent = s.telCliente ? 'Texto por WhatsApp' : 'WhatsApp';
    wa.hidden = false;
    wa.href = s.telCliente ? waLink(s.telCliente, summaryText(data)) : `https://wa.me/?text=${encodeURIComponent(summaryText(data))}`;
  }
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function download() {
  if (!lastResult) return;
  const a = document.createElement('a'); a.href = lastResult.url; a.download = lastResult.file.name;
  document.body.appendChild(a); a.click(); a.remove();
  toast('Imagen guardada en Descargas.');
}
async function shareImg() {
  if (!lastResult) return;
  const f = lastResult.file;
  if (navigator.canShare && navigator.canShare({ files: [f] })) {
    try { await navigator.share({ files: [f], title: f.name }); } catch (e) { if (e.name !== 'AbortError') download(); }
  } else { download(); }
}
$('#btnDownload').addEventListener('click', download);
$('#btnShareImg').addEventListener('click', shareImg);
$('#btnClose').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
function closeModal() { $('#modal').hidden = true; document.body.style.overflow = ''; }

/* ======================= HISTORIAL ======================= */
const ESTADOS = [['enviado', 'Enviado'], ['senado', 'Señado'], ['pagado', 'Pagado'], ['cancelado', 'Cancelado']];
let histFiltro = 'todos';
const estadoDe = (h) => h.estado || (num(h.s.pagado) > 0 ? 'senado' : 'enviado');
const norm = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ESTADO_INFO = {
  enviado: ['Esperando respuesta', 'Le mandaste el presupuesto y todavía no confirmó.'],
  senado: ['Señado', 'Reservó con seña. Ocupa su lugar en la agenda.'],
  pagado: ['Pagado', 'Pagó todo. Ocupa su lugar en la agenda.'],
  cancelado: ['Cancelado', 'No va. Libera el lugar.'],
};
const cuandoDe = (h, r) => (r.serv.cobro === 'cantidad' ? `${r.qty} ${r.qty === 1 ? r.unidad : r.unidadPlural}`
  : h.s.fechaIn ? (h.s.fechaOut && h.s.fechaOut !== h.s.fechaIn ? `${shortDate(h.s.fechaIn)} → ${shortDate(h.s.fechaOut)}` : shortDate(h.s.fechaIn)) : 'sin fechas');
function renderHistory() {
  const list = lsGet(LS_HIST, []);
  const box = $('#historyList');
  $('.hist-tools').hidden = list.length < 2;
  $$('#histF button').forEach((x) => x.classList.toggle('on', x.dataset.f === histFiltro));
  if (!list.length) { box.innerHTML = `<div class="empty-state">${icon('ticket')}<p><b>Todavía no hiciste presupuestos.</b> Cuando generes uno, aparece acá.</p><button type="button" class="btn btn-primary btn-sm" data-go="recibo">Hacer el primero</button></div>`; $('#histSum').textContent = ''; return; }
  const q = norm($('#histQ').value.trim());
  const rows = list.filter((h) => {
    if (histFiltro !== 'todos' && estadoDe(h) !== histFiltro) return false;
    if (!q) return true;
    return norm([h.numero, h.s.cliente, h.s.telCliente, ...(h.s.dogs || []).map((d) => d.nombre)].join(' ')).includes(q);
  });
  const pend = list.filter((h) => estadoDe(h) === 'enviado').length;
  $('#histSum').textContent = `${list.length} en total${pend ? ` · ${pend} esperando respuesta` : ''}${rows.length !== list.length ? ` · mostrando ${rows.length}` : ''}`;
  if (!rows.length) { box.innerHTML = '<p class="empty" style="padding:18px 16px">No hay presupuestos que coincidan con la búsqueda.</p>'; return; }
  box.innerHTML = rows.map((h) => {
    const r = calc(h.c, h.s, true), e = estadoDe(h);
    return `<button type="button" class="hrow ${e}" data-hopen="${h.id}">
      <span class="hr-main">
        <span class="hr-dog">${esc(nombresPerros(h.s).join(', '))}</span>
        <span class="hr-sub">${esc(h.s.cliente || 'Sin nombre')} · ${esc(r.serv.nombre)} · ${esc(cuandoDe(h, r))}</span>
      </span>
      <span class="hr-side">
        <span class="hr-amt">${money(Math.min(...r.pagos.map((p) => p.total)))}</span>
        <span class="chip e-${e}">${ESTADO_INFO[e][0]}</span>
      </span>
    </button>`;
  }).join('');
}
$('#histQ').addEventListener('input', renderHistory);
$('#histF').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  histFiltro = b.dataset.f; renderHistory();
});

/* hoja de acciones: todo con nombre, nada de íconos sueltos */
let hsId = null;
function cambiarEstado(id, estado) {
  const list = lsGet(LS_HIST, []), h = list.find((x) => x.id === id); if (!h) return;
  h.estado = estado; lsSet(LS_HIST, list); renderHistory(); refreshDisp(); renderInicio();
  const ocupa = ['senado', 'pagado'].includes(estado) && servDe(h.c, h.s.servicio).ocupaCupo;
  toast(`${nombresPerros(h.s).join(', ')}: ${ESTADO_INFO[estado][0].toLowerCase()}.${ocupa ? ' Ya ocupa su lugar en la agenda.' : ''}`);
}
function openHSheet(id) {
  const h = lsGet(LS_HIST, []).find((x) => x.id === id); if (!h) return;
  hsId = id;
  const r = calc(h.c, h.s, true), e = estadoDe(h);
  $('#hsTit').textContent = nombresPerros(h.s).join(', ');
  $('#hsSub').textContent = `${h.numero} · ${h.s.cliente || 'Sin nombre'} · ${r.serv.nombre} · ${cuandoDe(h, r)} · ${money(Math.min(...r.pagos.map((p) => p.total)))}`;
  $('#hsEst').innerHTML = ESTADOS.map(([v]) => `<button type="button" role="radio" aria-checked="${v === e}" class="est e-${v}" data-est="${v}"><b>${ESTADO_INFO[v][0]}</b><small>${ESTADO_INFO[v][1]}</small></button>`).join('');
  const tel = h.s.telCliente;
  $('#hsActs').innerHTML = [
    ['ver', 'eye', 'Ver la imagen y compartirla'],
    ...(tel ? [['wa', 'wa', `Escribirle a ${esc(h.s.cliente.split(' ')[0] || 'el tutor')} por WhatsApp`]] : []),
    ['editar', 'edit', 'Corregir este presupuesto'],
    ['repetir', 'copy', 'Repetir con otras fechas'],
    ['borrar', 'trash', 'Borrar'],
  ].map(([a, ic, t]) => `<button type="button" class="act ${a === 'borrar' ? 'danger' : ''}" data-act="${a}">${icon(ic)}<span>${t}</span></button>`).join('');
  $('#hSheet').hidden = false; document.body.style.overflow = 'hidden';
}
function closeHSheet() { $('#hSheet').hidden = true; document.body.style.overflow = ''; hsId = null; }
$('#historyList').addEventListener('click', (e) => { const b = e.target.closest('[data-hopen]'); if (b) openHSheet(b.dataset.hopen); });
$('#hsClose').addEventListener('click', closeHSheet);
$('#hSheet').addEventListener('click', async (e) => {
  if (e.target.id === 'hSheet') { closeHSheet(); return; }
  const est = e.target.closest('[data-est]');
  if (est) { cambiarEstado(hsId, est.dataset.est); openHSheet(hsId); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const list = lsGet(LS_HIST, []), h = list.find((x) => x.id === hsId); if (!h) return;
  const act = b.dataset.act;
  if (act === 'ver') { closeHSheet(); await generate(h); }
  else if (act === 'wa') { window.open(waLink(h.s.telCliente, summaryText({ c: h.c, s: h.s, r: calc(h.c, h.s, true), numero: h.numero })), '_blank', 'noopener'); }
  else if (act === 'editar') {
    closeHSheet(); st = Object.assign(blankState(), clone(h.s)); currentId = h.id; calView = null; renderForm(); showTab('recibo');
    toast(`Corregí lo que necesites y tocá Crear para actualizar ${h.numero}.`);
  } else if (act === 'repetir') {
    closeHSheet(); st = Object.assign(blankState(), clone(h.s), { fechaIn: '', fechaOut: '', excluidos: [], pagado: '', primeraVez: false });
    currentId = null; calView = null; renderForm(); showTab('recibo');
    toast('Copiado con los mismos datos. Elegí las fechas nuevas.');
  } else if (act === 'borrar') {
    if (!(await ask(`¿Borrar el presupuesto de ${nombresPerros(h.s).join(', ')}? No se puede deshacer.`, 'Borrar'))) return;
    closeHSheet(); lsSet(LS_HIST, list.filter((x) => x.id !== h.id)); if (currentId === h.id) currentId = null; renderHistory(); refreshDisp(); renderInicio();
  }
});

/* ======================= INICIO ======================= */
const webUrl = () => new URL('../', location.href).href;
const formUrl = () => new URL('#cliente', location.href.split('#')[0]).href;
async function copiar(txt, msg) {
  try { await navigator.clipboard.writeText(txt); } catch {
    const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
  }
  toast(msg);
}
function pasos() {
  const g = ghCfg(), pub = lsGet(LS_PUB, null);
  return [
    { ok: !!(String(cfg.responsable || '').trim() && String(cfg.telefono || '').trim()), t: 'Cargá tu nombre y tu WhatsApp', d: 'Salen en cada presupuesto.', go: 'negocio' },
    { ok: !!(String(cfg.alias || '').trim() || String(cfg.cbu || '').trim()), t: 'Cargá tu alias o CBU', d: 'Para que te transfieran la seña.', go: 'cobros' },
    { ok: !!lsGet('ic.vistoPrecios', false), t: 'Revisá tus precios', d: 'Los que vienen cargados son de ejemplo.', go: 'servicios' },
    { ok: !!g.token, t: 'Conectá la app con tu página', d: 'Se hace una sola vez, en 3 minutos.', go: 'conexion' },
    { ok: !!(g.token && pub && pub.sig === pubSig()), t: 'Publicá tus cambios', d: 'Así tu página muestra tus precios y días libres.', go: 'publicar' },
  ];
}
function renderInicio() {
  if (clientMode || !$('#tab-inicio')) return;
  const hoy = new Date(), k0 = iso(hoy);
  $('#homeDate').textContent = `${DIAS_LARGOS[hoy.getDay()]} ${hoy.getDate()} de ${MESES[hoy.getMonth()]}`;
  const nombre = String(cfg.responsable || '').trim().split(' ')[0];
  $('#homeHi').textContent = nombre ? `¡Hola, ${nombre}!` : '¡Hola!';

  // primeros pasos
  const P = pasos(), hechos = P.filter((x) => x.ok).length;
  $('#hSteps').hidden = hechos === P.length;
  $('#hStepsN').textContent = `${hechos} de ${P.length}`;
  $('#hStepsBar').style.width = `${(hechos / P.length) * 100}%`;
  const primero = P.findIndex((x) => !x.ok);
  $('#hStepsList').innerHTML = P.map((x, i) => `<li class="${x.ok ? 'ok' : ''} ${i === primero ? 'now' : ''}">
      <button type="button" data-paso="${x.go}" ${x.ok && x.go !== 'servicios' ? 'tabindex="-1"' : ''}>
        <span class="sl-n">${x.ok ? icon('check') : i + 1}</span>
        <span class="sl-t"><b>${x.t}</b><small>${x.ok ? 'Listo' : x.d}</small></span>
        ${x.ok ? '' : icon('chev', 'ic sl-go')}
      </button></li>`).join('');

  // números del día
  const D = DISP || dispLocal(), e = Cotizador.estadoDia(D, k0);
  const list = lsGet(LS_HIST, []);
  const conf = list.filter((h) => ['senado', 'pagado'].includes(estadoDe(h)));
  const enCasa = conf.filter((h) => Cotizador.ocupacion([Object.assign({}, h, { estado: 'senado' })])[k0]);
  const pend = list.filter((h) => estadoDe(h) === 'enviado');
  const stat = (n, t, cls = '', go = '', extra = '') => `<button type="button" class="stat ${cls}" ${go ? `data-go="${go}"` : ''} ${extra}><b>${n}</b><span>${t}</span></button>`;
  $('#hStats').innerHTML = stat(enCasa.reduce((a, h) => a + (h.s.dogs || []).length, 0), 'perros hoy', '', 'agenda')
    + stat(e.cerrado ? '—' : e.libres, e.cerrado ? 'cerrado hoy' : `lugares libres hoy`, e.lleno ? 'warn' : '', 'agenda')
    + stat(pend.length, 'esperando respuesta', pend.length ? 'attn' : '', 'historial', 'data-filtro="enviado"');

  // en casa y próximos ingresos (14 días)
  const lim = new Date(hoy); lim.setDate(lim.getDate() + 14); const kLim = iso(lim);
  const prox = conf.filter((h) => h.s.fechaIn && ((h.s.fechaOut || h.s.fechaIn) >= k0) && h.s.fechaIn <= kLim)
    .sort((a, b) => (a.s.fechaIn < b.s.fechaIn ? -1 : 1)).slice(0, 6);
  $('#hTodayList').innerHTML = prox.length ? prox.map((h) => {
    const enc = h.s.fechaIn <= k0;
    const cuando = enc ? `en casa hasta el ${shortDate(h.s.fechaOut || h.s.fechaIn)}` : `llega el ${shortDate(h.s.fechaIn)}${h.s.horaIn ? ` a las ${h.s.horaIn}` : ''}`;
    return `<li><button type="button" class="prow" data-hopen="${h.id}"><span class="pr-badge ${enc ? 'in' : ''}">${enc ? 'Hoy' : shortDate(h.s.fechaIn).split(' ')[1]}</span><span class="pr-t"><b>${esc(nombresPerros(h.s).join(', '))}</b><small>${esc(cuando)} · ${esc(h.s.cliente || '')}</small></span>${icon('chev', 'ic pr-go')}</button></li>`;
  }).join('') : '<li class="pempty">No hay perros confirmados para los próximos 14 días.</li>';

  // esperando respuesta
  $('#hPend').hidden = !pend.length;
  $('#hPendList').innerHTML = pend.slice(0, 4).map((h) => {
    const r = calc(h.c, h.s, true);
    return `<li class="pend"><button type="button" class="prow" data-hopen="${h.id}"><span class="pr-t"><b>${esc(nombresPerros(h.s).join(', '))}</b><small>${esc(h.s.cliente || '')} · ${esc(cuandoDe(h, r))}</small></span></button>
      <button type="button" class="btn btn-sm btn-ok" data-senio="${h.id}">${icon('check')}Señó</button></li>`;
  }).join('');

  // compartir
  $('#hUrl').textContent = webUrl().replace(/^https?:\/\//, '');
  $('#hShareWa').href = `https://wa.me/?text=${encodeURIComponent(`¡Hola! Acá podés ver los precios, los días disponibles y armar el presupuesto para tu perro: ${webUrl()}`)}`;
}
$('#tab-inicio').addEventListener('click', (e) => {
  const paso = e.target.closest('[data-paso]');
  if (paso) { if (paso.dataset.paso === 'publicar') publicar(); else { showTab('ajustes'); openPage(paso.dataset.paso); } return; }
  const s1 = e.target.closest('[data-senio]');
  if (s1) { cambiarEstado(s1.dataset.senio, 'senado'); return; }
  const o = e.target.closest('[data-hopen]');
  if (o) openHSheet(o.dataset.hopen);
});
$('#hShareCopy').addEventListener('click', () => copiar(webUrl(), 'Link de tu página copiado.'));
$('#hShareForm').addEventListener('click', () => copiar(formUrl(), 'Link del formulario copiado.'));
/* atajos [data-go] a otras pestañas, desde cualquier lugar */
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]'); if (!g) return;
  if (g.dataset.filtro) histFiltro = g.dataset.filtro;
  showTab(g.dataset.go);
  if (g.dataset.go === 'historial') renderHistory();
});

/* ======================= AJUSTES ======================= */
function saveCfg() { lsSet(LS_CFG, cfg); lsSet(LS_BASE, DEFAULT_CFG); applyBrand(); refreshPubState(); refreshSums(); }
function faltantes() {
  const f = [];
  if (!String(cfg.telefono || '').trim()) f.push(['tu WhatsApp', 'negocio', '#c-tel']);
  if (!String(cfg.alias || '').trim() && !String(cfg.cbu || '').trim()) f.push(['el alias o CBU para la seña', 'cobros', '#c-alias']);
  if (!String(cfg.responsable || '').trim()) f.push(['tu nombre', 'negocio', '#c-resp']);
  return f;
}
function applyBrand() {
  const name = cfg.negocio || 'Inquietos Caninos';
  $('#brandName').textContent = name;
  const [first, ...rest] = name.split(/\s+/);
  $('#brandWord').innerHTML = `<b>${esc(first)}</b><i>${esc(rest.join(' '))}</i>`;
  document.title = name;
}
logoReady.then((im) => { if (im) { $('#brandLogo').src = im.src; $('#brandLogo').hidden = false; $('#brandWord').hidden = true; } });

/* campos simples con data-cfg (admite rutas como "adaptacion.pct") */
function fillCfgForm() {
  $$('[data-cfg]').forEach((el) => {
    if (el === document.activeElement) return;
    const v = getPath(cfg, el.dataset.cfg);
    if (el.type === 'checkbox') el.checked = v !== false && v !== undefined ? !!v : false;
    else if (el.hasAttribute('data-lines')) el.value = Array.isArray(v) ? v.join('\n') : (v || '');
    else el.value = v ?? '';
  });
}
function onCfgField(t) {
  const k = t.dataset.cfg;
  let v;
  if (t.type === 'checkbox') v = t.checked;
  else if (t.type === 'number' || t.hasAttribute('data-num')) v = num(t.value);
  else if (t.hasAttribute('data-lines')) v = t.value.split('\n').map((x) => x.trim()).filter(Boolean);
  else v = t.value;
  setPath(cfg, k, v);
  saveCfg();
  if (!clientMode) { renderForm(); if (k.startsWith('cupos')) refreshDisp(); }
}
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset && t.dataset.cfg && t.type !== 'checkbox' && t.tagName !== 'SELECT') onCfgField(t); });
document.addEventListener('change', (e) => { const t = e.target; if (t.dataset && t.dataset.cfg && (t.type === 'checkbox' || t.tagName === 'SELECT')) onCfgField(t); });

/* listas simples */
const EDITORS = {
  extras: { el: '#edExtras', cols: 'minmax(0,1.1fr) minmax(0,1fr) auto', blank: { nombre: '', precio: 0, cobro: 'unico', web: true }, add: 'Agregar extra',
    fields: [{ k: 'nombre', l: 'Extra', full: true }, { k: 'precio', l: 'Precio', t: 'number' },
      { k: 'cobro', l: 'Se cobra', t: 'select', o: Object.entries(Cotizador.COBRO_EXTRA) }, { k: 'web', l: 'Mostrar en la calculadora de la web', t: 'check', full: true }] },
  pagos: { el: '#edPagos', cols: 'minmax(0,1fr) auto', blank: { nombre: '', descuento: 0 }, add: 'Agregar forma de pago',
    fields: [{ k: 'nombre', l: 'Forma de pago', full: true }, { k: 'descuento', l: 'Descuento %', t: 'number' }] },
  tamanos: { el: '#edTamanos', cols: 'minmax(0,1fr) auto', blank: { nombre: '', recargo: 0 }, add: 'Agregar tamaño',
    fields: [{ k: 'nombre', l: 'Tamaño', full: true }, { k: 'recargo', l: 'Recargo %', t: 'number' }] },
  fechasEspeciales: { el: '#edFechas', cols: 'minmax(0,1fr) minmax(0,1fr) minmax(0,.8fr) auto', blank: { nombre: '', desde: '', hasta: '', recargo: 100 }, add: 'Agregar fecha especial',
    fields: [{ k: 'nombre', l: 'Nombre', full: true, ph: 'Navidad' }, { k: 'desde', l: 'Desde', ph: '12-24' }, { k: 'hasta', l: 'Hasta', ph: '12-25' }, { k: 'recargo', l: 'Recargo %', t: 'number' }] },
  preguntas: { el: '#edPreg', cols: 'minmax(0,1fr) auto', blank: { p: '', r: '' }, add: 'Agregar pregunta',
    fields: [{ k: 'p', l: 'Pregunta', full: true }, { k: 'r', l: 'Respuesta', t: 'textarea', full: true }] },
};
function renderEditor(key) {
  const E = EDITORS[key], box = $(E.el); if (!box) return;
  if (!Array.isArray(cfg[key])) cfg[key] = [];
  box.innerHTML = cfg[key].map((raw, i) => {
    const item = key === 'extras' ? Object.assign({}, raw, Cotizador.extra(raw)) : raw;
    return `<div class="ed-row" style="grid-template-columns:${E.cols}">
      ${E.fields.map((f) => {
        const id = `ed-${key}-${i}-${f.k}`, attrs = `id="${id}" data-ed="${key}" data-i="${i}" data-k="${f.k}"`, full = f.full ? ' style="grid-column:1/-1"' : '';
        if (f.t === 'check') return `<label class="switch"${full} for="${id}"><input type="checkbox" ${attrs} ${item[f.k] !== false ? 'checked' : ''}><span>${f.l}</span></label>`;
        let ctl;
        if (f.t === 'select') ctl = `<select ${attrs}>${f.o.map(([v, t]) => `<option value="${v}" ${item[f.k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
        else if (f.t === 'textarea') ctl = `<textarea ${attrs} rows="2">${esc(item[f.k])}</textarea>`;
        else ctl = `<input ${attrs} ${f.t === 'number' ? 'type="number" step="any" inputmode="decimal"' : ''} ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} value="${esc(item[f.k])}">`;
        return `<div class="field"${full}><label for="${id}">${f.l}</label>${ctl}</div>`;
      }).join('')}
      <button type="button" class="iconbtn del" data-edel="${key}" data-i="${i}" aria-label="Quitar">${icon('x')}</button>
    </div>`;
  }).join('') + `<button type="button" class="btn btn-sm ed-add" data-eadd="${key}">${icon('plus')}${E.add}</button>`;
}
function onEdField(t) {
  const E = EDITORS[t.dataset.ed], f = E.fields.find((x) => x.k === t.dataset.k);
  const item = cfg[t.dataset.ed][+t.dataset.i];
  item[t.dataset.k] = f.t === 'check' ? t.checked : f.t === 'number' ? num(t.value) : t.value;
  if (t.dataset.ed === 'extras') delete item.unidad;   // formato viejo
  saveCfg(); renderForm();
}
$('#cfgForm').addEventListener('input', (e) => { const t = e.target; if (t.dataset.ed && t.type !== 'checkbox' && t.tagName !== 'SELECT') onEdField(t); });
$('#cfgForm').addEventListener('change', (e) => { const t = e.target; if (t.dataset.ed && (t.type === 'checkbox' || t.tagName === 'SELECT')) onEdField(t); });

/* ---------- servicios: una tarjeta con todas las opciones ---------- */
const COBROS = [['dia', 'Por día (se eligen fechas)'], ['noche', 'Por noche (se eligen fechas)'], ['cantidad', 'Por cantidad (clases, sesiones…)']];
const UNIDAD_DEF = { dia: ['día', 'días'], noche: ['noche', 'noches'], cantidad: ['clase', 'clases'] };
const ICONOS = [['casa', 'Casa'], ['sol', 'Sol'], ['correa', 'Correa'], ['educacion', 'Educación']];
const SRV_CHECKS = [
  ['porPerro', 'El precio es por cada perro'],
  ['ocupaCupo', 'Usa un lugar de los cupos diarios'],
  ['adaptacion', 'Necesita la visita de adaptación'],
  ['web', 'Mostrar en la página web'],
  ['destacado', 'Destacarlo en la página web'],
];
function renderSrv() {
  const open = new Set($$('#edSrv details[open]').map((d) => +d.dataset.i));
  $('#edSrv').innerHTML = cfg.servicios.map((raw, i) => {
    const s = Cotizador.servicio(raw, i), id = (k) => `srv-${i}-${k}`;
    const inp = (k, l, o = {}) => `<div class="field"${o.full ? ' style="grid-column:1/-1"' : ''}><label for="${id(k)}">${l}${o.opt ? ` <span class="opt">${o.opt}</span>` : ''}</label><input id="${id(k)}" data-srv="${i}" data-k="${k}" ${o.t === 'number' ? 'type="number" step="any" inputmode="decimal" data-t="number"' : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} value="${esc(o.v !== undefined ? o.v : s[k])}"></div>`;
    const tiers = (Array.isArray(raw.descCantidad) ? raw.descCantidad : []);
    return `<details class="srv" data-i="${i}" ${open.has(i) ? 'open' : ''}>
      <summary><span class="srv-n">${esc(s.nombre)}</span><span class="srv-p">${money(s.precio)} por ${esc(s.unidad)}</span><span class="srv-c">${esc(s.categoria)}${s.web ? '' : ' · oculto en la web'}</span></summary>
      <div class="srv-body">
        <div class="grid2">
          ${inp('nombre', 'Nombre')}
          ${inp('categoria', 'Categoría', { opt: 'agrupa en la calculadora', ph: 'Cuidado, Educación…' })}
          ${inp('precio', 'Precio', { t: 'number' })}
          <div class="field"><label for="${id('cobro')}">Cómo se cobra</label><select id="${id('cobro')}" data-srv="${i}" data-k="cobro">${COBROS.map(([v, t]) => `<option value="${v}" ${s.cobro === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          ${inp('unidad', 'Unidad', { opt: 'singular', ph: 'día, clase, sesión' })}
          ${inp('unidadPlural', 'Unidad en plural', { ph: 'días, clases, sesiones' })}
        </div>
        <div class="grid3">
          ${inp('cantidadMin', 'Mínimo', { t: 'number' })}
          ${inp('cantidadDefecto', 'De entrada', { t: 'number' })}
          ${inp('cantidadMax', 'Máximo', { t: 'number' })}
        </div>
        ${s.cobro !== 'cantidad' ? inp('recargoFinde', 'Recargo sábados y domingos', { t: 'number', opt: '%, 0 = sin recargo' }) : ''}
        <div class="checks">${SRV_CHECKS.map(([k, l]) => `<label class="switch" for="${id(k)}"><input type="checkbox" id="${id(k)}" data-srv="${i}" data-k="${k}" data-t="check" ${s[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
        <h5 class="sub5">Descuentos por cantidad</h5>
        <div class="tiers">${tiers.map((t, j) => `<div class="tier">
            <span>Desde</span><input type="number" min="1" inputmode="numeric" data-srvd="${i}" data-j="${j}" data-k="desde" value="${esc(t.desde)}" aria-label="Desde cuántas ${esc(s.unidadPlural)}">
            <span>${esc(s.unidadPlural)}:</span><input type="number" step="any" inputmode="decimal" data-srvd="${i}" data-j="${j}" data-k="pct" value="${esc(t.pct)}" aria-label="Porcentaje de descuento"><span>%</span>
            <button type="button" class="iconbtn del" data-srvact="ddel" data-i="${i}" data-j="${j}" aria-label="Quitar descuento">${icon('x')}</button></div>`).join('') || '<p class="hint" style="margin:0">Sin descuentos por cantidad.</p>'}</div>
        <button type="button" class="btn btn-sm ed-add" data-srvact="dadd" data-i="${i}">${icon('plus')}Agregar descuento</button>
        <div class="field"><label for="${id('bajada')}">Descripción para la web</label><textarea id="${id('bajada')}" data-srv="${i}" data-k="bajada" rows="2">${esc(raw.bajada || '')}</textarea></div>
        <div class="field"><label for="${id('incluye')}">Qué incluye <span class="opt">uno por renglón</span></label><textarea id="${id('incluye')}" data-srv="${i}" data-k="incluye" data-t="lines" rows="3">${esc(s.incluye.join('\n'))}</textarea></div>
        <div class="field"><label for="${id('icono')}">Ícono</label><select id="${id('icono')}" data-srv="${i}" data-k="icono">${ICONOS.map(([v, t]) => `<option value="${v}" ${(raw.icono || '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="srv-acts">
          <button type="button" class="btn btn-sm" data-srvact="up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>${icon('up')}Subir</button>
          <button type="button" class="btn btn-sm" data-srvact="down" data-i="${i}" ${i === cfg.servicios.length - 1 ? 'disabled' : ''}>${icon('dn')}Bajar</button>
          <button type="button" class="btn btn-sm" data-srvact="dup" data-i="${i}">${icon('copy')}Duplicar</button>
          <button type="button" class="btn btn-sm btn-danger" data-srvact="del" data-i="${i}" ${cfg.servicios.length < 2 ? 'disabled' : ''}>${icon('trash')}Borrar</button>
        </div>
      </div>
    </details>`;
  }).join('');
}
function srvLabel(i) {
  const s = Cotizador.servicio(cfg.servicios[i], i), d = $(`#edSrv details[data-i="${i}"]`); if (!d) return;
  d.querySelector('.srv-n').textContent = s.nombre;
  d.querySelector('.srv-p').textContent = `${money(s.precio)} por ${s.unidad}`;
  d.querySelector('.srv-c').textContent = s.categoria + (s.web ? '' : ' · oculto en la web');
}
function onSrvField(t) {
  const i = +t.dataset.srv, k = t.dataset.k, raw = cfg.servicios[i];
  const v = t.dataset.t === 'check' ? t.checked : t.dataset.t === 'number' ? num(t.value) : t.dataset.t === 'lines' ? t.value.split('\n').map((x) => x.trim()).filter(Boolean) : t.value;
  if (k === 'cobro') {
    // si la unidad era la de fábrica, se adapta al nuevo modo de cobro
    const s0 = Cotizador.servicio(raw, i), defs = Object.values(UNIDAD_DEF).flat();
    if (!raw.unidad || defs.includes(s0.unidad) || s0.unidad === 'unidad') { raw.unidad = UNIDAD_DEF[v][0]; raw.unidadPlural = UNIDAD_DEF[v][1]; }
    if (v === 'cantidad') { if (raw.ocupaCupo === undefined) raw.ocupaCupo = false; if (raw.adaptacion === undefined) raw.adaptacion = false; }
  }
  if (k === 'unidad' && raw.unidadPlural === Cotizador.plural(raw.unidad || '')) delete raw.unidadPlural;
  raw[k] = v;
  saveCfg(); srvLabel(i);
  if (k === 'cobro' || k === 'unidadPlural' || k === 'unidad') renderSrv();
  renderForm();
}
$('#edSrv').addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.srv != null && t.type !== 'checkbox' && t.tagName !== 'SELECT') onSrvField(t);
  if (t.dataset.srvd != null) {
    const raw = cfg.servicios[+t.dataset.srvd];
    raw.descCantidad[+t.dataset.j][t.dataset.k] = num(t.value);
    saveCfg(); renderForm();
  }
});
$('#edSrv').addEventListener('change', (e) => { const t = e.target; if (t.dataset.srv != null && (t.type === 'checkbox' || t.tagName === 'SELECT')) onSrvField(t); });
$('#edSrv').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-srvact]'); if (!b) return;
  const i = +b.dataset.i, act = b.dataset.srvact, list = cfg.servicios, cur = st.servicio;
  if (act === 'dadd') {
    const raw = list[i], s = Cotizador.servicio(raw, i);
    if (!Array.isArray(raw.descCantidad)) raw.descCantidad = [];
    const last = raw.descCantidad[raw.descCantidad.length - 1];
    raw.descCantidad.push({ desde: last ? num(last.desde) * 2 : (s.cobro === 'cantidad' ? 4 : 15), pct: last ? num(last.pct) + 5 : 10 });
  } else if (act === 'ddel') list[i].descCantidad.splice(+b.dataset.j, 1);
  else if (act === 'up' && i > 0) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; st.servicio = cur === i ? i - 1 : cur === i - 1 ? i : cur; }
  else if (act === 'down' && i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; st.servicio = cur === i ? i + 1 : cur === i + 1 ? i : cur; }
  else if (act === 'dup') { const c2 = clone(list[i]); c2.nombre += ' (copia)'; list.splice(i + 1, 0, c2); if (cur > i) st.servicio = cur + 1; }
  else if (act === 'del') {
    if (!(await ask(`¿Borrar el servicio "${list[i].nombre}"?`, 'Borrar'))) return;
    list.splice(i, 1); st.servicio = cur === i ? 0 : cur > i ? cur - 1 : cur;
  } else return;
  saveCfg(); renderSrv();
  const keep = act === 'up' ? i - 1 : act === 'down' ? i + 1 : act === 'dup' ? i + 1 : i;
  const d = $(`#edSrv details[data-i="${keep}"]`); if (d && act !== 'del') d.open = true;
  renderForm();
});
$('#srvAdd').addEventListener('click', () => {
  cfg.servicios.push({ nombre: 'Nuevo servicio', categoria: 'Servicios', precio: 0, cobro: 'dia', unidad: 'día', unidadPlural: 'días', porPerro: true, ocupaCupo: false, adaptacion: false, web: true });
  saveCfg(); renderSrv();
  const d = $(`#edSrv details[data-i="${cfg.servicios.length - 1}"]`); d.open = true; d.querySelector('input').focus(); d.querySelector('input').select();
  renderForm();
});

$('#cfgForm').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.eadd) { cfg[b.dataset.eadd].push(clone(EDITORS[b.dataset.eadd].blank)); renderEditor(b.dataset.eadd); }
  else if (b.dataset.edel) {
    const k = b.dataset.edel, i = +b.dataset.i;
    cfg[k].splice(i, 1);
    if (k === 'extras') { const ne = {}; Object.entries(st.extras).forEach(([j, v]) => { if (+j < i) ne[j] = v; else if (+j > i) ne[+j - 1] = v; }); st.extras = ne; }
    renderEditor(k);
  } else if (b.id === 'btnExport') {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'inquietos-ajustes.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000); return;
  } else if (b.id === 'btnFactory') {
    if (!(await ask('¿Volver a los precios y textos que están publicados en la web? El historial no se borra.', 'Restaurar'))) return;
    const n = cfg.nextNumero; cfg = clone(DEFAULT_CFG); cfg.nextNumero = n; initCfgUI();
  } else return;
  saveCfg(); renderForm();
});
$('#fileImport').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { cfg = Object.assign(clone(DEFAULT_CFG), JSON.parse(await f.text())); saveCfg(); initCfgUI(); renderForm(); toast('Ajustes importados.'); }
  catch { toast('Ese archivo no es una copia de ajustes válida.'); }
  e.target.value = '';
});
function initCfgUI() { fillCfgForm(); Object.keys(EDITORS).forEach(renderEditor); renderSrv(); refreshSums(); }

/* resumen de cada sección en la lista de Ajustes */
function refreshSums() {
  if (clientMode || !$('#setHome')) return;
  const n = Cotizador.config(cfg), g = ghCfg(), pub = lsGet(LS_PUB, null);
  const minP = Math.min(...n.servicios.map((x) => x.precio));
  const S = {
    negocio: [cfg.negocio, cfg.telefono ? `WhatsApp ${cfg.telefono}` : 'Falta tu WhatsApp'].filter(Boolean).join(' · '),
    cobros: [cfg.alias ? `Alias ${cfg.alias}` : (cfg.cbu ? 'CBU cargado' : 'Falta el alias o CBU'), `seña ${pctTxt(n.seniaPct)}`].join(' · '),
    servicios: `${n.servicios.length} ${n.servicios.length === 1 ? 'servicio' : 'servicios'}${isFinite(minP) ? ` · desde ${money(minP)}` : ''}`,
    extras: n.extras.length ? n.extras.map((x) => x.nombre.replace(/\s*\(.*\)$/, '')).join(', ') : 'Ninguno',
    descuentos: [n.descPerroAdicional ? `${pctTxt(n.descPerroAdicional)} segundo perro` : '', n.fechasEspeciales.length ? `${n.fechasEspeciales.length} fechas especiales` : '', n.redondeo ? `redondeo a ${money(n.redondeo)}` : ''].filter(Boolean).join(' · ') || 'Sin descuentos generales',
    adaptacion: n.adaptacion.activa ? (n.adaptacion.fijo ? `${money(n.adaptacion.fijo)} · obligatoria` : `${n.adaptacion.pct === 50 ? 'Medio día' : pctTxt(n.adaptacion.pct) + ' de un día'} · obligatoria`) : 'No se cobra',
    presupuesto: `Válido ${cfg.validez || 0} días · próximo N° ${String(cfg.nextNumero).padStart(4, '0')}`,
    web: cfg.mostrarPrecios !== false ? 'Precios visibles' + (cfg.aviso && cfg.aviso.texto ? ' · con aviso' : '') : 'Sin precios',
    conexion: g.token ? (pub && pub.sig === pubSig() ? 'Conectada · todo publicado' : 'Conectada · hay cambios sin publicar') : 'Sin conectar',
    respaldo: 'Guardar o cargar tus ajustes',
  };
  Object.entries(S).forEach(([k, v]) => { const el = $(`[data-sum="${k}"]`); if (el) el.textContent = v; });
  const c = $('[data-open="conexion"]'); if (c) c.classList.toggle('attn', !g.token);
}
let pageOpen = null;
function openPage(key, push = true) {
  const pg = $(`.setpage[data-page="${key}"]`); if (!pg) return;
  $('#setHome').hidden = true;
  $$('.setpage').forEach((x) => (x.hidden = x !== pg));
  pageOpen = key;
  if (key === 'servicios' && !lsGet('ic.vistoPrecios', false)) { lsSet('ic.vistoPrecios', true); renderInicio(); }
  if (push) history.pushState({ page: key }, '');
  window.scrollTo(0, 0);
  const h = pg.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
function closePage(fromPop = false) {
  if (!pageOpen) return;
  const was = pageOpen; pageOpen = null;
  $$('.setpage').forEach((x) => (x.hidden = true));
  $('#setHome').hidden = false; refreshSums();
  if (!fromPop && history.state && history.state.page) history.back();
  const b = $(`[data-open="${was}"]`); if (b) b.focus({ preventScroll: true });
}
$('#setHome').addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) openPage(b.dataset.open); });
document.addEventListener('click', (e) => { if (e.target.closest('[data-back]')) closePage(); });
window.addEventListener('popstate', () => { if (pageOpen) closePage(true); });

/* ======================= AGENDA Y CUPOS ======================= */
let agView = null, agSel = null;
function refreshDisp() { if (!clientMode) { DISP = dispLocal(); renderAgenda(); renderForm(); refreshPubState(); renderInicio(); } }
function entradasDelDia(k) {
  return lsGet(LS_HIST, []).filter((h) => ['senado', 'pagado'].includes(h.estado) && Cotizador.ocupacion([h])[k]);
}
function renderAgenda() {
  if (clientMode || !$('#agGrid')) return;
  const d0 = new Date();
  if (!agView) agView = new Date(d0.getFullYear(), d0.getMonth(), 1);
  const y = agView.getFullYear(), m = agView.getMonth(), today = iso(d0), D = DISP || dispLocal();
  $('#agTitle').textContent = `${MESES[m]} ${y}`;
  const lead = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  let h = '<span></span>'.repeat(lead);
  for (let d = 1; d <= days; d++) {
    const k = iso(new Date(y, m, d)), e = Cotizador.estadoDia(D, k);
    const cls = ['day', 'agd'];
    if (k < today) cls.push('past');
    if (k === today) cls.push('today');
    if (e.cerrado) cls.push('closed'); else if (e.lleno) cls.push('full'); else if (e.ocupados && e.libres <= num(cfg.cupos.avisoQuedan)) cls.push('few'); else if (e.ocupados) cls.push('some');
    if (k === agSel) cls.push('sel');
    const sub = e.cerrado ? 'cerr.' : e.ocupados ? `${e.ocupados}/${e.cap}` : '';
    h += `<button type="button" class="${cls.join(' ')}" data-agday="${k}" aria-pressed="${k === agSel}" aria-label="${d} de ${MESES[m]}: ${e.cerrado ? 'cerrado' : `${e.ocupados} de ${e.cap} ocupados`}"><span>${d}</span><small>${sub}</small></button>`;
  }
  $('#agGrid').innerHTML = h;
  renderAgDay();
}
function renderAgDay() {
  const box = $('#agDay');
  if (!agSel) { box.hidden = true; return; }
  const D = DISP || dispLocal(), e = Cotizador.estadoDia(D, agSel), ag = agGet(), d = parseDate(agSel);
  const manual = num(ag.extra[agSel]);
  const ents = entradasDelDia(agSel);
  box.hidden = false;
  box.innerHTML = `
    <div class="agd-head"><h3>${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}</h3>
      <button type="button" class="iconbtn" id="agClose" aria-label="Cerrar">${icon('x')}</button></div>
    <p class="agd-big">${e.cerrado ? '<b>Cerrado</b> · no se toman reservas' : `<b>${e.ocupados}</b> de ${e.cap} lugares ocupados · ${e.libres ? `quedan <b>${e.libres}</b>` : '<b>completo</b>'}`}</p>
    ${ents.length ? `<ul class="agd-list">${ents.map((h) => `<li><b>${esc(nombresPerros(h.s).join(', '))}</b> · ${esc(h.s.cliente)} · ${esc(servDe(h.c, h.s.servicio).nombre)} <span class="opt">${esc(h.numero)}</span></li>`).join('')}</ul>` : '<p class="hint" style="margin:0">Ningún presupuesto señado o pagado ocupa este día.</p>'}
    <div class="agd-row"><span>Reservas cargadas a mano</span>
      <div class="stepper sm"><button type="button" class="stp" data-agm="-1" aria-label="Una menos" ${manual ? '' : 'disabled'}>−</button><output id="agMan">${manual}</output><button type="button" class="stp" data-agm="1" aria-label="Una más">+</button></div></div>
    <label class="switch" for="agClosed"><input type="checkbox" id="agClosed" ${e.cerrado ? 'checked' : ''}><span>Día cerrado (vacaciones, feriado o lleno por otro motivo)</span></label>`;
}
$('#agCal').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'agPrev' || b.id === 'agNext') { agView = new Date(agView.getFullYear(), agView.getMonth() + (b.id === 'agNext' ? 1 : -1), 1); renderAgenda(); }
  else if (b.dataset.agday) { agSel = agSel === b.dataset.agday ? null : b.dataset.agday; renderAgenda(); if (agSel) $('#agDay').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
});
$('#agDay').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'agClose') { agSel = null; renderAgenda(); return; }
  if (b.dataset.agm) {
    const ag = agGet(); ag.extra[agSel] = Math.max(0, num(ag.extra[agSel]) + +b.dataset.agm);
    if (!ag.extra[agSel]) delete ag.extra[agSel];
    lsSet(LS_AG, ag); refreshDisp();
  }
});
$('#agDay').addEventListener('change', (e) => {
  if (e.target.id !== 'agClosed') return;
  const ag = agGet(), set = new Set(ag.cerrados);
  if (e.target.checked) set.add(agSel); else set.delete(agSel);
  ag.cerrados = [...set].sort(); lsSet(LS_AG, ag); refreshDisp();
});

/* ======================= PUBLICAR EN LA WEB (GitHub) ======================= */
function repoGuess() {
  const h = location.hostname;
  if (h.endsWith('.github.io')) {
    const repo = location.pathname.split('/').filter(Boolean)[0];
    if (repo && repo !== 'app') return `${h.split('.')[0]}/${repo}`;
  }
  return '0ariell/WebGuarderiaCanina';
}
function ghCfg() { const g = Object.assign({}, lsGet(LS_GH, {})); g.repo = g.repo || repoGuess(); g.branch = g.branch || 'main'; return g; }
function b64utf8(str) { const bytes = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
function unb64utf8(str) { const bin = atob(String(str).replace(/\s/g, '')); return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))); }
function ghErr(status) {
  const m = {
    401: 'La clave de GitHub no es válida o venció. Creá una nueva en Ajustes → Conexión con la página.',
    403: 'La clave no tiene permiso para escribir. Revisá que en Contents diga "Read and write".',
    404: 'No encuentro el repositorio, o la clave no tiene acceso a él. Revisá el nombre y que lo hayas elegido al crear la clave.',
    409: 'Hubo otro cambio al mismo tiempo. Probá publicar de nuevo.',
    422: 'GitHub rechazó el archivo. Probá publicar de nuevo.',
  }[status];
  const e = new Error(m || (status ? `GitHub respondió con un error (${status}). Probá de nuevo en un rato.` : 'No hay conexión con GitHub. Revisá internet y probá de nuevo.'));
  e.status = status; return e;
}
async function gh(path, opts = {}) {
  const g = ghCfg();
  let r;
  try {
    r = await fetch(`https://api.github.com/repos/${g.repo}/${path}`, {
      method: opts.method || 'GET', cache: 'no-store', body: opts.body,
      headers: { Authorization: `Bearer ${g.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    });
  } catch { throw ghErr(0); }
  return r;
}
async function ghPutFile(path, content, message) {
  const g = ghCfg();
  const r = await gh(`contents/${path}?ref=${encodeURIComponent(g.branch)}`);
  let sha = null;
  if (r.ok) {
    const j = await r.json(); sha = j.sha;
    try { if (j.content && unb64utf8(j.content) === content) return 'igual'; } catch { /* sigue */ }
  } else if (r.status !== 404) throw ghErr(r.status);
  const w = await gh(`contents/${path}`, { method: 'PUT', body: JSON.stringify(Object.assign({ message, content: b64utf8(content), branch: g.branch }, sha ? { sha } : {})) });
  if (!w.ok) throw ghErr(w.status);
  return 'ok';
}
function configJs(site) {
  const f = new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  return `/*\n * ============================================================\n *  INQUIETOS CANINOS · DATOS DEL NEGOCIO\n *  Publicado desde la app el ${f}.\n *  Para cambiarlo: app → Ajustes → hacé tus cambios → Publicar.\n *  También se puede editar a mano. Qué significa cada campo: README.md\n * ============================================================\n */\nwindow.INQUIETOS = ${JSON.stringify(site, null, 2)};\n`;
}
const dispJson = () => JSON.stringify(dispLocal(), null, 2) + '\n';
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return String(h >>> 0); }
const pubSig = () => hash(JSON.stringify(toSite(cfg)) + dispJson());
function refreshPubState() {
  if (clientMode) return;
  const g = ghCfg(), pub = lsGet(LS_PUB, null);
  const pendiente = !pub || pub.sig !== pubSig();
  const bar = $('#pubbar');
  const tab = ($('#tabs button.active') || {}).dataset;
  // no se muestra mientras armás un presupuesto (ahí manda la barra del total)
  bar.hidden = !pendiente || (tab && tab.tab === 'recibo') || !lsGet(LS_CFG, null) && !lsGet(LS_AG, null);
  $('#pubbarTxt').textContent = g.token ? 'Tenés cambios que tu página todavía no muestra' : 'Tu página todavía no muestra tus cambios';
  $('#pubbarBtn').lastChild.textContent = g.token ? 'Publicar' : 'Conectar';
  document.body.classList.toggle('has-pubbar', !bar.hidden);
  refreshSums(); if ($('#hSteps')) renderInicio();
}
$('#pubbarBtn').addEventListener('click', () => { if (ghCfg().token) publicar(); else { showTab('ajustes'); openPage('conexion'); } });
let publishing = false;
async function publicar() {
  if (publishing) return;
  const g = ghCfg();
  if (!g.token) {
    showTab('ajustes'); openPage('conexion');
    setTimeout(() => $('#gh-tok').focus({ preventScroll: true }), 80);
    toast('Primero conectá la app con tu página. Te dejo los pasos.');
    return;
  }
  publishing = true;
  const btns = [$('#pubbarBtn')]; btns.forEach((b) => { b.disabled = true; b.dataset.label = b.lastChild.textContent; b.lastChild.textContent = 'Publicando…'; });
  try {
    const r1 = await ghPutFile('config.js', configJs(toSite(cfg)), 'Precios y textos actualizados desde la app');
    const r2 = await ghPutFile('disponibilidad.json', dispJson(), 'Disponibilidad actualizada desde la app');
    lsSet(LS_PUB, { sig: pubSig(), at: Date.now() });
    toast(r1 === 'igual' && r2 === 'igual' ? 'Ya estaba todo publicado.' : 'Publicado. La web se actualiza en 1 o 2 minutos.');
  } catch (e) {
    toast(e.message);
    publishing = false; btns.forEach((b) => { b.disabled = false; b.lastChild.textContent = b.dataset.label; });
    return;
  }
  publishing = false; btns.forEach((b) => { b.disabled = false; b.lastChild.textContent = b.dataset.label; });
  refreshPubState();
}

function fillGh() {
  const g = ghCfg();
  $('#gh-repo').value = g.repo; $('#gh-tok').value = g.token ? '••••••••••••' : '';
  $('#ghRepoName').textContent = g.repo.split('/')[1] || g.repo;
  $('#ghState').textContent = g.token ? 'Conectada. Ya podés publicar.' : 'Todavía no está conectada.';
}
$('#ghSave').addEventListener('click', async () => {
  const g = lsGet(LS_GH, {});
  const repo = $('#gh-repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const tok = $('#gh-tok').value.trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { $('#ghState').textContent = 'El repositorio tiene que ser usuario/nombre, por ejemplo 0ariell/WebGuarderiaCanina.'; return; }
  g.repo = repo; if (tok && !tok.startsWith('•')) g.token = tok;
  if (!g.token) { $('#ghState').textContent = 'Pegá la clave que generaste en GitHub.'; return; }
  lsSet(LS_GH, g);
  $('#ghState').textContent = 'Probando la conexión…';
  let msg;
  try {
    const r = await gh(`contents/config.js?ref=${encodeURIComponent(ghCfg().branch)}`);
    if (!r.ok) throw ghErr(r.status);
    msg = 'Conectada. Ya podés publicar.'; toast('Conexión con GitHub lista.');
  } catch (e) { msg = e.message; }
  fillGh(); $('#ghState').textContent = msg; refreshPubState();
});
$('#ghForget').addEventListener('click', async () => {
  if (!(await ask('¿Borrar la clave de GitHub de este celular?', 'Borrar'))) return;
  const g = lsGet(LS_GH, {}); delete g.token; lsSet(LS_GH, g); fillGh(); refreshPubState();
});

/* ======================= TEMA CLARO / OSCURO ======================= */
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (document.documentElement.dataset.theme || (mqDark.matches ? 'dark' : 'light')) === 'dark';
function paintTheme() {
  const dark = isDark();
  $('#themeBtn').setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0f1d3d' : '#ffffff'));
}
$('#themeBtn').addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('ic.theme', next); } catch { /* sin almacenamiento */ }
  paintTheme();
});
if (mqDark.addEventListener) mqDark.addEventListener('change', paintTheme);
paintTheme();

/* ======================= NAVEGACIÓN / PWA ======================= */
function showTab(name) {
  $$('#tabs button').forEach((b) => { b.classList.toggle('active', b.dataset.tab === name); b.setAttribute('aria-current', b.dataset.tab === name ? 'page' : 'false'); });
  $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
  document.body.classList.toggle('on-recibo', name === 'recibo');
  if (name === 'agenda') refreshDisp();
  if (name === 'inicio') renderInicio();
  if (name !== 'ajustes' && pageOpen) closePage();
  refreshPubState();
  window.scrollTo(0, 0);
}
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tab === 'ajustes' && pageOpen) closePage();   // tocar Ajustes de nuevo vuelve a la lista
  showTab(b.dataset.tab);
});

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (!clientMode) $('#installBtn').hidden = false; });
$('#installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#installBtn').hidden = true;
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* disponibilidad publicada (para los tutores) */
async function cargarDispPublicada() {
  try {
    const r = await fetch(`../disponibilidad.json?t=${Date.now()}`, { cache: 'no-store' });
    if (r.ok) { DISP = await r.json(); if (!DISP.capacidad) DISP.capacidad = num(cfg.cupos.capacidad) || 1; updateSummary(); }
  } catch { /* sin disponibilidad: se puede elegir cualquier día */ }
}

/* ======================= INICIO ======================= */
async function init() {
  const m = location.hash.match(/[#&]c=([^&]+)/);
  const direct = /^#cliente\b/.test(location.hash);
  if (direct) {
    // entrada desde la página web: precios de config.js
    clientMode = true;
    cfg = clone(DEFAULT_CFG);
    st = blankState();
    const q = (k) => { const x = location.hash.match(new RegExp(`[#&]${k}=([^&]+)`)); return x ? decodeURIComponent(x[1]) : null; };
    if (q('s') && cfg.servicios[+q('s')]) st.servicio = +q('s');
    if (q('p')) for (let i = 1; i < Math.min(+q('p'), 6); i++) st.dogs.push({ nombre: '', raza: '', edad: '', tamano: 0 });
    if (q('e')) q('e').split('.').forEach((i) => { if (cfg.extras[+i]) st.extras[+i] = ''; });
    if (q('q')) st.cantidad = +q('q');
    if (q('pv') === '0') st.primeraVez = false;
  } else if (m) {
    try {
      const payload = await decodePayload(m[1]);
      clientMode = true;
      cfg = Object.assign(clone(DEFAULT_CFG), payload.c || {});
      st = Object.assign(blankState(), payload.s || {});
    } catch {
      toast('El link está incompleto. Pedile a tu cuidador que te lo mande de nuevo.');
    }
  }
  if (clientMode) {
    document.body.classList.add('client');
    $('#clientIntro').hidden = false;
    $('#btnGenerar').textContent = 'Ver presupuesto';
    cargarDispPublicada();
  } else {
    const draft = lsGet(LS_DRAFT, null);
    if (draft && draft.st) { st = Object.assign(blankState(), draft.st); currentId = draft.currentId || null; }
    DISP = dispLocal();
    initCfgUI(); renderHistory(); fillGh(); renderAgenda();
  }
  const hoy = new Date();
  $('#todayLbl').textContent = `${DIAS_LARGOS[hoy.getDay()]} ${hoy.getDate()} de ${MESES[hoy.getMonth()]}`;
  $('#adminHead').hidden = clientMode;
  applyBrand();
  renderForm();
  if (clientMode) showTab('recibo');
  else { const go = location.hash === '#nuevo' ? 'recibo' : 'inicio'; showTab(go); renderInicio(); }
  refreshPubState();
}
init();
