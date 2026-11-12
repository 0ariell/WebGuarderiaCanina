/* Guardería Canina — recibos y presupuestos (PWA sin servidor) */
'use strict';

/* ======================= CONFIGURACIÓN POR DEFECTO ======================= */
const DEFAULT_CFG = {
  negocio: 'Guardería Canina',
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
    { nombre: 'Guardería diurna', precio: 25000, unidad: 'dia' },
    { nombre: 'Paseo', precio: 8000, unidad: 'dia' },
  ],
  tamanos: [
    { nombre: 'Pequeño', recargo: 0 },
    { nombre: 'Mediano', recargo: 0 },
    { nombre: 'Grande', recargo: 0 },
  ],
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

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']; // index 0 = lunes
const LS_CFG = 'gc.cfg', LS_HIST = 'gc.hist', LS_DRAFT = 'gc.draft';

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
function todayStr() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; }
const wdIndex = (d) => (d.getDay() + 6) % 7; // lunes = 0

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
let cfg = Object.assign(clone(DEFAULT_CFG), lsGet(LS_CFG, {}));
let clientMode = false;
let currentId = null;     // id del historial del recibo en edición
let lastResult = null;    // { blob, url, file, data }

function blankState() {
  return {
    cliente: '', telCliente: '', dirCliente: '',
    dogs: [{ nombre: '', raza: '', edad: '', tamano: 0 }],
    observaciones: '',
    servicio: 0, fechaIn: '', horaIn: cfg.horaIn, fechaOut: '', horaOut: cfg.horaOut,
    dias: [0, 1, 2, 3, 4, 5, 6], cantidad: '',
    extras: {},           // idx -> cantidad (string, '' = automático)
    pago: -1,             // -1 = mostrar todas las formas de pago
    descExtra: '', pagado: '', notas: '',
  };
}
let st = blankState();

