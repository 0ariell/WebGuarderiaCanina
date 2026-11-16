# AGENTS.md: instrucciones para agentes de código (Codex, Claude, etc.)

Proyecto: página web y app de presupuestos de **Inquietos Caninos**, un negocio de paseos, guardería de día, estadías y clases de educación canina en Buenos Aires. El dueño del negocio usa la app desde el celular. Lo usa gente joven pero poco técnica: todo tiene que ser simple, claro y sin pasos de más.

Leé también `README.md`: explica cómo se usa la app y qué significa cada campo de `config.js`.

## Reglas que no se rompen

1. **No pises `config.js` ni `disponibilidad.json`.** Los escribe la app cuando el cuidador toca **Publicar** (va directo a `main` por la API de GitHub) y tienen los datos reales del negocio: precios, alias, WhatsApp, titular. Antes de subir cambios, traé `main` y uní (`git fetch origin main && git merge origin/main`). Si necesitás un campo nuevo, agregalo con un valor por defecto en el código (`assets/cotizador.js` o `app/app.js`) en vez de reescribir el archivo.
2. **Trabajá en una rama** y uní a `main` solo cuando esté probado. GitHub Pages publica `main` (carpeta raíz).
3. **Los datos de los tutores nunca se publican.** Viven solo en el `localStorage` del celular. A la web llega únicamente cuántos lugares hay ocupados por día (`disponibilidad.json`).
4. **Sin servidor ni base de datos.** Es un sitio estático. No agregues backend, frameworks de JS ni pasos de compilación nuevos. La app es HTML, CSS y JS sin librerías.
5. **Mismo motor de precios en todos lados.** La web y la app calculan con `assets/cotizador.js` (`window.Cotizador`). Cualquier regla de precio va ahí, nunca duplicada.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `assets/landing.js`, `src/landing.css` | Página web (landing con calculadora y disponibilidad) |
| `assets/landing.css` | CSS **compilado**: no se edita a mano |
| `assets/cotizador.js` | Motor de cotización compartido |
| `assets/vendor/` | GSAP, ScrollTrigger y Lenis copiados (`npm run vendor`) |
| `app/index.html`, `app/app.js`, `app/styles.css` | App PWA: Inicio, Nuevo, Presupuestos, Agenda, Ajustes |
| `app/sw.js` | Service worker de la app (caché sin conexión) |
| `config.js` | Datos del negocio (`window.INQUIETOS`) |
| `disponibilidad.json` | Cupos ocupados y días cerrados |
| `fonts/` | Archivo, Onest e IBM Plex Mono, en subconjuntos y alojadas en el sitio |
| `404.html`, `sitemap.xml`, `robots.txt` | Usan la base `https://0ariell.github.io/WebGuarderiaCanina/` |

`app/#cliente` es el formulario que completan los tutores. Es la misma app en modo cliente.

## Comandos

```bash
npm install
npm run build   # obligatorio después de tocar clases de Tailwind en index.html, landing.js, 404.html o src/landing.css
npm run dev     # lo mismo, en modo vigilancia
```

Para probar en local: `python3 -m http.server 8765` y abrí `http://localhost:8765/` y `http://localhost:8765/app/`.

Si cambiás archivos de la app, subí la versión de `CACHE` en `app/sw.js` (por ejemplo `inquietos-app-v4` → `v5`) para que los celulares tomen la versión nueva.

## Idioma y textos

- Castellano rioplatense con **voseo**: "elegí", "reservá", "mandanos". Nada de "tú" ni "usted".
- Se dice **"tutores"**, nunca "dueños".
- Textos cortos, en lenguaje común, en minúscula normal (no TODO EN MAYÚSCULAS). Los botones dicen lo que hacen ("Publicar", "Elegir fechas y reservar"), y el mensaje de confirmación usa la misma palabra ("Publicado").
- Los errores explican qué pasó y cómo se arregla, sin pedir disculpas.
- Contenido del negocio que no se puede perder:
  - Él es **educador canino** y da clases.
  - La **visita de adaptación es obligatoria** para todos los perros, aunque hayan ido a otra guardería. Cuesta medio día y vale si se hace hasta 30 días antes del ingreso.
  - Es **obligatorio traer** alimento, correa y libreta sanitaria. Las vacunas obligatorias incluyen la **tos de las perreras**.

## Diseño

- **Colores del logo**, siempre: azul `#1d4fa6`, celeste `#13a6cb`, pelotita roja `#e3262b` como único acento cálido. Los tokens están en `src/landing.css` (`--c-*`) y `app/styles.css`. No cambies la paleta.
- Modo claro y oscuro, con botón de sol y luna. Todo color nuevo necesita su versión oscura.
- Tipografía: Archivo (títulos anchos), Onest (texto). La mono (Plex Mono) solo para números o el ticket de presupuesto, no para etiquetas.
- **No usar**:
  - etiquetas en mayúsculas encima de los títulos (eyebrows/kickers);
  - textos de varias partes separados con " · " inventados por diseño;
  - flechas en todos los botones;
  - baldosas de íconos apiladas sobre cada título;
  - tarjetas dentro de tarjetas;
  - franjas de color al costado;
  - degradés de adorno;
  - brillos de color en sombras;
  - emojis como íconos.
- **Movimiento:** una sola animación de entrada en la portada. Nada en bucle infinito. Curvas de salida suaves (`cubic-bezier(.16, 1, .3, 1)`), sin rebotes salvo la pelotita. Respetar `prefers-reduced-motion`.
- **Mínimos de calidad:**
  - contraste de 4.5:1 en el texto (3:1 en títulos grandes);
  - letra de 12 px o más;
  - botones y zonas táctiles de 44 px o más;
  - foco visible con teclado;
  - nada que se salga del ancho en celulares de 360 px;
  - `width` y `height` en las imágenes.
- La app se usa con una mano en el celular. Las acciones principales van grandes y abajo, y el botón "atrás" del celular tiene que funcionar (se usa `pushState`).

## Antes de dar algo por terminado

1. `npm run build` si tocaste estilos de la web.
2. Revisá en 360, 390, 768 y 1280 px, en modo claro y oscuro, sin errores en la consola.
3. Probá los flujos principales:
   - web: calculadora, calendario de disponibilidad, botón "Elegir fechas y reservar" que abre `app/#cliente` con todo cargado;
   - app: armar un presupuesto, generar la imagen, cambiar su estado, agenda, ajustes y publicar.
4. Lighthouse: accesibilidad, buenas prácticas y SEO en 100 en la web; rendimiento de 85 o más en celular.
5. Traé `main` y uní antes de subir (ver la regla 1).
