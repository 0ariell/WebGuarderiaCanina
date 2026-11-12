# Inquietos Caninos

Página web y app de presupuestos para Inquietos Caninos: paseos, guardería de día y estadías.

- **Página web (landing):** `https://0ariell.github.io/WebGuarderiaCanina/`
- **App de presupuestos (para vos):** `https://0ariell.github.io/WebGuarderiaCanina/app/`
- **Formulario para clientes:** `https://0ariell.github.io/WebGuarderiaCanina/app/#cliente`

## Cambiar datos, precios y textos

Todo está en un solo archivo: **`config.js`**. Se edita directo en GitHub:

1. Entrá a https://github.com/0ariell/WebGuarderiaCanina/edit/main/config.js
2. Cambiá lo que está entre comillas: WhatsApp, Instagram, zona, alias, precios, textos y preguntas.
3. Tocá **Commit changes**. En uno o dos minutos se actualizan la página y la app.

Si un valor lo cambiaste a mano desde Ajustes en la app, la app respeta tu cambio. Lo demás lo toma de `config.js`.

## Fotos y opiniones

- **Fotos:** subilas a la carpeta `fotos/` (https://github.com/0ariell/WebGuarderiaCanina/upload/main/fotos) y escribí sus nombres en `fotos` dentro de `config.js`.
- **Opiniones:** agregalas en `opiniones` dentro de `config.js`. Solo opiniones reales de clientes. Si la lista está vacía, la sección no aparece.

## Qué hay en la página

- Portada con el logo animado: la pelotita rebota.
- Servicios con precio y lo que incluye cada uno.
- Cómo reservar, en cuatro pasos.
- **Calculadora en vivo:** servicio, días y cantidad de perros, con los totales por forma de pago y la seña. El botón abre la app con todo cargado para elegir las fechas.
- Cómo lo cuidan, fotos, opiniones y preguntas frecuentes.
- Botones de WhatsApp en toda la página, modo claro y oscuro, y barra fija en el celular.

## Calidad (medida con Lighthouse de Google)

| | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|
| Página en compu | 100 | 100 | 100 | 100 |
| Página en celular | 87* | 100 | 100 | 100 |
| App | 95 | 100 | 100 | no se indexa a propósito |

\* Simulando 4G lenta. Con buena conexión, el contenido principal aparece en 0,2 s.

Incluye:
- Vista previa con imagen al compartir el link por WhatsApp o redes.
- Datos de negocio local para Google, mapa del sitio, `robots.txt` y página 404 propia.
- Navegación completa con teclado: salto al contenido y menú que retiene el foco.
- Contraste de colores legible y respeto por "reducir movimiento" del sistema.

Si algún día usás un dominio propio (por ejemplo `inquietoscaninos.com.ar`), hay que reemplazar
`https://0ariell.github.io/WebGuarderiaCanina/` por el dominio nuevo en `index.html`, `app/index.html`,
`sitemap.xml` y `robots.txt`.

## La app de presupuestos (`/app/`)

- Calendario de ingreso y retiro, varios perros, extras y descuentos.
- Presupuesto o recibo en imagen PNG, para compartir por WhatsApp.
- Link para clientes, historial y ajustes.
- Se instala en el celular y funciona sin internet.

## Tecnologías

- **Página:** HTML, **Tailwind CSS 4**, **GSAP + ScrollTrigger** (animaciones) y **Lenis** (scroll suave). Las librerías están copiadas en `assets/vendor/`, no dependen de servidores externos.
- **App:** HTML, CSS y JavaScript sin librerías, instalable (PWA).
- **Hosting:** GitHub Pages, gratis. No hay servidor ni base de datos.

### Para programadores

Los estilos de la página se compilan con Tailwind. Solo hace falta si cambiás clases en `index.html` o `assets/landing.js`:

```bash
npm install
npm run build     # genera assets/landing.css
npm run dev       # recompila al guardar
```

## Publicación (GitHub Pages)

Settings → Pages → **Deploy from a branch** → rama `main`, carpeta `/ (root)`.