/* ======================= CÁLCULO ======================= */
function countQty(c, s) {
  const serv = c.servicios[s.servicio] || c.servicios[0] || { unidad: 'dia' };
  const a = parseDate(s.fechaIn), b = parseDate(s.fechaOut);
  let auto = null;
  if (a && b && b >= a) {
    if (serv.unidad === 'noche') auto = Math.round((b - a) / 864e5);
    else {
      auto = 0;
      for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (s.dias.includes(wdIndex(d))) auto++;
    }
  } else if (a && !b) auto = serv.unidad === 'noche' ? null : (s.dias.includes(wdIndex(a)) ? 1 : 0);
  const manual = String(s.cantidad).trim() !== '';
  return { auto, qty: manual ? Math.max(0, num(s.cantidad)) : (auto ?? 0), manual, unidad: serv.unidad };
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

function renderForm() {
  // servicios
  const selS = $('#selServicio');
  selS.innerHTML = cfg.servicios.map((s, i) => `<option value="${i}">${esc(s.nombre)} — ${money(num(s.precio))} por ${s.unidad === 'noche' ? 'noche' : 'día'}</option>`).join('');
  if (st.servicio >= cfg.servicios.length) st.servicio = 0;
  selS.value = st.servicio;

  // perros
  $('#dogsList').innerHTML = st.dogs.map((d, i) => `
    <div class="dog">
      <div class="dog-head"><span>🐶 Perro ${i + 1}</span>${st.dogs.length > 1 ? `<button type="button" class="icon-btn" data-deldog="${i}" aria-label="Quitar perro">✕</button>` : ''}</div>
      <div class="grid2">
        <label>Nombre *<input data-dog="${i}" data-k="nombre" value="${esc(d.nombre)}" placeholder="Ej: Tilo"></label>
        <label>Raza<input data-dog="${i}" data-k="raza" value="${esc(d.raza)}" placeholder="Ej: Mestizo"></label>
        <label>Edad<input data-dog="${i}" data-k="edad" value="${esc(d.edad)}" placeholder="Ej: 3 años"></label>
        <label>Tamaño<select data-dog="${i}" data-k="tamano">${cfg.tamanos.map((t, j) => `<option value="${j}" ${+d.tamano === j ? 'selected' : ''}>${esc(t.nombre)}${num(t.recargo) ? ` (+${pctTxt(t.recargo)})` : ''}</option>`).join('')}</select></label>
      </div>
    </div>`).join('');

  // días de la semana
  $('#weekdays').innerHTML = WEEKDAYS.map((w, i) => `<button type="button" class="chip ${st.dias.includes(i) ? 'on' : ''}" data-wd="${i}">${w}</button>`).join('');

  // extras
  $('#extrasList').innerHTML = cfg.extras.map((e, i) => `
    <label class="extra">
      <input type="checkbox" data-extra="${i}" ${i in st.extras ? 'checked' : ''}>
      <span class="name">${esc(e.nombre)}<span class="price">${money(num(e.precio))} ${e.unidad === 'dia' ? 'por día' : 'único'}</span></span>
      <input type="number" min="0" step="1" inputmode="numeric" data-extraq="${i}" placeholder="auto" value="${esc(st.extras[i] ?? '')}" ${i in st.extras ? '' : 'disabled'} aria-label="Cantidad">
    </label>`).join('');
  $('#noExtras').hidden = cfg.extras.length > 0;

  // pagos
  const opts = [{ i: -1, n: 'Todas' }, ...cfg.pagos.map((p, i) => ({ i, n: p.nombre + (num(p.descuento) ? ` (${num(p.descuento) > 0 ? '-' : '+'}${pctTxt(Math.abs(num(p.descuento)))})` : '') }))];
  if (st.pago >= cfg.pagos.length) st.pago = -1;
  $('#pagos').innerHTML = opts.map((o) => `<button type="button" class="chip ${st.pago === o.i ? 'on' : ''}" data-pago="${o.i}">${esc(o.n)}</button>`).join('');

  // campos simples
  for (const el of form.elements) if (el.name && el.name in st && typeof st[el.name] !== 'object') el.value = st[el.name];

  $('#adminPayFields').hidden = clientMode;
  updateSummary();
}

function updateSummary() {
  const q = countQty(cfg, st);
  $('#qtyLabel').textContent = q.unidad === 'noche' ? 'Cantidad de noches' : 'Cantidad de días';
  $('#weekdaysWrap').hidden = q.unidad === 'noche';
  $('#autoQty').textContent = q.auto != null ? `Automático: ${q.auto} ${q.unidad === 'noche' ? 'noche(s)' : 'día(s)'}${q.manual ? ' (usás el manual)' : ''}` : 'Cargá las fechas o la cantidad';

  const r = calc(cfg, st);
  let h = '<h2>Resumen</h2>';
  r.dogs.forEach((d) => (h += `<div class="row"><span>${esc(d.nombre)} <span class="muted small">${esc(d.detalle)}</span></span><span>${money(d.importe)}</span></div>`));
  r.extras.forEach((e) => (h += `<div class="row"><span>${esc(e.nombre)} <span class="muted small">${esc(e.detalle)}</span></span><span>${money(e.importe)}</span></div>`));
  h += `<div class="row sub"><span>Subtotal</span><span>${money(r.subtotal)}</span></div>`;
  r.descuentos.forEach((d) => (h += `<div class="row disc"><span>${esc(d.nombre)}</span><span>-${money(d.importe)}</span></div>`));
  r.pagos.forEach((p) => (h += `<div class="row total"><span>Total ${esc(p.nombre.toLowerCase())}</span><span class="v">${money(p.total)}</span></div>`));
  if (r.pagado) h += `<div class="row sub"><span>Abonado</span><span>${money(r.pagado)}</span></div>`;
  else if (r.seniaPct) h += `<div class="row sub"><span>Reserva (${pctTxt(r.seniaPct)})</span><span>${money(r.senia)}</span></div>`;
  $('#summary').innerHTML = h;
  if (!clientMode) lsSet(LS_DRAFT, { st, currentId });
}

form.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.dog != null) {
    const d = st.dogs[+t.dataset.dog]; d[t.dataset.k] = t.dataset.k === 'tamano' ? +t.value : t.value;
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

form.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.wd != null) {
    const i = +b.dataset.wd;
    st.dias = st.dias.includes(i) ? st.dias.filter((x) => x !== i) : [...st.dias, i].sort();
    b.classList.toggle('on'); updateSummary();
  } else if (b.dataset.pago != null) {
    st.pago = +b.dataset.pago;
    $$('#pagos .chip').forEach((c) => c.classList.toggle('on', c === b)); updateSummary();
  } else if (b.dataset.deldog != null) {
    st.dogs.splice(+b.dataset.deldog, 1); renderForm();
  } else if (b.id === 'btnAddDog') {
    st.dogs.push({ nombre: '', raza: '', edad: '', tamano: 0 }); renderForm();
    $$('#dogsList .dog').pop().querySelector('input').focus();
  }
});

