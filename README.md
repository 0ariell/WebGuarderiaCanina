# 🐾 Guardería Canina · Recibos y presupuestos

App web instalable en el celular (PWA) para armar **recibos/presupuestos en imagen PNG** de estadías, guardería diurna y paseos, y para mandarle a los clientes un **link** donde ellos mismos cargan los datos de su perro.

No necesita servidor, base de datos ni cuentas: todo funciona en el navegador y se puede usar sin internet una vez instalada.

## Qué hace

**Para vos (cuidador/paseador)**
- **Ajustes ya cargados** (se guardan en tu celular): nombre del negocio, WhatsApp, alias/CBU, horarios por defecto, servicios con precio por día o por noche, recargo por tamaño, extras (baño, medicación, traslado…), formas de pago con descuento (efectivo -10%, transferencia…), descuentos por estadía larga, descuento por perro adicional, % de seña y condiciones del recibo.
- **Formulario** con lo variable: dueño/a, teléfono, uno o varios perros (nombre, raza, edad, tamaño), servicio, fechas y horarios de ingreso/retiro, días de la semana que asiste, extras, descuento especial, seña ya abonada y notas.
- Cuenta sola los días o noches, aplica los descuentos y muestra el total por cada forma de pago (**Total transferencia / Total efectivo**) y la **reserva del 30%**.
- **🧾 Generar recibo** → vista previa → **Descargar PNG**, **Compartir imagen** (directo a WhatsApp) o mandar el resumen en texto por WhatsApp.
- Numeración automática (N° 0001, 0002…) e **historial** de los últimos 100 recibos para verlos o editarlos de nuevo.
- Exportar e importar los ajustes (respaldo o pasarlos a otro celular).

**Para tu cliente (pestaña 🔗 Link cliente)**
- Generás un link que ya trae tus precios y condiciones (opcionalmente también las fechas que hayas cargado).
- El cliente lo abre, completa los datos de su perro y la estadía y obtiene su **presupuesto en PNG** para descargar o compartir, con un botón para **enviártelo a tu WhatsApp**.
- Si cambiás los precios, generá un link nuevo: cada link guarda los precios del momento en que lo creaste.

## Publicarla gratis (GitHub Pages)

1. Subí estos archivos a la rama `main` del repositorio.
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. El workflow `.github/workflows/pages.yml` la publica sola en cada cambio. La dirección queda como
   `https://<tu-usuario>.github.io/<repositorio>/`.

(También sirve cualquier hosting estático: Netlify, Vercel, Cloudflare Pages… solo hay que subir la carpeta.)

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
