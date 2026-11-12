/* Inquietos Caninos — recibos y presupuestos (PWA sin servidor) */
'use strict';

/* ======================= CONFIGURACIÓN POR DEFECTO ======================= */
const DEFAULT_CFG = {
  negocio: 'Inquietos Caninos',
  responsable: '',
  telefono: '',
  redes: '',
  direccion: '',
  alias: '',
  cbu: '',
  titular: '',
  banco: '',
  horaIn: '09:00',
  horaOut: '18:00',
  servicios: [
    { nombre: 'Estadía', precio: 70000, unidad: 'dia' },
    { nombre: 'Guardería de día', precio: 25000, unidad: 'dia' },
    { nombre: 'Paseo', precio: 8000, unidad: 'dia' },
  ],
  tamanos: [],            // ej: { nombre: 'Grande', recargo: 10 } — solo si cobrás distinto por tamaño
  extras: [
    { nombre: 'Baño', precio: 15000, unidad: 'unico' },
    { nombre: 'Administración de medicación', precio: 2000, unidad: 'dia' },
    { nombre: 'Traslado (búsqueda y entrega)', precio: 10000, unidad: 'unico' },
  ],
  pagos: [
    { nombre: 'Transferencia', descuento: 0 },
    { nombre: 'Efectivo', descuento: 10 },
  ],
  descEstadia: [
    { desde: 15, pct: 5 },
    { desde: 30, pct: 10 },
  ],
  descPerroAdicional: 0,
  seniaPct: 30,
  condiciones: [
    'Los días festivos (Noche buena, Navidad/ Fin de año y Año Nuevo) la tarifa es doble.',
    'La reserva de la estadía se realiza con una seña del 30%.',
    'El valor de la estadía puede modificarse al momento del ingreso, de acuerdo con las actualizaciones por inflación.',
    'Al ingresar tu/s cuatro patas, se descontará del total vigente el importe abonado previamente como reserva.',
    'En caso de querer realizar la reserva, los datos para la transferencia figuran en este presupuesto.',
  ].join('\n'),
  validez: 7,
  nextNumero: 1,
};

/* Datos del negocio desde config.js (archivo compartido con la página web) */
(function aplicarConfig(S) {
  if (!S) return;
  const set = (k, v) => { if (v !== undefined && v !== null && v !== '') DEFAULT_CFG[k] = v; };
  ['negocio', 'responsable', 'alias', 'cbu', 'titular', 'banco', 'horaIn', 'horaOut',
    'extras', 'pagos', 'descEstadia', 'descPerroAdicional', 'seniaPct', 'validez'].forEach((k) => set(k, S[k]));
  set('telefono', S.whatsapp);
  set('redes', S.instagram && '@' + String(S.instagram).replace(/^@/, ''));
  set('direccion', S.direccion || S.zona);
  if (Array.isArray(S.servicios)) set('servicios', S.servicios.map((x) => ({ nombre: x.nombre, precio: x.precio, unidad: x.unidad || 'dia' })));
  set('condiciones', Array.isArray(S.condiciones) ? S.condiciones.join('\n') : S.condiciones);
})(window.INQUIETOS);

const LS_CFG = 'ic.cfg', LS_HIST = 'ic.hist', LS_DRAFT = 'ic.draft';

/* ======================= UTILIDADES ======================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clone = (o) => JSON.parse(JSON.stringify(o));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const money = (n) => (n < 0 ? '-$' : '$') + nf.format(Math.abs(Math.round(n)));
const pctTxt = (p) => String(+(+p).toFixed(2)).replace('.', ',') + '%';

function lsGet(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio / privado */ } }

function parseDate(s) { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return y ? new Date(y, m - 1, d) : null; }
function fmtDate(s) { const d = parseDate(s); return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : ''; }
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function todayStr() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; }

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2400);
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

/* base64url + compresión para el link del cliente */
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

/* ======================= ESTADO ======================= */
/* Ajustes guardados: si un valor no se tocó desde la app, se toma el de config.js
   (así, editar config.js actualiza la app sin pisar lo que se cambió a mano). */
const LS_BASE = 'ic.cfgBase';
function loadCfg() {
  const saved = lsGet(LS_CFG, null), base = lsGet(LS_BASE, {});
  const out = clone(DEFAULT_CFG);
  if (saved) for (const k of Object.keys(saved)) {
    const untouched = k in base && JSON.stringify(saved[k]) === JSON.stringify(base[k]);
    if (!untouched || k === 'nextNumero') out[k] = saved[k];
  }
  return out;
}
let cfg = loadCfg();
let clientMode = false;
let currentId = null;     // id del historial del recibo en edición
let lastResult = null;    // { blob, url, file, data }

function blankState() {
  return {
    cliente: '', telCliente: '', dirCliente: '',
    dogs: [{ nombre: '', raza: '', edad: '', tamano: 0 }],
    observaciones: '',
    servicio: 0, fechaIn: '', horaIn: cfg.horaIn, fechaOut: '', horaOut: cfg.horaOut,
    excluidos: [],        // días dentro del rango en que el perro no viene (YYYY-MM-DD)
    extras: {},           // idx -> cantidad (string, '' = automático)
    pago: -1,             // -1 = mostrar todas las formas de pago
    descExtra: '', pagado: '',
  };
}
let st = blankState();

