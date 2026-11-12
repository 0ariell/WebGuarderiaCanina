/* Inquietos Caninos · landing
   Arma las secciones con los datos de config.js, maneja la calculadora y las animaciones. */
(function () {
  'use strict';
  const C = window.INQUIETOS || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  const money = (n) => '$' + nf.format(Math.round(n));
  const pct = (p) => String(+(+p).toFixed(2)).replace('.', ',') + '%';
  const icon = (id, cls = 'h-5 w-5') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const servicios = (C.servicios || []).filter((s) => s && s.nombre);
  const pagos = (C.pagos && C.pagos.length ? C.pagos : [{ nombre: '', descuento: 0 }]);
  const unidad = (s) => (s.unidad === 'noche' ? ['noche', 'noches'] : ['día', 'días']);

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
      description: 'Paseos, guardería de día y estadías para perros.',
      areaServed: C.zona || undefined, priceRange: '$$',
      telephone: wa ? '+' + wa : undefined,
      sameAs: ig ? [`https://instagram.com/${ig}`] : undefined,
      address: C.direccion || C.zona ? { '@type': 'PostalAddress', streetAddress: C.direccion || undefined, addressLocality: C.zona || undefined, addressCountry: 'AR' } : undefined,
      makesOffer: (C.servicios || []).map((s) => ({ '@type': 'Offer', name: s.nombre, priceCurrency: 'ARS', price: s.precio,
        itemOffered: { '@type': 'Service', name: s.nombre, description: s.bajada || undefined } })),
    };
    const el = document.createElement('script'); el.type = 'application/ld+json'; el.textContent = JSON.stringify(ld);
    document.head.appendChild(el);
  } catch { /* opcional */ }

  /* ---------------- franja ---------------- */
  const words = [...servicios.map((s) => s.nombre), 'Juego', 'Descanso', 'Mimos', 'Fotos'];
  const run = words.map((w) => `<span class="flex items-center gap-8 pr-8">${esc(w)}<span class="h-4 w-4 rounded-full bg-ball"></span></span>`).join('');
  $('#marquee').innerHTML = `<div class="flex">${run}${run}</div><div class="flex" aria-hidden="true">${run}${run}</div>`;

  /* ---------------- servicios ---------------- */
  const featured = servicios.findIndex((s) => /estad/i.test(s.nombre));
  $('#svcGrid').innerHTML = servicios.map((s, i) => {
    const f = i === (featured < 0 ? 0 : featured);
    const [u1] = unidad(s);
    return `<article class="svc reveal ${f ? 'featured' : ''}">
      <div class="flex items-start justify-between gap-4">
        <span class="svc-icon">${icon(s.icono || ['casa', 'sol', 'correa'][i % 3], '')}</span>
        ${f ? '<span class="rounded-full bg-white/15 px-3 py-1.5 font-mono text-[.7rem] font-semibold tracking-[.12em]">EL MÁS PEDIDO</span>' : ''}
      </div>
      <div>
        <h3 class="font-display text-[1.75rem] font-extrabold leading-tight [font-stretch:110%]">${esc(s.nombre)}</h3>
        <p class="mt-2 ${f ? 'text-white/80' : 'text-ink-2'}">${esc(s.bajada || '')}</p>
      </div>
      ${C.mostrarPrecios !== false ? `<p class="flex items-baseline gap-2"><span class="font-display text-[2.3rem] font-black leading-none tracking-tight [font-stretch:108%]">${money(s.precio)}</span><span class="${f ? 'text-white/75' : 'text-ink-3'} font-semibold">por ${u1}</span></p>` : ''}
      <ul class="grid gap-2.5">${(s.incluye || []).map((x) => `<li class="flex items-start gap-2.5">${icon('check', `mt-0.5 h-5 w-5 flex-none ${f ? 'text-[#7fd8f0]' : 'text-cyan'}`)}<span>${esc(x)}</span></li>`).join('')}</ul>
      <button type="button" data-pick="${i}" class="mt-auto inline-flex items-center gap-2 self-start pt-2 font-bold ${f ? 'text-white' : 'text-brand'} group">
        Calcular ${esc(s.nombre.toLowerCase())}<span class="transition-transform duration-300 group-hover:translate-x-1">${icon('arrow')}</span>
      </button>
    </article>`;
  }).join('');

  /* ---------------- calculadora ---------------- */
  const extrasCfg = (C.extras || []).filter((x) => x && x.nombre);
  const calc = { s: Math.max(0, featured), qty: 5, dogs: 1, ex: new Set() };
  const perks = [];
  pagos.forEach((p) => { if (+p.descuento > 0) perks.push([`${pct(p.descuento)} menos pagando ${p.nombre.toLowerCase()}`, 'heart']); });
  (C.descEstadia || []).filter((t) => +t.desde && +t.pct).forEach((t) => perks.push([`${pct(t.pct)} menos desde ${t.desde} días`, 'cal']));
  if (+C.descPerroAdicional) perks.push([`${pct(C.descPerroAdicional)} menos desde el segundo perro`, 'paw']);
  if (+C.seniaPct) perks.push([`Reservás con una seña del ${pct(C.seniaPct)}`, 'shield']);
  $('#perks').innerHTML = perks.map(([t, ic]) => `<li class="flex items-center gap-3 font-semibold"><span class="grid h-10 w-10 flex-none place-items-center rounded-full bg-sky text-brand">${icon(ic)}</span>${esc(t)}</li>`).join('');

  if (C.mostrarPrecios === false) { $('#precios').hidden = true; $$('a[href="#precios"]').forEach((a) => (a.href = 'app/#cliente')); }

  function compute() {
    const s = servicios[calc.s]; if (!s) return null;
    const unit = +s.precio || 0, dp = +C.descPerroAdicional || 0;
    let serv = 0;
    for (let i = 0; i < calc.dogs; i++) serv += unit * calc.qty * (i > 0 ? 1 - dp / 100 : 1);
    const tier = (C.descEstadia || []).filter((t) => +t.desde && calc.qty >= +t.desde).sort((a, b) => b.desde - a.desde)[0];
    const larga = tier ? serv * (+tier.pct || 0) / 100 : 0;
    const extras = [...calc.ex].reduce((a, i) => { const x = extrasCfg[i]; return a + (+x.precio || 0) * (x.unidad === 'dia' ? calc.qty : 1); }, 0);
    const base = serv - larga + extras;
    // próximo escalón de descuento por estadía larga (para sugerirlo)
    const next = (C.descEstadia || []).filter((t) => +t.desde > calc.qty && +t.pct > (tier ? +tier.pct : 0)).sort((a, b) => a.desde - b.desde)[0];
    const totals = pagos.map((p) => ({ nombre: p.nombre, d: +p.descuento || 0, total: Math.round(base * (1 - (+p.descuento || 0) / 100)) }));
    const best = Math.min(...totals.map((t) => t.total));
    const senia = Math.round(Math.max(...totals.map((t) => t.total)) * (+C.seniaPct || 0) / 100);
    return { s, unit, larga, tier, totals, best, senia, extras, next };
  }

  let shown = {};
  function tween(el, to) {
    const from = shown[el.id] ?? to; shown[el.id] = to;
    if (reduce || !window.gsap || from === to) { el.textContent = money(to); return; }
    const o = { v: from };
    window.gsap.to(o, { v: to, duration: .5, ease: 'power3.out', onUpdate: () => (el.textContent = money(o.v)) });
  }

  function renderCalc() {
    $('#cServ').innerHTML = servicios.map((s, i) => `<button type="button" aria-pressed="${i === calc.s}" data-serv="${i}">${esc(s.nombre)}</button>`).join('');
    $('#cExtrasWrap').hidden = !extrasCfg.length;
    $('#cExtras').innerHTML = extrasCfg.map((x, i) => `<button type="button" class="xchip" data-ex="${i}" aria-pressed="false"><span class="box">${icon('check', '')}</span>${esc(x.nombre.replace(/\s*\(.*\)$/, ''))}<small>${money(x.precio)}${x.unidad === 'dia' ? '/día' : ''}</small></button>`).join('');
    updateCalc();
  }
  function updateCalc() {
    const r = compute(); if (!r) return;
    const [u1, u2] = unidad(r.s);
    $$('#cServ button').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.serv === calc.s));
    $('#cQtyLbl').textContent = u2.toUpperCase();
    $('#cQty').textContent = calc.qty; $('#cDogs').textContent = calc.dogs;
    const range = $('#cRange'); range.value = Math.min(calc.qty, +range.max);
    range.style.setProperty('--p', `${((Math.min(calc.qty, 30) - 1) / 29) * 100}%`);
    range.setAttribute('aria-label', `Cantidad de ${u2}`);
    $('[data-step="qty"][data-d="-1"]').disabled = calc.qty <= 1;
    $('[data-step="dogs"][data-d="-1"]').disabled = calc.dogs <= 1;
    $('[data-step="dogs"][data-d="1"]').disabled = calc.dogs >= 6;
    let det = `${calc.dogs} ${calc.dogs === 1 ? 'perro' : 'perros'} × ${calc.qty} ${calc.qty === 1 ? u1 : u2} × ${money(r.unit)}`;
    if (r.larga) det += ` · <span class="font-semibold text-[#17784a] dark:text-[#4fca8b]">${pct(r.tier.pct)} menos por estadía larga</span>`;
    if (r.extras) det += ` · extras ${money(r.extras)}`;
    $('#cDetail').innerHTML = det;
    $$('#cExtras .xchip').forEach((b) => b.setAttribute('aria-pressed', calc.ex.has(+b.dataset.ex)));
    const nudge = $('#cNudge'), falta = r.next ? r.next.desde - calc.qty : 0;
    if (r.next && falta <= 7) {
      nudge.innerHTML = `<span>Con <b>${falta} ${falta === 1 ? u1 : u2} más</b> tenés <b class="text-brand">${pct(r.next.pct)} de descuento</b> en ${esc(r.s.nombre.toLowerCase())}.</span><button type="button" class="btn btn-ghost !min-h-[40px] !px-4 text-[.9rem]" data-jump="${r.next.desde}">Sumar</button>`;
      nudge.classList.replace('hidden', 'flex');
    } else nudge.classList.replace('flex', 'hidden');

    const box = $('#cTotals');
    if (box.children.length !== r.totals.length) {
      box.innerHTML = r.totals.map((t, i) => `<div class="total" data-i="${i}">
        <span class="flex items-center justify-between gap-2 font-mono text-[.7rem] font-semibold tracking-[.12em] opacity-80"><span>${esc(t.nombre ? t.nombre.toUpperCase() : 'TOTAL')}</span><span class="tag"></span></span>
        <span class="amt" id="cT${i}">${money(t.total)}</span></div>`).join('');
      box.className = `mt-4 grid gap-3 ${r.totals.length > 1 ? 'sm:grid-cols-2' : ''}`;
    }
    r.totals.forEach((t, i) => {
      const el = box.children[i];
      el.classList.toggle('best', r.totals.length > 1 && t.total === r.best);
      el.querySelector('.tag').innerHTML = t.d > 0 ? `<span class="rounded-full bg-[#c41d24] px-2 py-0.5 text-[.75rem] font-bold text-white">−${pct(t.d)}</span>` : '';
      tween($('#cT' + i), t.total);
    });
    $('#cSenia').hidden = !r.senia;
    tween($('#cSeniaV'), r.senia);
    $('#cGo').href = `app/#cliente&s=${calc.s}&p=${calc.dogs}${calc.ex.size ? '&e=' + [...calc.ex].join('.') : ''}`;
    if (wa) {
      const lines = [`¡Hola! Quería consultar por ${r.s.nombre.toLowerCase()}:`,
        `• ${calc.dogs} ${calc.dogs === 1 ? 'perro' : 'perros'}, ${calc.qty} ${calc.qty === 1 ? u1 : u2}`,
        ...[...calc.ex].map((i) => `• + ${extrasCfg[i].nombre}`),
        ...r.totals.map((t) => `• ${t.nombre ? 'Total ' + t.nombre.toLowerCase() : 'Total'}: ${money(t.total)}`),
        '¿Tenés lugar? Te paso las fechas.'];
      const w = $('#cWa'); w.hidden = false; w.target = '_blank'; w.rel = 'noopener';
      w.href = `https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`;
    }
  }
  $('#calc').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.serv != null) calc.s = +b.dataset.serv;
    else if (b.dataset.step === 'qty') calc.qty = Math.max(1, Math.min(90, calc.qty + +b.dataset.d));
    else if (b.dataset.step === 'dogs') calc.dogs = Math.max(1, Math.min(6, calc.dogs + +b.dataset.d));
    else if (b.dataset.ex != null) { const i = +b.dataset.ex; if (calc.ex.has(i)) calc.ex.delete(i); else calc.ex.add(i); }
    else if (b.dataset.jump) calc.qty = +b.dataset.jump;
    else return;
    updateCalc();
  });
  $('#cRange').addEventListener('input', (e) => { calc.qty = +e.target.value; updateCalc(); });
  $('#svcGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    calc.s = +b.dataset.pick; updateCalc(); goTo('#precios');
  });
  renderCalc();

  /* ticket de la portada con números reales */
  (function heroTicket() {
    const s = servicios[Math.max(0, featured)]; if (!s) return;
    const q = 5, base = (+s.precio || 0) * q;
    const best = pagos.reduce((m, p) => Math.min(m, base * (1 - (+p.descuento || 0) / 100)), Infinity);
    const bp = pagos.find((p) => Math.round(base * (1 - (+p.descuento || 0) / 100)) === Math.round(best));
    $('#tkLine').textContent = `${s.nombre.toUpperCase()} · ${q} ${unidad(s)[1].toUpperCase()}`;
    $('#tkTotal').textContent = money(best);
    if (bp && bp.nombre) $('#tkTotal').previousElementSibling.textContent = `EN ${bp.nombre.toUpperCase()}`;
    if (C.mostrarPrecios === false) $('#tkTotal').parentElement.hidden = true;
  })();

  /* ---------------- cómo lo cuidamos ---------------- */
  const vIcons = ['users', 'home', 'heart', 'cam', 'star', 'shield'];
  $('#values').innerHTML = (C.forma || []).map((v, i) => `<div class="reveal bg-deep p-8 sm:p-9">
      <span class="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#7fd8f0]">${icon(vIcons[i % vIcons.length], 'h-6 w-6')}</span>
      <h3 class="mt-6 font-display text-[1.35rem] font-extrabold [font-stretch:108%]">${esc(v.titulo)}</h3>
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
    const secs = ['servicios', 'como', 'precios', 'cuidado', 'preguntas'];
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
      .from('#heroArt > div:first-child', { scale: .6, opacity: 0, duration: 1.2, ease: 'elastic.out(1,.7)' }, .2)
      .from('.hero-dog', { y: 80, opacity: 0, duration: 1 }, .45)
      .from('#ball', { y: -420, duration: 1.3, ease: 'bounce.out' }, .7)
      .from('.ticket', { y: 60, rotate: -8, opacity: 0, duration: 1 }, .9)
      .from('.float-b', { x: 40, opacity: 0, duration: .9 }, 1)
      .from('.float-c', { scale: .6, opacity: 0, duration: .8, ease: 'back.out(2)' }, 1.15);

    gsap.to('.float-a', { y: -10, rotate: -1.5, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 });
    gsap.to('.float-b', { y: 12, duration: 3.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 });
    gsap.to('.float-c', { y: -8, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.2 });
    gsap.to('.hero-ring', { rotate: 360, duration: 90, ease: 'none', repeat: -1 });
    // la pelotita rebota cada tanto
    gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: 3.2 })
      .to('#ball', { y: -70, duration: .38, ease: 'power2.out' })
      .to('#ball', { y: 0, duration: .5, ease: 'bounce.out' });

    if (!ST) return;
    gsap.to('#heroArt', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true } });

    /* aparición de secciones */
    ST.batch('.reveal', {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.from(els, { y: 46, opacity: 0, duration: .95, ease: 'power3.out', stagger: .09, clearProps: 'transform,opacity' }),
    });
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