$('#btnReset').addEventListener('click', () => {
  if (!confirm('¿Limpiar el formulario?')) return;
  st = blankState(); currentId = null; renderForm(); window.scrollTo(0, 0);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!st.cliente.trim()) return focusErr('cliente', 'Falta el nombre del dueño/a');
  if (!st.dogs.some((d) => d.nombre.trim())) return focusErr(null, 'Falta el nombre del perro', '[data-dog="0"][data-k="nombre"]');
  if (!countQty(cfg, st).qty) return focusErr('fechaIn', 'Cargá las fechas o la cantidad de días');
  await generate();
});
function focusErr(name, msg, sel) {
  toast(msg); const el = sel ? $(sel) : form.elements[name];
  if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => el.focus(), 300); }
}

/* ======================= RECIBO (CANVAS → PNG) ======================= */
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const C = { text: '#1d1b26', muted: '#6b6878', line: '#e8e6ee', card: '#eeeef4', green: '#1f8a4c', greenSoft: '#e6f4ea', primary: '#7c4dff' };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrap(ctx, text, maxW) {
  const out = [];
  String(text ?? '').split('\n').forEach((para) => {
    const words = para.split(/\s+/).filter(Boolean); let line = '';
    if (!words.length) { out.push(''); return; }
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    }
    out.push(line);
  });
  return out;
}