/* ======================= CÁLCULO ======================= */
function countQty(c, s) {
  const serv = c.servicios[s.servicio] || c.servicios[0] || { unidad: 'dia' };
  const a = parseDate(s.fechaIn), b = parseDate(s.fechaOut) || a;
  const exc = s.excluidos || [];
  let qty = 0;
  if (a && b >= a) {
    if (serv.unidad === 'noche') qty = Math.round((b - a) / 864e5);
    else for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (!exc.includes(iso(d))) qty++;
  }
  return { qty, unidad: serv.unidad };
}

function calc(c, s) {
  const serv = c.servicios[s.servicio] || c.servicios[0] || { nombre: 'Servicio', precio: 0, unidad: 'dia' };
  const { qty, unidad } = countQty(c, s);
  const uSing = unidad === 'noche' ? 'noche' : 'día';
  const uPlur = unidad === 'noche' ? 'noches' : 'días';
  const qtyTxt = (q) => `${q} ${q === 1 ? uSing : uPlur}`;

  const dogs = s.dogs.map((d, i) => {
    const tam = c.tamanos[d.tamano];
    const rec = tam ? num(tam.recargo) : 0;
    const unit = Math.round(num(serv.precio) * (1 + rec / 100));
    let importe = unit * qty;
    const notas = [];
    if (rec) notas.push(`${rec > 0 ? '+' : ''}${pctTxt(rec)} ${tam.nombre.toLowerCase()}`);
    const dp = num(c.descPerroAdicional);
    if (i > 0 && dp) { importe = Math.round(importe * (1 - dp / 100)); notas.push(`-${pctTxt(dp)} perro adicional`); }
    return { nombre: (d.nombre || `Perro ${i + 1}`).trim(), detalle: `${qtyTxt(qty)} × ${money(unit)}`, notas: notas.join(' · '), importe };
  });
  const servicioTotal = dogs.reduce((a, d) => a + d.importe, 0);

  const extras = [];
  c.extras.forEach((e, i) => {
    if (!(i in s.extras)) return;
    const raw = String(s.extras[i] ?? '').trim();
    const q = raw !== '' ? num(raw) : (e.unidad === 'dia' ? qty : 1);
    const importe = Math.round(num(e.precio) * q);
    extras.push({ nombre: e.nombre, detalle: `${q} × ${money(num(e.precio))}`, importe });
  });
  const extrasTotal = extras.reduce((a, e) => a + e.importe, 0);
  const subtotal = servicioTotal + extrasTotal;

  const descuentos = [];
  const tier = [...c.descEstadia].filter((t) => num(t.desde) > 0 && qty >= num(t.desde)).sort((x, y) => num(y.desde) - num(x.desde))[0];
  if (tier && num(tier.pct)) {
    descuentos.push({ nombre: `Descuento estadía larga (${pctTxt(tier.pct)})`, importe: Math.round(servicioTotal * num(tier.pct) / 100) });
  }
  const dx = clientMode ? 0 : num(s.descExtra);
  if (dx) {
    const baseDx = subtotal - descuentos.reduce((a, d) => a + d.importe, 0);
    descuentos.push({ nombre: `Descuento especial (${pctTxt(dx)})`, importe: Math.round(baseDx * dx / 100) });
  }
  const base = subtotal - descuentos.reduce((a, d) => a + d.importe, 0);

  let pagos = c.pagos.map((p) => ({ nombre: p.nombre, pct: num(p.descuento), total: Math.round(base * (1 - num(p.descuento) / 100)) }));
  if (s.pago >= 0 && pagos[s.pago]) pagos = [pagos[s.pago]];
  if (!pagos.length) pagos = [{ nombre: '', pct: 0, total: base }];

  const maxTotal = Math.max(...pagos.map((p) => p.total));
  const seniaPct = num(c.seniaPct);
  const senia = Math.round(maxTotal * seniaPct / 100);
  const pagado = clientMode ? 0 : num(s.pagado);

  return { serv, qty, unidad, uPlur, dogs, extras, servicioTotal, extrasTotal, subtotal, descuentos, base, pagos, seniaPct, senia, pagado };
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

function renderForm() {
  const selS = $('#selServicio');
  selS.innerHTML = cfg.servicios.map((s, i) => `<option value="${i}">${esc(s.nombre)} · ${money(num(s.precio))} por ${s.unidad === 'noche' ? 'noche' : 'día'}</option>`).join('');
  if (st.servicio >= cfg.servicios.length) st.servicio = 0;
  selS.value = st.servicio;

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


  $('#extrasList').innerHTML = cfg.extras.map((e, i) => `
    <label class="extra" for="ex${i}">
      <input type="checkbox" id="ex${i}" data-extra="${i}" ${i in st.extras ? 'checked' : ''}>
      <span class="name">${esc(e.nombre)}<span class="price">${money(num(e.precio))} ${e.unidad === 'dia' ? 'por día' : 'una vez'}</span></span>
      <input type="number" min="0" step="1" inputmode="numeric" data-extraq="${i}" placeholder="auto" value="${esc(st.extras[i] ?? '')}" ${i in st.extras ? '' : 'disabled'} aria-label="Cantidad de ${esc(e.nombre)}">
    </label>`).join('');
  $('#noExtras').hidden = cfg.extras.length > 0;
  $('#extrasList').hidden = !cfg.extras.length;

  if (st.pago >= cfg.pagos.length) st.pago = -1;
  const opts = [{ i: -1, n: cfg.pagos.length > 1 ? 'Todas' : 'Total', d: 0 }, ...cfg.pagos.map((p, i) => ({ i, n: p.nombre, d: num(p.descuento) }))];
  $('#pagos').innerHTML = opts.map((o) => `<button type="button" class="${st.pago === o.i ? 'on' : ''}" data-pago="${o.i}">${esc(o.n)}${o.d ? ` <small>${o.d > 0 ? '−' : '+'}${pctTxt(Math.abs(o.d))}</small>` : ''}</button>`).join('');

  for (const el of form.elements) if (el.name && el.name in st && typeof st[el.name] !== 'object') el.value = st[el.name];
  $('#adminPayFields').hidden = clientMode;
  updateSummary();
}

/* ---------- calendario: tocás ingreso y retiro ---------- */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
let calView = null;
const shortDate = (str) => { const d = parseDate(str); return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };

function renderCal() {
  if (!calView) { const base = parseDate(st.fechaIn) || new Date(); calView = new Date(base.getFullYear(), base.getMonth(), 1); }
  const y = calView.getFullYear(), m = calView.getMonth();
  $('#calTitle').textContent = `${MESES[m]} ${y}`;
  const A = st.fechaIn, B = st.fechaOut || '', exc = st.excluidos || [];
  const today = iso(new Date());
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
    h += `<button type="button" class="${cls.join(' ')}" data-day="${k}" aria-pressed="${!!(inR || k === A)}" aria-label="${d} de ${MESES[m]}">${d}</button>`;
  }
  $('#calGrid').innerHTML = h;

  const unidad = countQty(cfg, st).unidad, q = countQty(cfg, st).qty;
  const word = unidad === 'noche' ? (q === 1 ? 'noche' : 'noches') : (q === 1 ? 'día' : 'días');
  let hint;
  if (!A) hint = 'Tocá el día que lo traés.';
  else if (!B) hint = 'Ahora tocá el día que lo retirás. Si es un solo día, tocá el mismo.';
  else {
    hint = `<b>${q} ${word}</b>, ${A === B ? 'el ' + shortDate(A) : `del ${shortDate(A)} al ${shortDate(B)}`}.`;
    if (unidad !== 'noche' && A !== B) hint += ' Si algún día no viene, tocalo para sacarlo.';
  }
  $('#calHint').innerHTML = hint;
  let hasWeekend = false;
  if (A && B && unidad !== 'noche') for (let d = parseDate(A); iso(d) <= B; d.setDate(d.getDate() + 1)) if ([0, 6].includes(d.getDay()) && !exc.includes(iso(d))) { hasWeekend = true; break; }
  $('#calWeekdays').hidden = !hasWeekend;
  $('#calClear').hidden = !A;
  $('#calTools').hidden = !A;
}

