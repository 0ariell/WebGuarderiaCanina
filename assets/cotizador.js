/*
 * Inquietos Caninos · motor de cotización
 * Lo usan la página web (calculadora) y la app (presupuestos y recibos), así los dos calculan igual.
 * Expone window.Cotizador.
 */
(function (root) {
  'use strict';

  const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { if (!s) return null; const [y, m, d] = String(s).split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };
  const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  const money = (n) => (n < 0 ? '-$' : '$') + nf.format(Math.abs(Math.round(n)));
  const pct = (p) => String(+(+p).toFixed(2)).replace('.', ',') + '%';
  const clone = (o) => JSON.parse(JSON.stringify(o ?? null));

  /* plural en castellano para las etiquetas de unidad (día → días, clase → clases, sesión → sesiones) */
  function plural(s) {
    s = String(s || '').trim(); if (!s) return '';
    if (/[aeiouáéó]$/i.test(s)) return s + 's';
    if (/z$/i.test(s)) return s.slice(0, -1) + 'ces';
    if (/ón$/i.test(s)) return s.slice(0, -2) + 'ones';
    return s + 'es';
  }

  /* ---------- normalización (acepta configuraciones viejas) ---------- */
  function servicio(raw, i) {
    const s = Object.assign({}, raw || {});
    if (!['dia', 'noche', 'cantidad'].includes(s.cobro)) s.cobro = s.unidad === 'noche' ? 'noche' : 'dia';
    if (!s.unidad || s.unidad === 'dia' || s.unidad === 'noche') s.unidad = s.cobro === 'noche' ? 'noche' : s.cobro === 'cantidad' ? 'unidad' : 'día';
    if (!s.unidadPlural) s.unidadPlural = plural(s.unidad);
    s.nombre = String(s.nombre || `Servicio ${(i || 0) + 1}`);
    s.categoria = String(s.categoria || 'Servicios');
    s.precio = num(s.precio);
    s.cantidadMin = Math.max(1, Math.round(num(s.cantidadMin)) || 1);
    s.cantidadMax = Math.max(s.cantidadMin, Math.round(num(s.cantidadMax)) || (s.cobro === 'cantidad' ? 20 : 60));
    s.cantidadDefecto = clamp(Math.round(num(s.cantidadDefecto)) || (s.cobro === 'cantidad' ? 1 : 5), s.cantidadMin, s.cantidadMax);
    s.porPerro = s.porPerro !== false;
    s.ocupaCupo = s.ocupaCupo === undefined ? s.cobro !== 'cantidad' : !!s.ocupaCupo;
    s.adaptacion = s.adaptacion === undefined ? s.cobro !== 'cantidad' : !!s.adaptacion;
    s.web = s.web !== false;
    s.destacado = !!s.destacado;
    s.recargoFinde = num(s.recargoFinde);
    s.descCantidad = Array.isArray(s.descCantidad) ? s.descCantidad.filter((t) => num(t.desde) > 0 && num(t.pct)) : null;
    s.incluye = Array.isArray(s.incluye) ? s.incluye.filter(Boolean) : String(s.incluye || '').split('\n').map((x) => x.trim()).filter(Boolean);
    return s;
  }
  const COBRO_EXTRA = { unico: 'una vez', dia: 'por día', perro: 'por perro', perroDia: 'por perro y por día' };
  function extra(raw) {
    const x = Object.assign({}, raw || {});
    if (!COBRO_EXTRA[x.cobro]) x.cobro = x.unidad === 'dia' ? 'dia' : 'unico';
    x.precio = num(x.precio); x.web = x.web !== false;
    return x;
  }
  function config(c) {
    c = c || {};
    const out = Object.assign({}, c);
    out.servicios = (c.servicios || []).map(servicio);
    out.extras = (c.extras || []).map(extra);
    out.pagos = (c.pagos || []).filter((p) => p && p.nombre !== undefined);
    out.tamanos = c.tamanos || [];
    out.descEstadia = (c.descEstadia || []).filter((t) => num(t.desde) > 0 && num(t.pct));
    const a = c.adaptacion || {};
    out.adaptacion = {
      activa: a.activa !== false && c.adaptacion !== false,
      nombre: a.nombre || 'Visita de adaptación',
      pct: a.pct === undefined ? 50 : num(a.pct),
      fijo: num(a.fijo),
      porPerro: a.porPerro !== false,
      validezDias: a.validezDias === undefined ? 30 : num(a.validezDias),
      texto: a.texto || '',
    };
    out.fechasEspeciales = (c.fechasEspeciales || []).filter((f) => f && f.desde && num(f.recargo));
    out.redondeo = Math.max(0, num(c.redondeo));
    const cu = c.cupos || {};
    out.cupos = { activo: cu.activo !== false && !!c.cupos, capacidad: Math.max(1, Math.round(num(cu.capacidad)) || 4), avisoQuedan: num(cu.avisoQuedan) || 2 };
    out.seniaPct = num(c.seniaPct); out.descPerroAdicional = num(c.descPerroAdicional);
    Object.defineProperty(out, '__norm', { value: true });
    return out;
  }

  /* ---------- fechas especiales (acepta 'MM-DD' para que se repitan todos los años) ---------- */
  function especial(cfg, k) {
    let best = null;
    (cfg.fechasEspeciales || []).forEach((f) => {
      const recurrente = String(f.desde).length === 5;
      const v = recurrente ? k.slice(5) : k;
      const d = String(f.desde), h = String(f.hasta || f.desde);
      const dentro = d <= h ? v >= d && v <= h : v >= d || v <= h;   // un rango 12-31 → 01-01 cruza el año
      if (dentro && (!best || num(f.recargo) > best.pct)) best = { nombre: f.nombre || 'Fecha especial', pct: num(f.recargo) };
    });
    return best;
  }

  function diasDe(s, p) {
    const a = parse(p.fechaIn); if (!a) return null;
    const b = parse(p.fechaOut) || a; if (b < a) return [];
    const exc = p.excluidos || [], out = [];
    if (s.cobro === 'noche') { for (const d = new Date(a); d < b; d.setDate(d.getDate() + 1)) out.push(iso(d)); }
    else for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) { const k = iso(d); if (!exc.includes(k)) out.push(k); }
    return out;
  }

  function redondear(v, r) { return r > 0 ? Math.round(v / r) * r : Math.round(v); }

  /*
   * pedido: { servicio, fechaIn, fechaOut, excluidos, cantidad, perros:[{nombre, tamano}],
   *           extras:{indice: cantidad|''}, primeraVez, pago, descExtra, pagado }
   */
  function cotizar(cfgIn, p) {
    const c = cfgIn && cfgIn.__norm ? cfgIn : config(cfgIn);
    p = p || {};
    const s = c.servicios[p.servicio] || c.servicios[0] || servicio({ nombre: 'Servicio', precio: 0 });
    const perros = (p.perros && p.perros.length ? p.perros : [{}]);
    const n = s.porPerro ? perros.length : 1;
    const u1 = s.unidad, u2 = s.unidadPlural;
    const qtyTxt = (q) => `${q} ${q === 1 ? u1 : u2}`;

    /* cantidad: por calendario o elegida */
    let dias = [], qty = 0;
    if (s.cobro === 'cantidad') qty = clamp(Math.round(num(p.cantidad)) || s.cantidadDefecto, s.cantidadMin, s.cantidadMax);
    else {
      const d = diasDe(s, p);
      if (d) { dias = d; qty = d.length; }
      else if (p.cantidad != null && p.cantidad !== '') qty = Math.max(0, Math.round(num(p.cantidad)));   // estimación sin fechas (calculadora de la web)
    }

    /* recargo de cada día: se aplica el mayor entre fin de semana y fecha especial */
    const recDia = dias.map((k) => {
      let r = null;
      const dow = parse(k).getDay();
      if (s.recargoFinde && (dow === 0 || dow === 6)) r = { nombre: 'Fin de semana', pct: s.recargoFinde };
      const e = especial(c, k);
      if (e && (!r || e.pct > r.pct)) r = e;
      return r;
    });

    const dp = c.descPerroAdicional;
    const lineas = [], recMap = {};
    for (let i = 0; i < n; i++) {
      const perro = perros[i] || {};
      const tam = c.tamanos[perro.tamano];
      const rec = tam ? num(tam.recargo) : 0;
      const unit = Math.round(s.precio * (1 + rec / 100));
      const f = i > 0 && dp ? 1 - dp / 100 : 1;
      const notas = [];
      if (rec) notas.push(`${rec > 0 ? '+' : ''}${pct(rec)} ${String(tam.nombre || '').toLowerCase()}`);
      if (f !== 1) notas.push(`−${pct(dp)} perro adicional`);
      lineas.push({
        nombre: s.porPerro ? (String(perro.nombre || '').trim() || `Perro ${i + 1}`) : s.nombre,
        detalle: `${qtyTxt(qty)} × ${money(unit)}`, notas: notas.join(' · '), importe: Math.round(unit * qty * f),
      });
      recDia.forEach((r, j) => {
        if (!r) return;
        const m = recMap[r.nombre] || (recMap[r.nombre] = { nombre: r.nombre, pct: r.pct, dias: new Set(), importe: 0 });
        m.dias.add(dias[j]); m.importe += unit * r.pct / 100 * f;
      });
    }
    const recargos = Object.values(recMap).map((m) => ({
      nombre: `${m.nombre} (+${pct(m.pct)})`,
      detalle: `${qtyTxt(m.dias.size)}${n > 1 ? ` × ${n} perros` : ''}`,
      importe: Math.round(m.importe),
    }));
    const servicioTotal = lineas.reduce((a, l) => a + l.importe, 0) + recargos.reduce((a, l) => a + l.importe, 0);

    /* visita de adaptación obligatoria */
    let adaptacion = null;
    const A = c.adaptacion;
    if (A.activa && s.adaptacion && p.primeraVez !== false && qty > 0) {
      const unit = A.fijo > 0 ? Math.round(A.fijo) : Math.round(s.precio * A.pct / 100);
      const cnt = A.porPerro ? perros.length : 1;
      const base = A.fijo > 0 ? '' : (A.pct === 50 ? `medio ${u1}` : `${pct(A.pct)} de un ${u1}`);
      adaptacion = { nombre: `${A.nombre} (obligatoria)`, detalle: [cnt > 1 ? `${cnt} perros × ${money(unit)}` : money(unit), base].filter(Boolean).join(' · '), importe: unit * cnt };
    }

    /* extras */
    const extras = [];
    Object.keys(p.extras || {}).forEach((key) => {
      const x = c.extras[+key]; if (!x) return;
      const raw = String(p.extras[key] ?? '').trim();
      const auto = { unico: 1, dia: qty, perro: perros.length, perroDia: perros.length * qty }[x.cobro];
      const q = raw !== '' ? num(raw) : auto;
      if (!q) return;
      extras.push({ nombre: x.nombre, detalle: `${q} × ${money(x.precio)}`, importe: Math.round(x.precio * q) });
    });
    const extrasTotal = extras.reduce((a, e) => a + e.importe, 0);
    const subtotal = servicioTotal + (adaptacion ? adaptacion.importe : 0) + extrasTotal;

    /* descuentos */
    const tiers = (s.descCantidad || (s.cobro !== 'cantidad' ? c.descEstadia : []) || []).slice().sort((a, b) => num(a.desde) - num(b.desde));
    const tier = tiers.filter((t) => qty >= num(t.desde)).pop() || null;
    const next = tiers.find((t) => num(t.desde) > qty && num(t.pct) > (tier ? num(tier.pct) : 0)) || null;
    const descuentos = [];
    if (tier) descuentos.push({ nombre: `Descuento desde ${num(tier.desde)} ${u2} (${pct(tier.pct)})`, importe: Math.round(servicioTotal * num(tier.pct) / 100) });
    const dx = num(p.descExtra);
    if (dx) {
      const b = subtotal - descuentos.reduce((a, d) => a + d.importe, 0);
      descuentos.push({ nombre: `Descuento especial (${pct(dx)})`, importe: Math.round(b * dx / 100) });
    }
    const base = subtotal - descuentos.reduce((a, d) => a + d.importe, 0);

    let pagos = (c.pagos.length ? c.pagos : [{ nombre: '', descuento: 0 }]).map((x) => ({ nombre: x.nombre, pct: num(x.descuento), total: redondear(base * (1 - num(x.descuento) / 100), c.redondeo) }));
    if (p.pago >= 0 && pagos[p.pago]) pagos = [pagos[p.pago]];
    const best = Math.min(...pagos.map((x) => x.total));
    const senia = redondear(Math.max(...pagos.map((x) => x.total)) * c.seniaPct / 100, c.redondeo);

    return {
      serv: s, unidad: u1, unidadPlural: u2, uPlur: u2, qty, dias, perros: lineas, dogs: lineas, recargos, adaptacion,
      extras, servicioTotal, subtotal, descuentos, base, pagos, best, seniaPct: c.seniaPct, senia,
      pagado: num(p.pagado), tier, next,
    };
  }

  /* ---------- cupos ---------- */
  /* días ocupados por presupuestos confirmados (señados o pagados) */
  function ocupacion(entradas) {
    const out = {};
    (entradas || []).forEach((h) => {
      if (!h || !['senado', 'pagado'].includes(h.estado)) return;
      const cc = config(h.c), s = cc.servicios[h.s.servicio];
      if (!s || s.cobro === 'cantidad' || !s.ocupaCupo) return;
      const a = parse(h.s.fechaIn); if (!a) return;
      const b = parse(h.s.fechaOut) || a, exc = h.s.excluidos || [];
      const perros = (h.s.dogs || []).length || 1;
      for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
        const k = iso(d);
        if (s.cobro !== 'noche' && exc.includes(k)) continue;
        out[k] = (out[k] || 0) + perros;
      }
    });
    return out;
  }
  function estadoDia(disp, k) {
    if (!disp) return null;
    const cap = Math.max(0, num(disp.capacidad));
    const ocup = num((disp.ocupados || {})[k]);
    const cerrado = (disp.cerrados || []).includes(k);
    const libres = cerrado ? 0 : Math.max(0, cap - ocup);
    return { cap, ocupados: ocup, libres, cerrado, lleno: cerrado || libres <= 0 };
  }

  root.Cotizador = { config, servicio, extra, cotizar, especial, ocupacion, estadoDia, plural, money, pct, num, iso, parse, clone, COBRO_EXTRA };
})(typeof window !== 'undefined' ? window : globalThis);
