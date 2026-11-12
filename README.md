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