function pickDay(k) {
  const A = st.fechaIn, B = st.fechaOut, unidad = countQty(cfg, st).unidad;
  if (A && B && k > A && k < B && unidad !== 'noche') {
    const e = st.excluidos || []; st.excluidos = e.includes(k) ? e.filter((x) => x !== k) : [...e, k];
  } else if (A && !B) {
    if (k < A) st.fechaIn = k; else st.fechaOut = k;
  } else { st.fechaIn = k; st.fechaOut = ''; st.excluidos = []; }
}

function updateSummary() {
  renderCal();
  const q = countQty(cfg, st);
  const unit = q.unidad === 'noche' ? ['noche', 'noches'] : ['día', 'días'];
  const traslado = cfg.extras.some((e, i) => i in st.extras && /traslad|busc|retir|entreg/i.test(e.nombre));
  $('#dirField').hidden = !(traslado || st.dirCliente);

  const r = calc(cfg, st);
  const best = Math.min(...r.pagos.map((p) => p.total));
  let h = '';
  r.dogs.forEach((d) => (h += `<div class="srow"><span class="k">${esc(d.nombre)}<small>${esc(d.detalle)}${d.notas ? ' · ' + esc(d.notas) : ''}</small></span><span class="v">${money(d.importe)}</span></div>`));
  r.extras.forEach((e) => (h += `<div class="srow"><span class="k">${esc(e.nombre)}<small>${esc(e.detalle)}</small></span><span class="v">${money(e.importe)}</span></div>`));
  if (r.extras.length || r.descuentos.length || r.dogs.length > 1) h += `<div class="srow dim"><span class="k">Subtotal</span><span class="v">${money(r.subtotal)}</span></div>`;
  r.descuentos.forEach((d) => (h += `<div class="srow disc"><span class="k">${esc(d.nombre)}</span><span class="v">−${money(d.importe)}</span></div>`));
  r.pagos.forEach((p) => (h += `<div class="srow tot ${r.pagos.length > 1 && p.total === best ? 'best' : ''}"><span class="k">${p.nombre ? esc(p.nombre) : 'Total'}${p.pct > 0 ? `<span class="tag-pct">−${pctTxt(p.pct)}</span>` : ''}</span><span class="v">${money(p.total)}</span></div>`));
  if (r.pagado) h += `<div class="srow dim"><span class="k">Seña cobrada</span><span class="v">${money(r.pagado)}</span></div>`;
  else if (r.seniaPct) h += `<div class="srow dim"><span class="k">Reserva ${pctTxt(r.seniaPct)}</span><span class="v">${money(r.senia)}</span></div>`;
  $('#summary').innerHTML = r.qty ? h : '<p class="empty">Cuando cargues las fechas vas a ver acá el detalle y el total.</p>';

  const bp = r.pagos.find((p) => p.total === best);
  $('#barTotal').textContent = money(best);
  $('#barTotalLabel').textContent = r.qty ? `${r.pagos.length > 1 && bp.nombre ? 'En ' + bp.nombre.toLowerCase() : 'Total'} · ${r.qty} ${r.qty === 1 ? unit[0] : unit[1]}` : 'Cargá las fechas';
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
    st[t.name] = t.name === 'servicio' ? +t.value : t.value;
  }
  updateSummary();
});