function drawReceipt(data) {
  const { c, s, r, numero, fecha, tipo } = data;
  const W = 1080, P = 72, CW = W - P * 2;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = 6000;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, canvas.height);
  ctx.textBaseline = 'alphabetic';
  const font = (w, px) => (ctx.font = `${w} ${px}px ${FONT}`);
  let y = 0;

  // Encabezado
  const headH = 230;
  const grad = ctx.createLinearGradient(0, 0, W, headH);
  grad.addColorStop(0, '#7c4dff'); grad.addColorStop(1, '#a378ff');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, headH);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(P + 40, 115, 50, 0, Math.PI * 2); ctx.fill();
  font('400', 54); ctx.textAlign = 'center'; ctx.fillText('🐾', P + 40, 134); ctx.textAlign = 'left';
  ctx.fillStyle = '#fff'; font('800', 52);
  const bn = wrap(ctx, c.negocio || 'Guardería Canina', CW - 330)[0];
  ctx.fillText(bn, P + 110, 118);
  font('500', 30); ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.fillText(tipo === 'presupuesto' ? 'Presupuesto' : 'Recibo / Presupuesto', P + 110, 162);
  ctx.textAlign = 'right'; font('700', 32); ctx.fillStyle = '#fff';
  ctx.fillText(numero, W - P, 112);
  font('500', 28); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillText(fecha, W - P, 156);
  ctx.textAlign = 'left';
  y = headH + 30;

  // Filas etiqueta / valor
  const row = (label, value, opts = {}) => {
    if (value == null || value === '') return;
    font('400', 34); const lw = Math.max(ctx.measureText(label).width + 30, 240);
    font(opts.bold === false ? '500' : '700', 36);
    const lines = wrap(ctx, value, CW - lw);
    const h = 40 + lines.length * 46 + 20;
    font('400', 34); ctx.fillStyle = C.muted; ctx.fillText(label, P, y + 62);
    font(opts.bold === false ? '500' : '700', 36); ctx.fillStyle = C.text; ctx.textAlign = 'right';
    lines.forEach((ln, i) => ctx.fillText(ln, W - P, y + 64 + i * 46));
    ctx.textAlign = 'left';
    y += h;
    ctx.fillStyle = C.line; ctx.fillRect(P, y, CW, 2);
  };

  row('Cliente', s.cliente);
  row('Teléfono', s.telCliente, { bold: false });
  if (s.dirCliente) row('Dirección', s.dirCliente, { bold: false });
  row('Servicio', r.serv.nombre);
  const dIn = fmtDate(s.fechaIn), dOut = fmtDate(s.fechaOut);
  row(r.unidad === 'noche' || dOut ? 'Estadía' : 'Fecha', dIn && dOut ? `${dIn} → ${dOut}` : dIn || dOut);
  if (s.horaIn || s.horaOut) row('Horario', `${s.horaIn || '--:--'} – ${s.horaOut || '--:--'}`);
  if (r.unidad !== 'noche' && s.dias.length < 7) row('Días', s.dias.map((i) => WEEKDAYS[i]).join(', '), { bold: false });
  row(r.unidad === 'noche' ? 'Cantidad de noches' : 'Cantidad de días', String(r.qty));
  y += 40;

  // Tarjetas por perro / extras
  const card = (title, sub, extra, amount, upper) => {
    font('700', 38); const tl = wrap(ctx, upper ? title.toUpperCase() : title, CW - 300);
    const subLines = [sub, extra].filter(Boolean);
    const h = 44 + tl.length * 46 + subLines.length * 42 + 38;
    ctx.fillStyle = C.card; rr(ctx, P, y, CW, h, 34); ctx.fill();
    ctx.fillStyle = C.text; tl.forEach((ln, i) => ctx.fillText(ln, P + 46, y + 84 + i * 46));
    let yy = y + 84 + (tl.length - 1) * 46;
    font('400', 32); ctx.fillStyle = C.muted;
    subLines.forEach((ln) => { yy += 44; ctx.fillText(ln, P + 46, yy); });
    font('700', 38); ctx.fillStyle = C.text; ctx.textAlign = 'right'; ctx.fillText(money(amount), W - P - 46, y + 84); ctx.textAlign = 'left';
    y += h + 22;
  };
  r.dogs.forEach((d, i) => {
    const dg = s.dogs[i] || {};
    const tam = c.tamanos.some((t) => num(t.recargo)) ? (c.tamanos[dg.tamano] || {}).nombre : '';
    const info = [dg.raza, dg.edad, tam].filter(Boolean).join(' · ');
    card(d.nombre, d.detalle, [info, d.notas].filter(Boolean).join(' · '), d.importe, true);
  });
  r.extras.forEach((e) => card(e.nombre, e.detalle, '', e.importe, false));
  y += 18;

  // Subtotal y descuentos
  const line2 = (label, value, color, weight = '500', px = 36) => {
    font('400', px); ctx.fillStyle = color || C.muted;
    const lines = wrap(ctx, label, CW - 280);
    lines.forEach((ln, i) => ctx.fillText(ln, P + 6, y + 50 + i * 44));
    font(weight, px); ctx.fillStyle = color || C.text; ctx.textAlign = 'right'; ctx.fillText(value, W - P - 6, y + 50); ctx.textAlign = 'left';
    y += 40 + lines.length * 44;
  };
  line2('Subtotal', money(r.subtotal), null, '700');
  r.descuentos.forEach((d) => line2(d.nombre, '-' + money(d.importe), C.green, '700'));
  y += 14; ctx.fillStyle = C.line; ctx.fillRect(P, y, CW, 2); y += 18;

  // Totales por forma de pago
  const base = r.pagos.reduce((m, p) => Math.min(m, p.pct), Infinity);
  r.pagos.forEach((p) => {
    const label = p.nombre ? `Total ${p.nombre.toLowerCase()}` : 'Total';
    font('800', 44); ctx.fillStyle = C.text; ctx.fillText(label, P + 6, y + 70);
    const lw = ctx.measureText(label).width;
    const diff = p.pct - (r.pagos.length > 1 ? base : 0);
    if (diff) {
      font('500', 30); ctx.fillStyle = C.muted;
      const t = diff > 0 ? ` (${pctTxt(diff)} menos)` : ` (${pctTxt(-diff)} más)`;
      if (lw + ctx.measureText(t).width < CW - 330) ctx.fillText(t, P + 6 + lw, y + 70);
    }
    font('800', 60); ctx.fillStyle = C.green; ctx.textAlign = 'right'; ctx.fillText(money(p.total), W - P - 6, y + 74); ctx.textAlign = 'left';
    y += 108;
  });
  y += 20;

  // Recuadro reserva / seña
  const box = (title, big, sub) => {
    font('400', 32); const subLines = sub ? wrap(ctx, sub, CW - 92) : [];
    const h = 64 + 66 + subLines.length * 42 + 44;
    ctx.fillStyle = C.greenSoft; rr(ctx, P, y, CW, h, 34); ctx.fill();
    font('700', 30); ctx.fillStyle = C.green;
    ctx.save(); if ('letterSpacing' in ctx) ctx.letterSpacing = '2px'; ctx.fillText(title.toUpperCase(), P + 46, y + 70); ctx.restore();
    font('800', 46); ctx.fillStyle = C.text; ctx.fillText(big, P + 46, y + 132);
    font('400', 32); ctx.fillStyle = C.muted; subLines.forEach((ln, i) => ctx.fillText(ln, P + 46, y + 182 + i * 42));
    y += h + 30;
  };
  if (r.pagado > 0) {
    const saldos = r.pagos.map((p) => `${p.nombre ? p.nombre + ': ' : ''}${money(Math.max(0, p.total - r.pagado))}`).join('  ·  ');
    box('Seña abonada', money(r.pagado), `Saldo a pagar — ${saldos}`);
  } else if (r.seniaPct > 0) {
    box(`Reserva para confirmar (${pctTxt(r.seniaPct)})`, money(r.senia), 'El resto se cancela al ingreso');
  }

  // Datos bancarios
  const bank = [['Alias', c.alias], ['CBU/CVU', c.cbu], ['Titular', c.titular], ['Banco', c.banco]].filter((x) => x[1]);
  if (bank.length) {
    const h = 86 + bank.length * 50 + 24;
    ctx.strokeStyle = C.line; ctx.lineWidth = 3; rr(ctx, P, y, CW, h, 34); ctx.stroke();
    font('700', 30); ctx.fillStyle = C.primary; ctx.fillText('DATOS PARA TRANSFERENCIA', P + 46, y + 66);
    bank.forEach(([k, v], i) => {
      font('400', 32); ctx.fillStyle = C.muted; ctx.fillText(k, P + 46, y + 120 + i * 50);
      font('700', 32); ctx.fillStyle = C.text; ctx.textAlign = 'right'; ctx.fillText(v, W - P - 46, y + 120 + i * 50); ctx.textAlign = 'left';
    });
    y += h + 30;
  }

  // Observaciones y notas
  const para = (title, text) => {
    if (!String(text || '').trim()) return;
    font('700', 30); ctx.fillStyle = C.muted; ctx.fillText(title.toUpperCase(), P, y + 40);
    font('400', 32); ctx.fillStyle = C.text;
    const lines = wrap(ctx, text, CW); lines.forEach((ln, i) => ctx.fillText(ln, P, y + 88 + i * 44));
    y += 88 + lines.length * 44 + 10;
  };
  para('Observaciones', s.observaciones);
  para('Notas', s.notas);

  // Condiciones con ✔
  const conds = String(c.condiciones || '').split('\n').map((x) => x.trim()).filter(Boolean);
  if (conds.length) {
    ctx.fillStyle = C.line; ctx.fillRect(P, y + 10, CW, 2); y += 40;
    conds.forEach((cond) => {
      font('400', 34); const lines = wrap(ctx, cond, CW - 70);
      ctx.strokeStyle = C.text; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(P + 2, y + 36); ctx.lineTo(P + 13, y + 50); ctx.lineTo(P + 36, y + 20); ctx.stroke();
      ctx.fillStyle = C.text; lines.forEach((ln, i) => ctx.fillText(ln, P + 70, y + 48 + i * 50));
      y += lines.length * 50 + 30;
    });
  }

  // Pie
  y += 20;
  const foot = [c.responsable, c.telefono && `WhatsApp ${c.telefono}`, c.redes, c.direccion].filter(Boolean).join('  ·  ');
  if (num(c.validez) > 0 && tipo === 'presupuesto') {
    font('500', 28); ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText(`Presupuesto válido por ${num(c.validez)} días`, W / 2, y + 30); ctx.textAlign = 'left'; y += 50;
  }
  if (foot) {
    font('500', 28); ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    wrap(ctx, foot, CW).forEach((ln, i) => ctx.fillText(ln, W / 2, y + 30 + i * 40)); ctx.textAlign = 'left';
    y += 30 + wrap(ctx, foot, CW).length * 40;
  }
  font('600', 30); ctx.fillStyle = C.primary; ctx.textAlign = 'center'; ctx.fillText('¡Gracias por confiarnos a tu cuatro patas! 🐶', W / 2, y + 40); ctx.textAlign = 'left';
  y += 90;

  // Recorte a la altura usada
  const out = document.createElement('canvas'); out.width = W; out.height = Math.ceil(y);
  out.getContext('2d').drawImage(canvas, 0, 0);
  return out;
}

