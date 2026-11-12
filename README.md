# Inquietos Caninos · Presupuestos y recibos

App web que se instala en el celular (PWA) para armar **presupuestos y recibos en imagen PNG** de estadías, guardería y paseos, y para mandarles a los clientes un **link** donde cargan ellos mismos los datos de su perro.

No necesita servidor, base de datos ni cuentas: todo funciona en el navegador y, una vez instalada, también sin internet.

## Qué hace

**Para vos**
- **Ajustes cargados una sola vez** (quedan guardados en tu celular): WhatsApp, alias/CBU, horario habitual, servicios con precio por día o por noche, extras (baño, medicación, traslado…), formas de pago con descuento (efectivo −10%), descuento por estadía larga, seña y condiciones.
- **Formulario corto**: dueño/a, perro/s, servicio y fechas en un **calendario**: tocás el día que lo traen y el día que lo retiran. Si algún día del medio no viene, lo tocás y se descuenta. Con un botón sacás los fines de semana.
- La dirección aparece sola cuando marcás el extra de traslado.
- Calcula días, descuentos, el **total por cada forma de pago** y la **reserva**.
- Genera la imagen: **Presupuesto**, o **Recibo** si cargaste una seña ya cobrada. La podés compartir directo a WhatsApp o guardar.
- Numeración automática e **historial** para volver a ver o corregir.

**Para tu cliente** (pestaña Link)
- Le mandás un link con tus precios ya cargados. Completa los datos de su perro y las fechas, ve el presupuesto en imagen y te lo manda a tu WhatsApp con un botón.
- Cada link guarda los precios del día en que lo creaste.

## Logo

Subí el logo como **`icons/logo.png`** (PNG, ideal con fondo transparente o blanco):
https://github.com/0ariell/WebGuarderiaCanina/upload/main/icons

Apenas está, la app y los recibos lo usan en lugar del nombre escrito.

## Publicarla gratis (GitHub Pages)

1. Entrá a https://github.com/0ariell/WebGuarderiaCanina/settings/pages
2. En **Build and deployment → Source** elegí **Deploy from a branch**.
3. En **Branch** elegí `main` y carpeta `/ (root)` → **Save**.
4. En 1–2 minutos queda online en **https://0ariell.github.io/WebGuarderiaCanina/**

Cada cambio que se suba a `main` se publica solo.

## Instalarla en el celular

- **Android (Chrome):** abrí la dirección → botón **📲 Instalar** arriba a la derecha, o menú ⋮ → *Agregar a la pantalla principal / Instalar app*.
- **iPhone (Safari):** abrí la dirección → botón Compartir → *Agregar a inicio*.

## Primer uso

1. Entrá a **⚙️ Ajustes** y cargá tu nombre, WhatsApp (con código de país, ej. `5491155555555`), alias/CBU y revisá precios y condiciones. Se guarda automáticamente.
2. Volvé a **🧾 Recibo**, completá los datos y tocá **Generar recibo**.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | Pantallas y formulario |
| `styles.css` | Diseño (modo claro/oscuro, pensado para celular) |
| `app.js` | Cálculos, dibujo del recibo PNG, link del cliente, historial y ajustes |
| `sw.js` | Funcionamiento sin internet |
| `manifest.webmanifest`, `icons/` | Instalación como app |

Para probarla en la compu: `python3 -m http.server` en esta carpeta y abrir `http://localhost:8000`.