form.addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.day) {
    pickDay(b.dataset.day);
    if ($('#cal').getAttribute('aria-invalid')) { $('#cal').removeAttribute('aria-invalid'); const er = $('#err-cal'); if (er) er.remove(); }
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
    if (!(await ask('¿Borrar lo cargado y empezar un recibo nuevo?', 'Empezar nuevo'))) return;
    st = blankState(); currentId = null; calView = null; renderForm(); window.scrollTo(0, 0);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  if (!st.cliente.trim()) return focusErr('#f-cliente', 'Falta el nombre del dueño o dueña.');
  if (!st.dogs.some((d) => d.nombre.trim())) return focusErr('#dog0-n', 'Falta el nombre del perro.');
  if (!st.fechaIn) return focusErr('#cal', 'Elegí en el calendario el día que lo traés.');
  if (!countQty(cfg, st).qty) return focusErr('#cal', 'Elegí el día que lo retirás.');
  await generate();
});
function focusErr(sel, msg) {
  const el = $(sel); if (!el) { toast(msg); return; }
  // el aviso queda pegado al campo, no en un cartel que se va
  const id = 'err-' + (el.id || 'campo');
  const p = document.createElement('p'); p.className = 'err'; p.id = id; p.textContent = msg; p.setAttribute('role', 'alert');
  (el.id === 'cal' ? $('#calHint') : el).insertAdjacentElement('afterend', p);
  el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', id);
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => (el.id === 'cal' ? ($('#calGrid .today') || $('#calGrid .day')) : el).focus({ preventScroll: true }), 350);
}
function clearErrors() {
  $$('#form .err').forEach((x) => x.remove());
  $$('#form [aria-invalid]').forEach((x) => { x.removeAttribute('aria-invalid'); x.removeAttribute('aria-describedby'); });
}