function summaryText(data) {
  const { c, s, r, numero } = data;
  const L = [];
  L.push(`🐾 *${c.negocio}* — ${numero}`);
  L.push(`👤 ${s.cliente}${s.telCliente ? ' (' + s.telCliente + ')' : ''}`);
  L.push(`🐶 ${r.dogs.map((d) => d.nombre).join(', ')}`);
  L.push(`📋 ${r.serv.nombre}`);
  if (s.fechaIn || s.fechaOut) L.push(`📅 ${[fmtDate(s.fechaIn), fmtDate(s.fechaOut)].filter(Boolean).join(' → ')}`);
  if (s.horaIn || s.horaOut) L.push(`🕘 ${s.horaIn} – ${s.horaOut}`);
  L.push(`🔢 ${r.qty} ${r.uPlur}`);
  r.extras.forEach((e) => L.push(`➕ ${e.nombre}: ${money(e.importe)}`));
  r.descuentos.forEach((d) => L.push(`🎁 ${d.nombre}: -${money(d.importe)}`));
  r.pagos.forEach((p) => L.push(`💰 Total${p.nombre ? ' ' + p.nombre.toLowerCase() : ''}: *${money(p.total)}*`));
  if (r.pagado) L.push(`✅ Seña abonada: ${money(r.pagado)}`);
  else if (r.seniaPct) L.push(`📌 Reserva (${pctTxt(r.seniaPct)}): ${money(r.senia)}`);
  if (s.observaciones) L.push(`📝 ${s.observaciones}`);
  return L.join('\n');
}

