/* Inquietos Caninos · landing
   Arma las secciones con los datos de config.js, calcula con el mismo motor que la app (assets/cotizador.js)
   y maneja la disponibilidad, las animaciones y la navegación. */
(function () {
  'use strict';
  const C = window.INQUIETOS || {};
  const K = window.Cotizador;
  const CN = K.config(C);                       // configuración normalizada (servicios, extras, cupos…)
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = K.money, pct = K.pct, num = K.num;
  const icon = (id, cls = 'h-5 w-5') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = Object.assign({}, C.textos);
  const precios = C.mostrarPrecios !== false;

  /* servicios visibles en la web, con su índice real (la app los recibe por índice) */
  const web = CN.servicios.map((s, i) => ({ s, i })).filter((x) => x.s.web);
  const cats = [];
  web.forEach((x) => { if (!cats.includes(x.s.categoria)) cats.push(x.s.categoria); });
  const featured = (web.find((x) => x.s.destacado) || web.find((x) => /estad/i.test(x.s.nombre)) || web[0] || { i: 0 }).i;
  const unidadTxt = (s, q) => (q === 1 ? s.unidad : s.unidadPlural);

  /* ---------------- contacto ---------------- */
  const wa = String(C.whatsapp || '').replace(/\D/g, '');
  const waMsg = encodeURIComponent('¡Hola! Quería consultar por el cuidado de mi perro.');
  $$('[data-wa]').forEach((a) => {
    if (wa) { a.href = `https://wa.me/${wa}?text=${waMsg}`; a.target = '_blank'; a.rel = 'noopener'; }
    else { a.href = 'app/#cliente'; }
  });
  const ig = String(C.instagram || '').replace(/^@/, '');
  $$('[data-ig]').forEach((a) => { if (ig) { a.href = `https://instagram.com/${ig}`; a.target = '_blank'; a.rel = 'noopener'; a.hidden = false; } });
  if (C.zona) { $$('[data-zona-txt]').forEach((el) => (el.textContent = `en ${C.zona}`)); }
  if (C.seniaPct != null) $$('[data-senia]').forEach((el) => (el.textContent = pct(C.seniaPct)));
  $('#year').textContent = new Date().getFullYear();

  const contact = [];
  if (wa) contact.push(`<li><a class="flex items-center gap-3 hover:text-brand" href="https://wa.me/${wa}" target="_blank" rel="noopener">${icon('wa', 'h-5 w-5 text-wa')}WhatsApp</a></li>`);
  if (ig) contact.push(`<li><a class="flex items-center gap-3 hover:text-brand" href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener">${icon('ig', 'h-5 w-5 text-cyan')}@${esc(ig)}</a></li>`);
  if (C.direccion || C.zona) {
    const t = esc(C.direccion || C.zona);
    contact.push(`<li class="flex items-start gap-3">${icon('pin', 'mt-0.5 h-5 w-5 flex-none text-cyan')}${C.mapa ? `<a class="hover:text-brand" href="${esc(C.mapa)}" target="_blank" rel="noopener">${t}</a>` : `<span>${t}</span>`}</li>`);
  }
  if (C.horario) contact.push(`<li class="flex items-start gap-3">${icon('clock', 'mt-0.5 h-5 w-5 flex-none text-cyan')}<span>${esc(C.horario)}</span></li>`);
  $('#contact').innerHTML = contact.join('');
  const info = [];
  if (C.zona) info.push(`<li class="flex items-center gap-2">${icon('pin', 'h-5 w-5 text-[#7fd8f0]')}${esc(C.zona)}</li>`);
  if (C.horario) info.push(`<li class="flex items-center gap-2">${icon('clock', 'h-5 w-5 text-[#7fd8f0]')}${esc(C.horario)}</li>`);
  if (ig) info.push(`<li><a class="flex items-center gap-2 hover:text-white" href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener">${icon('ig', 'h-5 w-5 text-[#7fd8f0]')}@${esc(ig)}</a></li>`);
  $('#ctaInfo').innerHTML = info.join('');

  /* ---------------- datos estructurados para Google (negocio local) ---------------- */
  try {
    const ld = {
      '@context': 'https://schema.org', '@type': 'LocalBusiness', '@id': location.origin + location.pathname + '#negocio',
      name: C.negocio || 'Inquietos Caninos', url: location.origin + location.pathname,
      image: new URL('assets/img/og.jpg', location.href).href, logo: new URL('icons/logo.png', location.href).href,
      description: 'Paseos, guardería de día, estadías y clases de educación canina.',
      areaServed: C.zona || undefined, priceRange: '$$',
      telephone: wa ? '+' + wa : undefined,
      sameAs: ig ? [`https://instagram.com/${ig}`] : undefined,
      address: C.direccion || C.zona ? { '@type': 'PostalAddress', streetAddress: C.direccion || undefined, addressLocality: C.zona || undefined, addressCountry: 'AR' } : undefined,
      makesOffer: web.map(({ s }) => ({ '@type': 'Offer', name: s.nombre, priceCurrency: 'ARS', price: precios ? s.precio : undefined,
        itemOffered: { '@type': 'Service', name: s.nombre, description: s.bajada || undefined } })),
    };
    const el = document.createElement('script'); el.type = 'application/ld+json'; el.textContent = JSON.stringify(ld);
    document.head.appendChild(el);
  } catch { /* opcional */ }

  /* ---------------- franja ---------------- */
  const words = [...web.map((x) => x.s.nombre), 'Juego', 'Descanso', 'Mimos', 'Fotos'];
  const run = words.map((w) => `<span class="flex items-center gap-8 pr-8">${esc(w)}<span class="h-4 w-4 rounded-full bg-ball"></span></span>`).join('');
  $('#marquee').innerHTML = `<div class="flex">${run}${run}</div><div class="flex" aria-hidden="true">${run}${run}</div>`;

  /* ---------------- servicios ---------------- */
  const tiersTxt = (s) => (s.descCantidad || []).slice().sort((a, b) => a.desde - b.desde)
    .map((t) => `${pct(t.pct)} menos desde ${t.desde} ${unidadTxt(s, t.desde)}`);
  const grid = $('#svcGrid');
  grid.className = `mt-14 grid gap-5 md:grid-cols-2 ${web.length === 4 ? 'xl:grid-cols-4' : web.length >= 3 ? 'lg:grid-cols-3' : ''}`;
  grid.innerHTML = web.map(({ s, i }) => {
    const f = i === featured;
    const t = tiersTxt(s)[0];
    return `<article class="svc reveal ${f ? 'featured' : ''}">
      <div class="flex items-start justify-between gap-4">
        <span class="svc-icon">${icon(s.icono || (s.cobro === 'cantidad' ? 'educacion' : 'casa'), '')}</span>
        ${f ? '<span class="rounded-full bg-white/15 px-3 py-1.5 text-[.85rem] font-bold">El más pedido</span>' : ''}
      </div>
      <div>
        <p class="text-[.95rem] font-semibold ${f ? 'text-white/80' : 'text-cyan-ink'}">${esc(s.categoria)}</p>
        <h3 class="mt-1 font-display text-[1.6rem] font-extrabold leading-tight [font-stretch:110%]">${esc(s.nombre)}</h3>
        <p class="mt-2 ${f ? 'text-white/80' : 'text-ink-2'}">${esc(s.bajada || '')}</p>
      </div>
      ${precios ? `<div><p class="flex items-baseline gap-2"><span class="font-display text-[2.2rem] font-black leading-none tracking-tight [font-stretch:108%]">${money(s.precio)}</span><span class="${f ? 'text-white/75' : 'text-ink-3'} font-semibold">por ${esc(s.unidad)}</span></p>
        ${t ? `<p class="mt-2 inline-flex rounded-full ${f ? 'bg-white/15' : 'bg-sky text-brand'} px-3 py-1 text-[.82rem] font-semibold">${esc(t)}</p>` : ''}</div>` : ''}
      <ul class="grid gap-2.5">${s.incluye.map((x) => `<li class="flex items-start gap-2.5">${icon('check', `mt-0.5 h-5 w-5 flex-none ${f ? 'text-[#7fd8f0]' : 'text-cyan'}`)}<span>${esc(x)}</span></li>`).join('')}</ul>
      <button type="button" data-pick="${i}" class="mt-auto inline-flex items-center gap-2 self-start pt-2 font-bold ${f ? 'text-white' : 'text-brand'} group">
        Calcular ${esc(s.nombre.toLowerCase())}<span class="transition-transform duration-300 group-hover:translate-x-1">${icon('arrow')}</span>
      </button>
    </article>`;
  }).join('');

  /* ---------------- educación ---------------- */
  const edu = C.educador || {};
  const eduSrv = web.find((x) => x.s.cobro === 'cantidad' && /educa|clase|adiestr/i.test(x.s.nombre + x.s.categoria)) || web.find((x) => /educa/i.test(x.s.categoria));
  if (edu.titulo || edu.texto) {
    $('#educacion').hidden = false;
    $('#edTit').textContent = edu.titulo || 'Educación canina';
    $('#edTxt').textContent = edu.texto || '';
    $('#edPts').innerHTML = (edu.puntos || []).map((p) => `<li class="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-[.95rem] font-semibold">${icon('check', 'h-4 w-4 text-cyan')}${esc(p)}</li>`).join('');
    if (eduSrv && precios) {
      const t = (eduSrv.s.descCantidad || []).slice().sort((a, b) => b.pct - a.pct)[0];
      $('#edPack').hidden = false;
      $('#edPack').textContent = t ? `${pct(t.pct)} menos desde ${t.desde} ${unidadTxt(eduSrv.s, t.desde)}` : `${money(eduSrv.s.precio)} por ${eduSrv.s.unidad}`;
    }
    if (eduSrv) $('#edCalc').addEventListener('click', () => { pick(eduSrv.i); goTo('#precios'); });
    else $('#edCalc').hidden = true;
  } else $$('a[href="#educacion"]').forEach((a) => a.parentElement.tagName === 'LI' ? a.parentElement.remove() : a.remove());

  /* ---------------- pasos: adaptación ---------------- */
  const A = CN.adaptacion;
  if (A.activa) {
    $('#stAdTit').textContent = A.nombre;
    $('#stAdTxt').textContent = A.texto || `Obligatoria para todos los perros nuevos, aunque ya hayan ido a otra guardería${A.validezDias ? `. Vale si la hacés hasta ${A.validezDias} días antes del ingreso` : ''}.`;
  } else $('#stAdTit').closest('li').remove();

  /* ---------------- calculadora ---------------- */
  if (T.calcTitulo) $('#cTitulo').textContent = T.calcTitulo;
  if (T.calcBajada) $('#cBajada').textContent = T.calcBajada;
  if (T.calcNota) $('#cNota').textContent = T.calcNota;
  if (T.primeraVez) $('#cPvTit').textContent = T.primeraVez;
  const extrasWeb = CN.extras.map((x, i) => ({ x, i })).filter((e) => e.x.web);
  const calc = { s: featured, qty: 5, dogs: 1, ex: new Set(), pv: true };
  const sv = () => CN.servicios[calc.s] || CN.servicios[0];

  const perks = [];
  CN.pagos.forEach((p) => { if (num(p.descuento) > 0) perks.push([`${pct(p.descuento)} menos pagando ${String(p.nombre).toLowerCase()}`, 'heart']); });
  const packs = web.filter((x) => x.s.cobro === 'cantidad' && (x.s.descCantidad || []).length);
  if (packs.length) perks.push([`Packs de ${packs.map((x) => x.s.unidadPlural).filter((v, j, a) => a.indexOf(v) === j).join(' y ')} con descuento`, 'educacion']);
  const largas = web.filter((x) => x.s.cobro !== 'cantidad' && (x.s.descCantidad || []).length);
  if (largas.length) { const t = largas[0].s.descCantidad.slice().sort((a, b) => a.desde - b.desde)[0]; perks.push([`${pct(t.pct)} menos en estadías desde ${t.desde} ${unidadTxt(largas[0].s, t.desde)}`, 'cal']); }
  if (num(C.descPerroAdicional)) perks.push([`${pct(C.descPerroAdicional)} menos desde el segundo perro`, 'paw']);
  if (num(C.seniaPct)) perks.push([`Reservás con una seña del ${pct(C.seniaPct)}`, 'shield']);
  $('#perks').innerHTML = perks.map(([t, ic]) => `<li class="flex items-center gap-3 font-semibold">${icon(ic, 'h-6 w-6 flex-none text-brand')}${esc(t)}</li>`).join('');

  if (!precios) { $('#precios').hidden = true; $$('a[href="#precios"]').forEach((a) => (a.href = 'app/#cliente')); }

  /* fechas especiales (se aplican con fechas exactas en la app) */
  const especiales = (CN.fechasEspeciales || []).map((f) => {
    const fmt = (d) => { const p = String(d).split('-'); return p.length === 2 ? `${+p[1]}/${+p[0]}` : `${+p[2]}/${+p[1]}`; };
    return `${f.nombre} (${fmt(f.desde)}${f.hasta && f.hasta !== f.desde ? `–${fmt(f.hasta)}` : ''}) +${pct(f.recargo)}`;
  });

  let shown = {};
  function tween(el, to) {
    const from = shown[el.id] ?? to; shown[el.id] = to;
    if (reduce || !window.gsap || from === to) { el.textContent = money(to); return; }
    const o = { v: from };
    window.gsap.to(o, { v: to, duration: .5, ease: 'power3.out', onUpdate: () => (el.textContent = money(o.v)) });
  }
  function pick(i) {
    const s = K.servicio(C.servicios[i], i);
    calc.s = i; calc.qty = s.cantidadDefecto; renderCalc();
  }
  function renderCalc() {
    const s = sv();
    const cat = s.categoria;
    $('#cCat').hidden = cats.length < 2;
    $('#cCat').innerHTML = cats.map((c) => `<button type="button" aria-pressed="${c === cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    const enCat = web.filter((x) => x.s.categoria === cat);
    $('#cServ').innerHTML = enCat.map((x) => `<button type="button" aria-pressed="${x.i === calc.s}" data-serv="${x.i}">${esc(x.s.nombre)}</button>`).join('');
    $('#cServ').hidden = enCat.length < 2 && cats.length > 1;
    $('#cServ').previousElementSibling.hidden = $('#cServ').hidden;
    $('#cExtrasWrap').hidden = !extrasWeb.length;
    $('#cExtras').innerHTML = extrasWeb.map(({ x, i }) => `<button type="button" class="xchip" data-ex="${i}" aria-pressed="false"><span class="box">${icon('check', '')}</span>${esc(x.nombre.replace(/\s*\(.*\)$/, ''))}<small>${money(x.precio)} ${K.COBRO_EXTRA[x.cobro]}</small></button>`).join('');
    const r = $('#cRange'); r.min = s.cantidadMin; r.max = Math.min(s.cantidadMax, s.cobro === 'cantidad' ? 20 : 30);
    updateCalc();
  }
  function updateCalc() {
    const s = sv();
    calc.qty = Math.min(Math.max(calc.qty, s.cantidadMin), s.cantidadMax);
    const extras = {}; calc.ex.forEach((i) => (extras[i] = ''));
    const r = K.cotizar(C, { servicio: calc.s, cantidad: calc.qty, perros: Array.from({ length: calc.dogs }, () => ({})), extras, primeraVez: calc.pv });
    $('#cServTxt').textContent = s.bajada || '';
    $('#cQtyLbl').textContent = s.unidadPlural.charAt(0).toUpperCase() + s.unidadPlural.slice(1);
    $('#cQty').textContent = calc.qty; $('#cDogs').textContent = calc.dogs;
    const range = $('#cRange'); range.value = Math.min(calc.qty, +range.max);
    range.style.setProperty('--p', `${((Math.min(calc.qty, +range.max) - +range.min) / Math.max(1, +range.max - +range.min)) * 100}%`);
    range.setAttribute('aria-label', `Cantidad de ${s.unidadPlural}`);
    $('[data-step="qty"][data-d="-1"]').disabled = calc.qty <= s.cantidadMin;
    $('[data-step="qty"][data-d="1"]').disabled = calc.qty >= s.cantidadMax;
    $('[data-step="dogs"][data-d="-1"]').disabled = calc.dogs <= 1;
    $('[data-step="dogs"][data-d="1"]').disabled = calc.dogs >= 6;
    $('#cDogsWrap').hidden = !s.porPerro && !extrasWeb.some((e) => /perro/i.test(e.x.cobro));

    // adaptación
    const showPv = A.activa && s.adaptacion;
    $('#cPv').hidden = !showPv;
    $('#cPv').setAttribute('aria-pressed', calc.pv);
    if (showPv) {
      const unit = A.fijo > 0 ? A.fijo : Math.round(s.precio * A.pct / 100);
      $('#cPvTxt').textContent = calc.pv
        ? `Incluye la ${A.nombre.toLowerCase()} obligatoria: ${money(unit)}${A.porPerro ? ' por perro' : ''}.`
        : `Ya hizo la ${A.nombre.toLowerCase()}${A.validezDias ? ` (vale hasta ${A.validezDias} días antes del ingreso)` : ''}.`;
    }

    let det = `${s.porPerro ? `${calc.dogs} ${calc.dogs === 1 ? 'perro' : 'perros'} × ` : ''}${calc.qty} ${unidadTxt(s, calc.qty)} × ${money(s.precio)}`;
    if (r.tier) det += ` · <span class="font-semibold text-[#17784a] dark:text-[#4fca8b]">${pct(r.tier.pct)} menos desde ${r.tier.desde} ${unidadTxt(s, r.tier.desde)}</span>`;
    if (r.adaptacion) det += ` · adaptación ${money(r.adaptacion.importe)}`;
    const ext = r.extras.reduce((a, e) => a + e.importe, 0);
    if (ext) det += ` · extras ${money(ext)}`;
    $('#cDetail').innerHTML = det;
    $$('#cExtras .xchip').forEach((b) => b.setAttribute('aria-pressed', calc.ex.has(+b.dataset.ex)));

    const nudge = $('#cNudge'), falta = r.next ? r.next.desde - calc.qty : 0;
    if (r.next && falta <= 7 && r.next.desde <= s.cantidadMax) {
      nudge.innerHTML = `<span>Con <b>${falta} ${unidadTxt(s, falta)} más</b> tenés <b class="text-brand">${pct(r.next.pct)} de descuento</b> en ${esc(s.nombre.toLowerCase())}.</span><button type="button" class="btn btn-ghost !min-h-[40px] !px-4 text-[.9rem]" data-jump="${r.next.desde}">Sumar</button>`;
      nudge.classList.replace('hidden', 'flex');
    } else nudge.classList.replace('flex', 'hidden');

    const esp = $('#cEsp'), finde = s.recargoFinde ? `Sábados y domingos +${pct(s.recargoFinde)}` : '';
    const lst = s.cobro !== 'cantidad' ? [...especiales, finde].filter(Boolean) : [];
    esp.hidden = !lst.length;
    if (lst.length) esp.lastElementChild.textContent = `Fechas con recargo: ${lst.join(' · ')}. Se calcula solo al elegir las fechas.`;

    const box = $('#cTotals');
    if (box.children.length !== r.pagos.length) {
      box.innerHTML = r.pagos.map((t, i) => `<div class="total" data-i="${i}">
        <span class="flex items-center justify-between gap-2 text-[.95rem] font-semibold opacity-90"><span>${esc(t.nombre ? `En ${t.nombre.toLowerCase()}` : 'Total')}</span><span class="tag"></span></span>
        <span class="amt" id="cT${i}">${money(t.total)}</span></div>`).join('');
      box.className = `mt-4 grid gap-3 ${r.pagos.length > 1 ? 'sm:grid-cols-2' : ''}`;
    }
    r.pagos.forEach((t, i) => {
      const el = box.children[i];
      el.classList.toggle('best', r.pagos.length > 1 && t.total === r.best);
      el.querySelector('.tag').innerHTML = t.pct > 0 ? `<span class="rounded-full bg-[#c41d24] px-2 py-0.5 text-[.75rem] font-bold text-white">−${pct(t.pct)}</span>` : '';
      tween($('#cT' + i), t.total);
    });
    $('#cSenia').hidden = !r.senia;
    tween($('#cSeniaV'), r.senia);

    const porCantidad = s.cobro === 'cantidad';
    const go = $('#cGo');
    go.firstChild.textContent = porCantidad ? (T.calcBotonCantidad || 'Reservar') : (T.calcBoton || 'Elegir fechas y reservar');
    go.href = `app/#cliente&s=${calc.s}&p=${calc.dogs}${calc.ex.size ? '&e=' + [...calc.ex].join('.') : ''}${porCantidad ? '&q=' + calc.qty : ''}${calc.pv ? '' : '&pv=0'}`;
    if (wa) {
      const lines = [`¡Hola! Quería consultar por ${s.nombre.toLowerCase()}:`,
        `• ${s.porPerro ? `${calc.dogs} ${calc.dogs === 1 ? 'perro' : 'perros'}, ` : ''}${calc.qty} ${unidadTxt(s, calc.qty)}`,
        ...(r.adaptacion ? [`• ${r.adaptacion.nombre}`] : []),
        ...[...calc.ex].map((i) => `• + ${CN.extras[i].nombre}`),
        ...r.pagos.map((t) => `• ${t.nombre ? 'Total ' + t.nombre.toLowerCase() : 'Total'}: ${money(t.total)}`),
        porCantidad ? '¿Cuándo podemos arrancar?' : '¿Tenés lugar? Te paso las fechas.'];
      const w = $('#cWa'); w.hidden = false; w.target = '_blank'; w.rel = 'noopener';
      w.href = `https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`;
    }
  }
  $('#calc').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cat != null) { const x = web.find((w) => w.s.categoria === b.dataset.cat); if (x) pick(x.i); return; }
    if (b.dataset.serv != null) { pick(+b.dataset.serv); return; }
    const s = sv();
    if (b.dataset.step === 'qty') calc.qty = Math.max(s.cantidadMin, Math.min(s.cantidadMax, calc.qty + +b.dataset.d));
    else if (b.dataset.step === 'dogs') calc.dogs = Math.max(1, Math.min(6, calc.dogs + +b.dataset.d));
    else if (b.dataset.ex != null) { const i = +b.dataset.ex; if (calc.ex.has(i)) calc.ex.delete(i); else calc.ex.add(i); }
    else if (b.dataset.jump) calc.qty = +b.dataset.jump;
    else if (b.id === 'cPv') calc.pv = !calc.pv;
    else return;
    updateCalc();
  });
  $('#cRange').addEventListener('input', (e) => { calc.qty = +e.target.value; updateCalc(); });
  $('#svcGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    pick(+b.dataset.pick); goTo('#precios');
  });
  if (web.length) pick(featured); else $('#precios').hidden = true;

  /* ticket de la portada con números reales */
  (function heroTicket() {
    const s = CN.servicios[featured]; if (!s) return;
    const q = Math.min(5, s.cantidadMax);
    const r = K.cotizar(C, { servicio: featured, cantidad: q, primeraVez: false });
    const bp = r.pagos.find((p) => p.total === r.best);
    $('#tkLine').textContent = `${s.nombre.toUpperCase()} · ${q} ${unidadTxt(s, q).toUpperCase()}`;
    $('#tkTotal').textContent = money(r.best);
    if (bp && bp.nombre) $('#tkTotal').previousElementSibling.textContent = `EN ${bp.nombre.toUpperCase()}`;
    if (!precios) $('#tkTotal').parentElement.hidden = true;
  })();

  /* ---------------- disponibilidad ---------------- */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  let disp = null, dView = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  function mesHtml(y, m) {
    const today = K.iso(new Date()), lead = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    let h = '<span aria-hidden="true"></span>'.repeat(lead);
    for (let d = 1; d <= days; d++) {
      const k = K.iso(new Date(y, m, d)), e = K.estadoDia(disp, k);
      let cls = 'free', lbl = 'hay lugar';
      if (k < today) { cls = 'past'; lbl = 'pasado'; }
      else if (e.cerrado) { cls = 'full'; lbl = 'cerrado'; }
      else if (e.lleno) { cls = 'full'; lbl = 'completo'; }
      else if (e.libres <= CN.cupos.avisoQuedan) { cls = 'few'; lbl = `quedan ${e.libres}`; }
      h += `<span class="dday ${cls}${k === today ? ' today' : ''}" role="listitem" aria-label="${d} de ${MESES[m]}: ${lbl}">${d}${cls === 'few' ? `<small>${e.libres}</small>` : ''}</span>`;
    }
    return `<div class="dcal"><p class="dcal-t">${MESES[m]} ${y}</p>
      <div class="dcal-dow" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
      <div class="dcal-grid" role="list" aria-label="Disponibilidad de ${MESES[m]} ${y}">${h}</div></div>`;
  }
  function renderDisp() {
    const y = dView.getFullYear(), m = dView.getMonth();
    $('#dCals').innerHTML = mesHtml(y, m) + `<div class="hidden lg:block">${mesHtml(m === 11 ? y + 1 : y, (m + 1) % 12)}</div>`;
    const now = new Date();
    $('#dPrev').disabled = y === now.getFullYear() && m === now.getMonth();
  }
  if (CN.cupos.activo) {
    if (T.dispTitulo) $('#dTit').textContent = T.dispTitulo;
    $('#dBaj').textContent = T.dispBajada || 'Trabajamos con cupos reducidos. Mirá qué días quedan lugares.';
    fetch(`disponibilidad.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        disp = Object.assign({ capacidad: CN.cupos.capacidad, ocupados: {}, cerrados: [] }, d || {});
        if (!disp.capacidad) disp.capacidad = CN.cupos.capacidad;
        $('#disponibilidad').hidden = false; renderDisp();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      })
      .catch(() => { /* sin datos: la sección queda oculta */ });
    $('#dPrev').addEventListener('click', () => { dView = new Date(dView.getFullYear(), dView.getMonth() - 1, 1); renderDisp(); });
    $('#dNext').addEventListener('click', () => { dView = new Date(dView.getFullYear(), dView.getMonth() + 1, 1); renderDisp(); });
  } else $$('a[href="#disponibilidad"]').forEach((a) => a.parentElement.tagName === 'LI' ? a.parentElement.remove() : a.remove());

  /* ---------------- requisitos obligatorios ---------------- */
  const RQ = C.requisitos || {};
  const rqCards = [];
  const card = (ic, tit, items, extra = '') => `<article class="reveal border-t-[3px] border-brand pt-6">
      <h3 class="flex items-center gap-3 font-display text-[1.35rem] font-extrabold [font-stretch:108%]">${icon(ic, 'h-6 w-6 flex-none text-brand')}${tit}</h3>
      ${items.length ? `<ul class="mt-4 grid gap-3">${items.map((x) => `<li class="flex items-start gap-2.5">${icon('check', 'mt-0.5 h-5 w-5 flex-none text-cyan')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}${extra}
    </article>`;
  if ((RQ.llevar || []).length) rqCards.push(card('paw', 'Es obligatorio traer', RQ.llevar));
  if ((RQ.vacunas || []).length) rqCards.push(card('shield', 'Vacunas al día', RQ.vacunas));
  if (A.activa) rqCards.push(card('heart', esc(A.nombre), [], `<p class="mt-4 text-ink-2">${esc(A.texto || 'Obligatoria para todos los perros nuevos, aunque ya hayan ido a otra guardería.')}</p>`));
  if (rqCards.length) { $('#requisitos').hidden = false; $('#rqGrid').innerHTML = rqCards.join(''); }

  /* ---------------- cómo lo cuidamos ---------------- */
  const vIcons = ['users', 'home', 'heart', 'cam', 'star', 'shield'];
  $('#values').innerHTML = (C.forma || []).map((v, i) => `<div class="reveal bg-deep px-6 py-7 sm:p-9">
      <h3 class="flex items-center gap-3 font-display text-[1.35rem] font-extrabold [font-stretch:108%]">${icon(vIcons[i % vIcons.length], 'h-6 w-6 flex-none text-[#7fd8f0]')}${esc(v.titulo)}</h3>
      <p class="mt-2 text-[#b9c8e2]">${esc(v.texto)}</p>
    </div>`).join('');
  if (!(C.forma || []).length) $('#cuidado').hidden = true;

  /* ---------------- fotos ---------------- */
  const fotos = (C.fotos || []).filter(Boolean);
  if (fotos.length) {
    $('#fotos').hidden = false;
    $('#gallery').innerHTML = fotos.map((f, i) => `<figure class="reveal overflow-hidden rounded-[22px] bg-sky"><img src="${esc(typeof f === 'string' ? f : f.src)}" alt="${esc((typeof f === 'object' && f.alt) || 'Perro de la manada de Inquietos Caninos')}" loading="lazy" class="block w-full transition-transform duration-700 hover:scale-[1.04]"></figure>`).join('');
  }

  /* ---------------- opiniones ---------------- */
  const ops = (C.opiniones || []).filter((o) => o && o.texto);
  if (ops.length) {
    $('#opiniones').hidden = false;
    $('#reviews').innerHTML = ops.map((o) => `<figure class="reveal flex flex-col gap-6 rounded-[26px] border-[1.5px] border-line bg-bg p-7">
      <span class="font-display text-[3.5rem] font-black leading-[.5] text-cyan">“</span>
      <blockquote class="text-[1.08rem]">${esc(o.texto)}</blockquote>
      <figcaption class="mt-auto flex items-center gap-3"><span class="grid h-11 w-11 place-items-center rounded-full bg-brand text-on-brand">${icon('paw')}</span>
      <span class="leading-tight"><b class="block">${esc(o.nombre || '')}</b>${o.perro ? `<span class="text-[.9rem] text-ink-3">con ${esc(o.perro)}</span>` : ''}</span></figcaption></figure>`).join('');
  }

  /* ---------------- preguntas ---------------- */
  $('#faq').innerHTML = (C.preguntas || []).map((q, i) => `<details class="faq" ${i === 0 ? 'open' : ''}>
    <summary><span>${esc(q.p)}</span><span class="pm" aria-hidden="true"></span></summary>
    <div class="ans"><p>${esc(q.r)}</p></div></details>`).join('');
  $$('.faq').forEach((d) => {
    const sum = d.querySelector('summary'), ans = d.querySelector('.ans');
    sum.addEventListener('click', (e) => {
      if (reduce || !window.gsap) return;
      e.preventDefault();
      if (d.open) {
        window.gsap.to(ans, { height: 0, duration: .35, ease: 'power2.inOut', onComplete: () => { d.open = false; ans.style.height = ''; } });
      } else {
        d.open = true;
        window.gsap.fromTo(ans, { height: 0 }, { height: ans.scrollHeight, duration: .45, ease: 'power3.out', onComplete: () => (ans.style.height = '') });
      }
    });
  });

  /* ---------------- tema ---------------- */
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (document.documentElement.dataset.theme || (mq.matches ? 'dark' : 'light')) === 'dark';
  function paintTheme() {
    $('#themeBtn').setAttribute('aria-label', isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', isDark() ? '#06102a' : '#f6fafd'));
  }
  $('#themeBtn').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ic.theme', next); } catch { /* sin almacenamiento */ }
    paintTheme(); onScroll();
  });
  if (mq.addEventListener) mq.addEventListener('change', paintTheme);
  paintTheme();

  /* ---------------- menú móvil ---------------- */
  const menu = $('#menu');
  function openMenu(open) {
    menu.classList.toggle('hidden', !open);
    $('#menuBtn').setAttribute('aria-expanded', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    // el resto de la página queda fuera del alcance del teclado mientras el menú está abierto
    ['#nav', 'main', 'footer', '#mobileBar'].forEach((sel) => { const el = $(sel); if (el) el.inert = open; });
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && window.gsap && !reduce) window.gsap.from('#menu .menu-link', { y: 30, opacity: 0, stagger: .05, duration: .5, ease: 'power3.out', clearProps: 'all' });
    if (open) $('#menuClose').focus(); else $('#menuBtn').focus({ preventScroll: true });
  }
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('a, button', menu).filter((x) => x.offsetParent);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  $('#menuBtn').addEventListener('click', () => openMenu(true));
  $('#menuClose').addEventListener('click', () => openMenu(false));
  $$('#menu a').forEach((a) => a.addEventListener('click', () => openMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.classList.contains('hidden')) openMenu(false); });

  /* ---------------- scroll: barra, progreso, barra móvil ---------------- */
  const nav = $('#nav');
  function onScroll() {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    const solid = y > 20;
    nav.style.backgroundColor = solid ? `color-mix(in srgb, var(--c-bg) ${isDark() ? 82 : 86}%, transparent)` : 'transparent';
    nav.style.backdropFilter = nav.style.webkitBackdropFilter = solid ? 'saturate(1.6) blur(16px)' : 'none';
    nav.style.boxShadow = solid ? '0 1px 0 var(--c-line)' : 'none';
    const p = h > 0 ? Math.min(1, y / h) : 0;
    $('#progress').style.transform = `scaleX(${p})`;
    const ball = $('#progressBall');
    ball.style.opacity = y > 40 ? 1 : 0;
    ball.style.transform = `translateX(${p * (innerWidth - 13)}px) rotate(${p * 1440}deg)`;
    $('#mobileBar').style.transform = y > innerHeight * .7 && y < h - 380 ? 'translateY(0)' : 'translateY(140%)';
    const secs = ['servicios', 'educacion', 'como', 'precios', 'disponibilidad', 'cuidado', 'requisitos', 'preguntas'];
    let cur = '';
    secs.forEach((id) => { const el = document.getElementById(id); if (el && !el.hidden && el.getBoundingClientRect().top < innerHeight * .4) cur = id; });
    $$('.nav-link').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + cur));
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------------- scroll suave y animaciones ---------------- */
  let lenis = null;
  function goTo(sel) {
    const el = $(sel); if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -90, duration: 1.2 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    e.preventDefault(); goTo(id); history.replaceState(null, '', id === '#inicio' ? location.pathname : id);
    // el foco acompaña al scroll (teclado y lectores de pantalla)
    const target = $(id);
    if (target) { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  }));

  window.addEventListener('DOMContentLoaded', () => {
    const gsap = window.gsap, ST = window.ScrollTrigger;
    const root = document.documentElement;
    if (!gsap || reduce) { root.classList.remove('anim'); return; }
    if (ST) gsap.registerPlugin(ST);
    // estado inicial explícito; recién ahí se saca la clase que lo ocultaba desde el <head>
    gsap.set('.h-word', { y: 0, yPercent: 110 });
    gsap.set('.h-in', { y: 24 });
    gsap.set('#iDot', { y: -260, opacity: 1 });
    root.classList.remove('anim');

    if (window.Lenis) {
      lenis = new window.Lenis({ lerp: .11, smoothWheel: true });
      if (ST) lenis.on('scroll', ST.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    /* portada */
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to('.h-word', { yPercent: 0, duration: 1.1, stagger: .09 })
      .to('#iDot', { y: 0, duration: .9, ease: 'bounce.out' }, .55)
      .to('.h-in', { y: 0, duration: .9, stagger: .08 }, .2)
      .from('#heroArt > div:first-child', { scale: .8, opacity: 0, duration: 1.2, ease: 'expo.out' }, .2)
      .from('.hero-dog', { y: 80, opacity: 0, duration: 1 }, .45)
      .from('#ball', { y: -420, duration: 1.3, ease: 'bounce.out' }, .7)
      .from('.ticket', { y: 60, rotate: -8, opacity: 0, duration: 1 }, .9)
      .from('.float-b', { x: 40, opacity: 0, duration: .9 }, 1)
      .from('.float-c', { y: 16, opacity: 0, duration: .8, ease: 'expo.out' }, 1.15);

    // la pelotita vuelve a rebotar solo si la tocás
    const ball = $('#ball');
    $('#heroArt').addEventListener('pointerdown', (e) => {
      if (e.target !== ball || gsap.isTweening(ball)) return;
      gsap.timeline().to(ball, { y: -90, duration: .38, ease: 'power2.out' }).to(ball, { y: 0, duration: .6, ease: 'bounce.out' });
    });

    if (!ST) return;
    gsap.to('#heroArt', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true } });

    /* la franja avanza con el scroll en vez de girar sola */
    gsap.fromTo('#marquee', { xPercent: 0 }, { xPercent: -25, ease: 'none', scrollTrigger: { trigger: '#marquee', start: 'top bottom', end: 'bottom top', scrub: .6 } });
    /* la correa que une los pasos */
    const leash = $('#leash');
    if (leash) {
      const L = leash.getTotalLength();
      leash.style.strokeDasharray = `${L}`;
      gsap.fromTo(leash, { strokeDashoffset: L }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '#como', start: 'top 70%', end: 'center 50%', scrub: true } });
    }
    gsap.from('.cta-ball', { y: -200, ease: 'bounce.out', duration: 1.4, scrollTrigger: { trigger: '.cta-ball', start: 'top 85%' } });
  });
})();