/* ======================= RECIBO (CANVAS → PNG) ======================= */
const RC = {
  bg: '#e3edf6', paper: '#ffffff', ink: '#0f2a5c', ink2: '#4b6183', ink3: '#8496ae', rule: '#d9e4ef',
  brand: '#1d4fa6', accent: '#13a6cb', sky: '#eaf5fb', go: '#1e8a55', field: '#f1f6fb', ball: '#e3262b',
};
/* logo: si existe icons/logo.png se usa en la app y en el recibo */
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
function paw(ctx, cx, cy, s, color) {
  ctx.fillStyle = color;
  const el = (x, y, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(cx + x * s, cy + y * s, rx * s, ry * s, rot, 0, Math.PI * 2); ctx.fill(); };
  el(0, 4.2, 4.6, 3.9, 0); el(-6.7, -1.4, 2, 2.6, -0.31); el(-2.8, -5.6, 2, 2.7, -0.1); el(2.8, -5.6, 2, 2.7, 0.1); el(6.7, -1.4, 2, 2.6, 0.31);
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
  const hr = (yy, dashed) => {
    ctx.strokeStyle = RC.rule; ctx.lineWidth = 2; ctx.setLineDash(dashed ? [10, 8] : []);
    ctx.beginPath(); ctx.moveTo(P, yy); ctx.lineTo(R, yy); ctx.stroke(); ctx.setLineDash([]);
  };
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
    ctx.font = F.disp(900, wpx, 'expanded');
    ctx.fillStyle = RC.ball; ctx.beginPath(); ctx.arc(P + ctx.measureText(first).width + 22, y + 104 - wpx * 0.62, wpx * 0.14, 0, Math.PI * 2); ctx.fill();
  }
  const my = y + (headH - 16) / 2;
  text(tipo === 'presupuesto' ? 'PRESUPUESTO' : 'RECIBO', R, my - 34, F.mono(600, 24), RC.accent, 'right', '3px');
  text(numero, R, my + 6, F.mono(600, 32), RC.ink, 'right');
  text(fecha, R, my + 44, F.mono(500, 24), RC.ink2, 'right');
  y += headH + 64;

  /* --- protagonista: el perro --- */
  const names = r.dogs.map((d) => d.nombre.toUpperCase());
  const hero = names.length > 2 ? names.slice(0, -1).join(', ') + ' Y ' + names.at(-1) : names.join(' Y ');
  let hpx = 132; ctx.font = F.disp(900, hpx, 'expanded');
  while (hpx > 70 && ctx.measureText(hero).width > IW) { hpx -= 4; ctx.font = F.disp(900, hpx, 'expanded'); }
  const heroLines = wrap(ctx, hero, IW);
  heroLines.forEach((ln, i) => text(ln, P - 4, y + hpx * 0.78 + i * hpx * 0.96, F.disp(900, hpx, 'expanded'), RC.brand));
  y += hpx * 0.78 + (heroLines.length - 1) * hpx * 0.96 + 26;
  const dogInfo = s.dogs.map((d) => [d.raza, d.edad].filter(Boolean).join(', ')).filter(Boolean).join(' · ');
  const tagline = [r.serv.nombre.toUpperCase(), `${r.qty} ${r.qty === 1 ? (r.unidad === 'noche' ? 'NOCHE' : 'DÍA') : r.uPlur.toUpperCase()}`].join('  ·  ');
  text(tagline, P, y + 32, F.mono(600, 28), RC.accent, 'left', '2px');
  y += 44;
  if (dogInfo) { ctx.font = F.body(400, 28); wrap(ctx, dogInfo, IW).forEach((ln) => { text(ln, P, y + 36, F.body(400, 28), RC.ink3); y += 40; }); }
  y += 40;

  /* --- pase de ingreso / retiro --- */
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
  if (s.fechaIn || s.fechaOut) {
    ctx.fillStyle = RC.sky; rr(ctx, P, y, IW, passH, 22); ctx.fill();
    if (s.fechaOut && s.fechaOut !== s.fechaIn) {
      dateBlock(P, IW / 2, 'INGRESO', s.fechaIn, s.horaIn);
      dateBlock(P + IW / 2 + 10, IW / 2 - 10, 'RETIRO', s.fechaOut, s.horaOut);
      ctx.strokeStyle = RC.rule; ctx.lineWidth = 3; ctx.setLineDash([10, 9]);
      ctx.beginPath(); ctx.moveTo(P + IW / 2, y + 28); ctx.lineTo(P + IW / 2, y + passH - 28); ctx.stroke(); ctx.setLineDash([]);
      // flecha
      ctx.fillStyle = RC.paper; ctx.beginPath(); ctx.arc(P + IW / 2, y + passH / 2, 26, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = RC.brand; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(P + IW / 2 - 10, y + passH / 2); ctx.lineTo(P + IW / 2 + 10, y + passH / 2);
      ctx.moveTo(P + IW / 2 + 2, y + passH / 2 - 8); ctx.lineTo(P + IW / 2 + 10, y + passH / 2); ctx.lineTo(P + IW / 2 + 2, y + passH / 2 + 8); ctx.stroke();
    } else {
      dateBlock(P, IW, 'FECHA', s.fechaIn || s.fechaOut, [s.horaIn, s.horaOut].filter(Boolean).join(' A '));
    }
    y += passH + 36;
  }

  /* --- datos del cliente --- */
  const facts = [['CLIENTE', s.cliente], ['WHATSAPP', s.telCliente], ['DIRECCIÓN', s.dirCliente]];
  const exc = (s.excluidos || []).filter((k) => k > s.fechaIn && k < (s.fechaOut || '')).sort();
  if (r.unidad !== 'noche' && exc.length) facts.push(['NO VIENE', exc.map(shortDate).join(', ')]);
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
  const item = (name, detail, amount) => {
    ctx.font = F.body(600, 34); const lines = wrap(ctx, name, IW - 260);
    lines.forEach((ln, i) => text(ln, P, y + 46 + i * 42, F.body(600, 34), RC.ink));
    text(money(amount), R, y + 46, F.body(600, 34), RC.ink, 'right');
    let yy = y + 46 + (lines.length - 1) * 42;
    if (detail) { ctx.font = F.mono(500, 25); wrap(ctx, detail, IW - 260).forEach((ln) => { yy += 38; text(ln, P, yy, F.mono(500, 25), RC.ink2); }); }
    y = yy + 26; hr(y);
  };
  hr(y);
  r.dogs.forEach((d) => item(d.nombre, [d.detalle, d.notas].filter(Boolean).join(' · '), d.importe));
  r.extras.forEach((e) => item(e.nombre, e.detalle, e.importe));
  const line = (k, v, color, weight = 500) => {
    text(k, P, y + 46, F.body(weight, 30), color); text(v, R, y + 46, F.body(600, 30), color, 'right'); y += 58;
  };
  y += 8;
  if (r.extras.length || r.descuentos.length || r.dogs.length > 1) line('Subtotal', money(r.subtotal), RC.ink2);
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
  const foot = [c.telefono && `WhatsApp ${c.telefono}`, c.direccion].filter(Boolean).join('  ·  ');
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
  L.push(`Cliente: ${s.cliente}${s.telCliente ? ' (' + s.telCliente + ')' : ''}`);
  L.push(`Perro${r.dogs.length > 1 ? 's' : ''}: ${r.dogs.map((d) => d.nombre).join(', ')}`);
  L.push(`Servicio: ${r.serv.nombre}`);
  if (s.fechaIn || s.fechaOut) L.push(`Fechas: ${[fmtDate(s.fechaIn), fmtDate(s.fechaOut)].filter(Boolean).join(' al ')}`);
  if (s.horaIn || s.horaOut) L.push(`Horario: ${s.horaIn} a ${s.horaOut}`);
  L.push(`Cantidad: ${r.qty} ${r.uPlur}`);
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
    renderHistory(); lsSet(LS_DRAFT, { st, currentId });
  }
  await Promise.all([fontsReady(), logoReady]);
  const r = calc(c, s);
  const data = { c, s, r, numero, fecha, tipo };
  const canvas = drawReceipt(data);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (lastResult) URL.revokeObjectURL(lastResult.url);
  const safe = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '');
  const fname = `${tipo}-${safe(r.dogs[0]?.nombre)}-${safe(numero)}.png`.toLowerCase();
  lastResult = { blob, url: URL.createObjectURL(blob), file: new File([blob], fname, { type: 'image/png' }), data };

  $('#previewImg').src = lastResult.url;
  $('#modalTitle').textContent = clientMode ? 'Tu presupuesto' : `${tipo === 'recibo' ? 'Recibo' : 'Presupuesto'} ${numero}`;
  const wa = $('#btnWaSend');
  if (clientMode) {
    wa.lastChild.textContent = 'Mandar al cuidador'; wa.hidden = !c.telefono;
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
const norm = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function renderHistory() {
  const list = lsGet(LS_HIST, []);
  const box = $('#historyList');
  $('.hist-tools').hidden = list.length < 2;
  if (!list.length) { box.innerHTML = '<p class="empty" style="padding:18px 16px">Todavía no hiciste presupuestos. Cuando generes uno, aparece acá.</p>'; $('#histSum').textContent = ''; return; }
  const q = norm($('#histQ').value.trim());
  const rows = list.filter((h) => {
    if (histFiltro !== 'todos' && estadoDe(h) !== histFiltro) return false;
    if (!q) return true;
    return norm([h.numero, h.s.cliente, h.s.telCliente, ...(h.s.dogs || []).map((d) => d.nombre)].join(' ')).includes(q);
  });
  const pend = list.filter((h) => estadoDe(h) === 'enviado').length;
  $('#histSum').textContent = `${list.length} en total${pend ? ` · ${pend} sin confirmar` : ''}${rows.length !== list.length ? ` · mostrando ${rows.length}` : ''}`;
  if (!rows.length) { box.innerHTML = '<p class="empty" style="padding:18px 16px">No hay presupuestos que coincidan con la búsqueda.</p>'; return; }
  box.innerHTML = rows.map((h) => {
    const r = calc(h.c, h.s), e = estadoDe(h);
    return `<div class="hist ${e === 'cancelado' ? 'cancelado' : ''}">
      <div class="info">
        <div class="t"><span class="n">${esc(h.numero)}</span><span class="d">${esc(r.dogs.map((d) => d.nombre).join(', '))}</span></div>
        <div class="s">${esc(h.s.cliente)} · ${esc(h.s.fechaIn ? fmtDate(h.s.fechaIn).slice(0, 5) : h.fecha)} · ${money(Math.min(...r.pagos.map((p) => p.total)))}</div>
        <div class="meta"><label class="sr" for="est-${h.id}">Estado de ${esc(h.numero)}</label>
          <select id="est-${h.id}" class="estado e-${e}" data-hest="${h.id}">${ESTADOS.map(([v, t]) => `<option value="${v}" ${v === e ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="acts">
        <button class="iconbtn" data-hview="${h.id}" aria-label="Ver ${esc(h.numero)}">${icon('eye')}</button>
        <button class="iconbtn" data-hedit="${h.id}" aria-label="Editar ${esc(h.numero)}">${icon('edit')}</button>
        <button class="iconbtn" data-hdup="${h.id}" aria-label="Duplicar ${esc(h.numero)} con fechas nuevas">${icon('copy')}</button>
        <button class="iconbtn del" data-hdel="${h.id}" aria-label="Borrar ${esc(h.numero)}">${icon('trash')}</button>
      </div>
    </div>`;
  }).join('');
}
$('#histQ').addEventListener('input', renderHistory);
$('#histF').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  histFiltro = b.dataset.f; $$('#histF button').forEach((x) => x.classList.toggle('on', x === b)); renderHistory();
});
$('#historyList').addEventListener('change', (e) => {
  const sel = e.target.closest('[data-hest]'); if (!sel) return;
  const list = lsGet(LS_HIST, []), h = list.find((x) => x.id === sel.dataset.hest); if (!h) return;
  h.estado = sel.value; lsSet(LS_HIST, list); renderHistory();
  toast(`${h.numero}: ${ESTADOS.find((x) => x[0] === sel.value)[1].toLowerCase()}.`);
});
$('#historyList').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const list = lsGet(LS_HIST, []);
  const id = b.dataset.hview || b.dataset.hedit || b.dataset.hdel || b.dataset.hdup;
  const h = list.find((x) => x.id === id); if (!h) return;
  if (b.dataset.hview) await generate(h);
  else if (b.dataset.hedit) {
    st = Object.assign(blankState(), clone(h.s)); currentId = h.id; renderForm(); showTab('recibo');
    toast(`Editando ${h.numero}. Al generar se actualiza.`);
  } else if (b.dataset.hdup) {
    st = Object.assign(blankState(), clone(h.s), { fechaIn: '', fechaOut: '', excluidos: [], pagado: '' });
    currentId = null; calView = null; renderForm(); showTab('recibo');
    toast('Copiado con los mismos datos. Elegí las fechas nuevas.');
  } else if (await ask(`¿Borrar ${h.numero}?`, 'Borrar')) {
    lsSet(LS_HIST, list.filter((x) => x.id !== id)); if (currentId === id) currentId = null; renderHistory();
  }
});

/* ======================= LINK PARA CLIENTE ======================= */
function publicCfg() { const c = clone(cfg); delete c.nextNumero; return c; }

$('#btnMakeLink').addEventListener('click', async () => {
  const payload = { v: 1, c: publicCfg() };
  if ($('#linkPrefill').checked) { const p = clone(st); delete p.descExtra; delete p.pagado; payload.s = p; }
  const url = `${location.origin}${location.pathname}#c=${await encodePayload(payload)}`;
  $('#linkText').value = url; $('#linkOut').hidden = false;
  $('#btnWaLink').href = `https://wa.me/?text=${encodeURIComponent(`¡Hola! Completá acá los datos de tu perro y las fechas, y te sale el presupuesto al instante:\n${url}`)}`;
  $('#linkOut').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
$('#btnCopyLink').addEventListener('click', async () => {
  const t = $('#linkText');
  try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
  toast('Link copiado.');
});
$('#btnShareLink').addEventListener('click', async () => {
  const url = $('#linkText').value;
  if (navigator.share) { try { await navigator.share({ title: cfg.negocio, text: 'Completá los datos de tu perro para el presupuesto', url }); } catch { /* cancelado */ } }
  else $('#btnCopyLink').click();
});

/* ======================= AJUSTES ======================= */
function saveCfg() { lsSet(LS_CFG, cfg); lsSet(LS_BASE, DEFAULT_CFG); applyBrand(); checkSetup(); }
function faltantes() {
  const f = [];
  if (!String(cfg.telefono || '').trim()) f.push(['tu WhatsApp', '#c-tel']);
  if (!String(cfg.alias || '').trim() && !String(cfg.cbu || '').trim()) f.push(['el alias o CBU para la seña', '#c-alias']);
  if (!String(cfg.responsable || '').trim()) f.push(['tu nombre', '#c-resp']);
  return f;
}
function checkSetup() {
  const box = $('#setup'); if (!box) return;
  const f = faltantes(), later = lsGet('ic.setupLater', 0);
  box.hidden = clientMode || !f.length || Date.now() - later < 3 * 864e5;
  if (f.length) $('#setupTxt').textContent = `Así tus presupuestos salen completos: ${f.map((x) => x[0]).join(', ').replace(/, ([^,]*)$/, ' y $1')}.`;
}
function applyBrand() {
  const name = cfg.negocio || 'Inquietos Caninos';
  $('#brandName').textContent = name;
  const [first, ...rest] = name.split(/\s+/);
  $('#brandWord').innerHTML = `<b>${esc(first)}</b><i>${esc(rest.join(' '))}</i>`;
  document.title = name;
}
logoReady.then((im) => { if (im) { $('#brandLogo').src = im.src; $('#brandLogo').hidden = false; $('#brandWord').hidden = true; } });
function fillCfgForm() { $$('[data-cfg]').forEach((el) => (el.value = cfg[el.dataset.cfg] ?? '')); }

const EDITORS = {
  servicios: { el: '#edServicios', cols: 'minmax(0,1.2fr) minmax(0,1fr) auto', blank: { nombre: '', precio: 0, unidad: 'dia' }, add: 'Agregar servicio',
    fields: [{ k: 'nombre', l: 'Servicio' }, { k: 'precio', l: 'Precio', t: 'number' }, { k: 'unidad', l: 'Por', t: 'select', o: [['dia', 'día'], ['noche', 'noche']] }] },
  tamanos: { el: '#edTamanos', cols: 'minmax(0,2fr) minmax(0,1fr) auto', blank: { nombre: '', recargo: 0 }, add: 'Agregar tamaño',
    fields: [{ k: 'nombre', l: 'Tamaño' }, { k: 'recargo', l: 'Recargo %', t: 'number' }] },
  extras: { el: '#edExtras', cols: 'minmax(0,1.2fr) minmax(0,1fr) auto', blank: { nombre: '', precio: 0, unidad: 'unico' }, add: 'Agregar extra',
    fields: [{ k: 'nombre', l: 'Extra' }, { k: 'precio', l: 'Precio', t: 'number' }, { k: 'unidad', l: 'Cobro', t: 'select', o: [['unico', 'único'], ['dia', 'por día']] }] },
  pagos: { el: '#edPagos', cols: 'minmax(0,2fr) minmax(0,1fr) auto', blank: { nombre: '', descuento: 0 }, add: 'Agregar forma de pago',
    fields: [{ k: 'nombre', l: 'Forma de pago' }, { k: 'descuento', l: 'Desc. %', t: 'number' }] },
  descEstadia: { el: '#edDescEstadia', cols: 'minmax(0,1fr) minmax(0,1fr) auto', blank: { desde: 0, pct: 0 }, add: 'Agregar escalón',
    fields: [{ k: 'desde', l: 'Desde (días)', t: 'number' }, { k: 'pct', l: 'Desc. %', t: 'number' }] },
};
function renderEditor(key) {
  const E = EDITORS[key], box = $(E.el);
  box.innerHTML = cfg[key].map((item, i) => `
    <div class="ed-row" style="grid-template-columns:${E.cols}">
      ${E.fields.map((f) => { const id = `ed-${key}-${i}-${f.k}`; return `<div class="field"><label for="${id}">${f.l}</label>${f.t === 'select'
        ? `<select id="${id}" data-ed="${key}" data-i="${i}" data-k="${f.k}">${f.o.map(([v, t]) => `<option value="${v}" ${item[f.k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`
        : `<input id="${id}" data-ed="${key}" data-i="${i}" data-k="${f.k}" ${f.t === 'number' ? 'type="number" step="any" inputmode="decimal"' : ''} value="${esc(item[f.k])}">`}</div>`; }).join('')}
      <button type="button" class="iconbtn del" data-edel="${key}" data-i="${i}" aria-label="Quitar">${icon('x')}</button>
    </div>`).join('') + `<button type="button" class="btn btn-sm ed-add" data-eadd="${key}">${icon('plus')}${E.add}</button>`;
}
$('#cfgForm').addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.cfg) {
    cfg[t.dataset.cfg] = t.type === 'number' ? num(t.value) : t.value;
  } else if (t.dataset.ed) {
    const f = EDITORS[t.dataset.ed].fields.find((x) => x.k === t.dataset.k);
    cfg[t.dataset.ed][+t.dataset.i][t.dataset.k] = f.t === 'number' ? num(t.value) : t.value;
  } else return;
  saveCfg(); renderForm();
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
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'guarderia-ajustes.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000); return;
  } else if (b.id === 'btnFactory') {
    if (!(await ask('¿Volver a los precios y textos de fábrica? El historial no se borra.', 'Restaurar'))) return;
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
function initCfgUI() { fillCfgForm(); Object.keys(EDITORS).forEach(renderEditor); }

$('#setupGo').addEventListener('click', () => {
  const f = faltantes(); showTab('ajustes');
  if (f.length) setTimeout(() => { const el = $(f[0][1]); el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); }, 60);
});
$('#setupLater').addEventListener('click', () => { lsSet('ic.setupLater', Date.now()); checkSetup(); });

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
  window.scrollTo(0, 0);
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab); });

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (!clientMode) $('#installBtn').hidden = false; });
$('#installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#installBtn').hidden = true;
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
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
    const sv = location.hash.match(/[#&]s=(\d+)/), pe = location.hash.match(/[#&]p=(\d+)/);
    if (sv && cfg.servicios[+sv[1]]) st.servicio = +sv[1];
    if (pe) for (let i = 1; i < Math.min(+pe[1], 6); i++) st.dogs.push({ nombre: '', raza: '', edad: '', tamano: 0 });
    const ex = location.hash.match(/[#&]e=([\d.]+)/);
    if (ex) ex[1].split('.').forEach((i) => { if (cfg.extras[+i]) st.extras[+i] = ''; });
    document.body.classList.add('client');
    $('#clientIntro').hidden = false;
    $('#btnGenerar').textContent = 'Ver presupuesto';
  } else if (m) {
    try {
      const payload = await decodePayload(m[1]);
      clientMode = true;
      cfg = Object.assign(clone(DEFAULT_CFG), payload.c || {});
      st = Object.assign(blankState(), payload.s || {});
      document.body.classList.add('client');
      $('#clientIntro').hidden = false;
      $('#btnGenerar').textContent = 'Ver presupuesto';
    } catch {
      toast('El link está incompleto. Pedile al cuidador que te lo mande de nuevo.');
    }
  }
  if (!clientMode) {
    const draft = lsGet(LS_DRAFT, null);
    if (draft && draft.st) { st = Object.assign(blankState(), draft.st); currentId = draft.currentId || null; }
    initCfgUI(); renderHistory();
  }
  document.body.classList.add('on-recibo');
  const hoy = new Date();
  $('#todayLbl').textContent = `${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][hoy.getDay()]} ${hoy.getDate()} de ${MESES[hoy.getMonth()]}`;
  $('#adminHead').hidden = clientMode;
  checkSetup();
  applyBrand();
  renderForm();
}
init();