async function generate(fromHistory) {
  let numero, fecha, c = cfg, s = st;
  const tipo = clientMode ? 'presupuesto' : 'recibo';
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
    const entry = { id: currentId, numero, fecha, ts: Date.now(), c: clone(cfg), s: clone(st) };
    const list = [entry, ...hist.filter((h) => h.id !== currentId)].slice(0, 100);
    lsSet(LS_HIST, list); renderHistory(); lsSet(LS_DRAFT, { st, currentId });
  }
  const r = calc(c, s);
  const data = { c, s, r, numero, fecha, tipo };
  const canvas = drawReceipt(data);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (lastResult) URL.revokeObjectURL(lastResult.url);
  const safe = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '');
  const fname = `${tipo}-${safe(r.dogs[0]?.nombre)}-${safe(numero)}.png`.toLowerCase();
  lastResult = { blob, url: URL.createObjectURL(blob), file: new File([blob], fname, { type: 'image/png' }), data };

  $('#previewImg').src = lastResult.url;
  $('#modalTitle').textContent = clientMode ? 'Tu presupuesto 🐶' : `Recibo ${numero}`;
  const wa = $('#btnWaSend');
  if (clientMode) {
    wa.textContent = '💬 Enviar al cuidador'; wa.hidden = !c.telefono;
    wa.href = waLink(c.telefono, `¡Hola! Quiero reservar 🐾\n\n${summaryText(data)}`);
  } else {
    wa.textContent = s.telCliente ? '💬 WhatsApp al cliente' : '💬 WhatsApp'; wa.hidden = false;
    wa.href = s.telCliente ? waLink(s.telCliente, summaryText(data)) : `https://wa.me/?text=${encodeURIComponent(summaryText(data))}`;
  }
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function download() {
  if (!lastResult) return;
  const a = document.createElement('a'); a.href = lastResult.url; a.download = lastResult.file.name;
  document.body.appendChild(a); a.click(); a.remove();
  toast('Imagen descargada ✅');
}
async function shareImg() {
  if (!lastResult) return;
  const f = lastResult.file;
  if (navigator.canShare && navigator.canShare({ files: [f] })) {
    try { await navigator.share({ files: [f], title: f.name }); } catch (e) { if (e.name !== 'AbortError') download(); }
  } else { download(); toast('Tu navegador no permite compartir imágenes: se descargó.'); }
}
$('#btnDownload').addEventListener('click', download);
$('#btnShareImg').addEventListener('click', shareImg);
$('#btnClose').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
function closeModal() { $('#modal').hidden = true; document.body.style.overflow = ''; }

/* ======================= HISTORIAL ======================= */
function renderHistory() {
  const list = lsGet(LS_HIST, []);
  const box = $('#historyList');
  if (!list.length) { box.innerHTML = '<p class="muted">Todavía no generaste recibos.</p>'; return; }
  box.innerHTML = list.map((h) => {
    const r = calc(h.c, h.s);
    const dogs = r.dogs.map((d) => d.nombre).join(', ');
    return `<div class="hist">
      <div class="info"><b>${esc(h.numero)} · ${esc(dogs)}</b><span>${esc(h.s.cliente)} · ${esc(h.fecha)} · ${money(r.pagos[0].total)}</span></div>
      <button class="btn small" data-hview="${h.id}" aria-label="Ver">👁️</button>
      <button class="btn small" data-hedit="${h.id}" aria-label="Editar">✏️</button>
      <button class="btn small danger" data-hdel="${h.id}" aria-label="Borrar">🗑️</button>
    </div>`;
  }).join('');
}
$('#historyList').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const list = lsGet(LS_HIST, []);
  const id = b.dataset.hview || b.dataset.hedit || b.dataset.hdel;
  const h = list.find((x) => x.id === id); if (!h) return;
  if (b.dataset.hview) await generate(h);
  else if (b.dataset.hedit) {
    st = Object.assign(blankState(), clone(h.s)); currentId = h.id; renderForm(); showTab('recibo');
    toast(`Editando ${h.numero}`);
  } else if (confirm(`¿Borrar ${h.numero}?`)) {
    lsSet(LS_HIST, list.filter((x) => x.id !== id)); if (currentId === id) currentId = null; renderHistory();
  }
});

/* ======================= LINK PARA CLIENTE ======================= */
function publicCfg() { const c = clone(cfg); delete c.nextNumero; return c; }

$('#btnMakeLink').addEventListener('click', async () => {
  const payload = { v: 1, c: publicCfg() };
  if ($('#linkPrefill').checked) {
    const p = clone(st); delete p.descExtra; delete p.pagado; payload.s = p;
  }
  const url = `${location.origin}${location.pathname}#c=${await encodePayload(payload)}`;
  $('#linkText').value = url; $('#linkOut').hidden = false;
  $('#btnWaLink').href = `https://wa.me/?text=${encodeURIComponent(`¡Hola! 🐾 Completá los datos de tu perro y la estadía acá y te sale el presupuesto al instante:\n${url}`)}`;
});
$('#btnCopyLink').addEventListener('click', async () => {
  const t = $('#linkText');
  try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
  toast('Link copiado 📋');
});
$('#btnShareLink').addEventListener('click', async () => {
  const url = $('#linkText').value;
  if (navigator.share) { try { await navigator.share({ title: cfg.negocio, text: 'Completá los datos de tu perro 🐾', url }); } catch { /* cancelado */ } }
  else $('#btnCopyLink').click();
});

/* ======================= AJUSTES ======================= */
function saveCfg() { lsSet(LS_CFG, cfg); applyBrand(); }
function applyBrand() {
  $('#brandName').textContent = cfg.negocio || 'Guardería Canina';
  $('#brandSub').textContent = clientMode ? 'Presupuesto online' : (cfg.responsable || 'Recibos y presupuestos');
  document.title = `${cfg.negocio || 'Guardería Canina'}${clientMode ? ' · Presupuesto' : ' · Recibos'}`;
}

function fillCfgForm() { $$('[data-cfg]').forEach((el) => (el.value = cfg[el.dataset.cfg] ?? '')); }
$('#cfgForm').addEventListener('input', (e) => {
  const k = e.target.dataset.cfg; if (!k) return;
  cfg[k] = e.target.type === 'number' ? num(e.target.value) : e.target.value;
  saveCfg(); renderForm();
});

const EDITORS = {
  servicios: { el: '#edServicios', cols: '2fr 1.3fr 1fr auto', blank: { nombre: '', precio: 0, unidad: 'dia' },
    fields: [{ k: 'nombre', l: 'Nombre' }, { k: 'precio', l: 'Precio $', t: 'number' }, { k: 'unidad', l: 'Unidad', t: 'select', o: [['dia', 'día'], ['noche', 'noche']] }] },
  tamanos: { el: '#edTamanos', cols: '2fr 1fr auto', blank: { nombre: '', recargo: 0 },
    fields: [{ k: 'nombre', l: 'Tamaño' }, { k: 'recargo', l: 'Recargo %', t: 'number' }] },
  extras: { el: '#edExtras', cols: '2fr 1.3fr 1fr auto', blank: { nombre: '', precio: 0, unidad: 'unico' },
    fields: [{ k: 'nombre', l: 'Extra' }, { k: 'precio', l: 'Precio $', t: 'number' }, { k: 'unidad', l: 'Unidad', t: 'select', o: [['unico', 'único'], ['dia', 'día']] }] },
  pagos: { el: '#edPagos', cols: '2fr 1fr auto', blank: { nombre: '', descuento: 0 },
    fields: [{ k: 'nombre', l: 'Forma de pago' }, { k: 'descuento', l: 'Desc. %', t: 'number' }] },
  descEstadia: { el: '#edDescEstadia', cols: '1fr 1fr auto', blank: { desde: 0, pct: 0 },
    fields: [{ k: 'desde', l: 'Desde (días)', t: 'number' }, { k: 'pct', l: 'Desc. %', t: 'number' }] },
};
function renderEditor(key) {
  const E = EDITORS[key], box = $(E.el);
  box.innerHTML = cfg[key].map((item, i) => `
    <div class="ed-row" style="grid-template-columns:${E.cols}">
      ${E.fields.map((f) => `<label>${f.l}${f.t === 'select'
        ? `<select data-ed="${key}" data-i="${i}" data-k="${f.k}">${f.o.map(([v, t]) => `<option value="${v}" ${item[f.k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`
        : `<input data-ed="${key}" data-i="${i}" data-k="${f.k}" ${f.t === 'number' ? 'type="number" step="any" inputmode="decimal"' : ''} value="${esc(item[f.k])}">`}</label>`).join('')}
      <button type="button" class="icon-btn" data-edel="${key}" data-i="${i}" aria-label="Quitar">✕</button>
    </div>`).join('') + `<button type="button" class="btn ghost small ed-add" data-eadd="${key}">➕ Agregar</button>`;
}
$('#cfgForm').addEventListener('input', (e) => {
  const t = e.target; if (!t.dataset.ed) return;
  const f = EDITORS[t.dataset.ed].fields.find((x) => x.k === t.dataset.k);
  cfg[t.dataset.ed][+t.dataset.i][t.dataset.k] = f.t === 'number' ? num(t.value) : t.value;
  saveCfg(); renderForm();
});
$('#cfgForm').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.eadd) { cfg[b.dataset.eadd].push(clone(EDITORS[b.dataset.eadd].blank)); renderEditor(b.dataset.eadd); }
  else if (b.dataset.edel) {
    const k = b.dataset.edel, i = +b.dataset.i;
    cfg[k].splice(i, 1);
    if (k === 'extras') { const ne = {}; Object.entries(st.extras).forEach(([j, v]) => { if (+j < i) ne[j] = v; else if (+j > i) ne[+j - 1] = v; }); st.extras = ne; }
    renderEditor(k);
  } else return;
  saveCfg(); renderForm();
});

$('#btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'guarderia-ajustes.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('#fileImport').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { cfg = Object.assign(clone(DEFAULT_CFG), JSON.parse(await f.text())); saveCfg(); initCfgUI(); renderForm(); toast('Ajustes importados ✅'); }
  catch { toast('Archivo inválido'); }
  e.target.value = '';
});
$('#btnFactory').addEventListener('click', () => {
  if (!confirm('¿Restaurar todos los precios y textos de fábrica? (el historial no se borra)')) return;
  const n = cfg.nextNumero; cfg = clone(DEFAULT_CFG); cfg.nextNumero = n; saveCfg(); initCfgUI(); renderForm();
});
function initCfgUI() { fillCfgForm(); Object.keys(EDITORS).forEach(renderEditor); }

/* ======================= PESTAÑAS / PWA ======================= */
function showTab(name) {
  $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
  window.scrollTo(0, 0);
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab); });

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; $('#installBtn').hidden = false; });
$('#installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#installBtn').hidden = true;
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* ======================= INICIO ======================= */
async function init() {
  const m = location.hash.match(/[#&]c=([^&]+)/);
  if (m) {
    try {
      const payload = await decodePayload(m[1]);
      clientMode = true;
      cfg = Object.assign(clone(DEFAULT_CFG), payload.c || {});
      st = Object.assign(blankState(), payload.s || {});
      document.body.classList.add('client');
      $('#clientIntro').hidden = false;
      $('#btnGenerar').textContent = '🧾 Ver mi presupuesto';
    } catch (e) {
      toast('El link está incompleto o dañado');
    }
  }
  if (!clientMode) {
    const draft = lsGet(LS_DRAFT, null);
    if (draft && draft.st) { st = Object.assign(blankState(), draft.st); currentId = draft.currentId || null; }
    initCfgUI(); renderHistory();
  }
  applyBrand();
  renderForm();
}
init();
