# Inquietos Caninos

Página web y app de presupuestos para Inquietos Caninos: paseos, guardería de día, estadías y clases de educación canina.

- **Página web:** `https://0ariell.github.io/WebGuarderiaCanina/`
- **App (para vos):** `https://0ariell.github.io/WebGuarderiaCanina/app/`
- **Formulario para tutores:** `https://0ariell.github.io/WebGuarderiaCanina/app/#cliente`

## Cómo se usa día a día

1. **Armás presupuestos** en la app (pestaña Nuevo): tutor, perro, servicio y fechas o cantidad de clases. Sale la imagen para mandar por WhatsApp.
2. **Cuando te pagan la seña**, en Historial lo marcás como *Señado* o *Pagado*. Ese perro ocupa su lugar en la **Agenda** solo.
3. En **Agenda** podés sumar reservas a mano o cerrar días (vacaciones, feriados).
4. Tocás **Publicar** y en 1 o 2 minutos la web muestra tus precios y los días disponibles. Los tutores no pueden elegir días completos.

Los datos de los tutores **nunca se publican**. A la web solo llega cuántos lugares hay ocupados por día.

## Conectar la app con la web (una sola vez)

El botón **Publicar** guarda tus cambios en este repositorio. Para eso necesita una clave de GitHub:

1. Entrá a https://github.com/settings/personal-access-tokens/new
2. Nombre: `App Inquietos`. Vencimiento: el más largo que te deje.
3. **Repository access** → **Only select repositories** → elegí `WebGuarderiaCanina`.
4. **Permissions → Repository permissions → Contents** → **Read and write**.
5. **Generate token**, copiá la clave.
6. En la app: **Ajustes → Conexión con la web (GitHub)** → pegala → **Guardar y probar**.

La clave queda guardada solo en tu celular y solo sirve para este repositorio. Si la perdés o vence, creá otra igual.

## Cotizador: todo se configura desde la app

En **Ajustes** (o a mano en `config.js`):

**Cada servicio** (Servicios y precios):
- Nombre, **categoría** (agrupa la calculadora: Cuidado, Educación…), precio.
- **Cómo se cobra:** por día con fechas (ingreso y retiro incluidos), por noche con fechas, o **por cantidad** (clases, sesiones).
- **Unidad** en singular y plural (día/días, clase/clases, sesión/sesiones).
- Cantidad mínima, máxima y la que aparece de entrada.
- Si el precio es **por perro**, si **ocupa cupo**, si necesita **visita de adaptación**, si se **muestra en la web** y si va **destacado**.
- **Recargo de sábados y domingos** (%).
- **Descuentos por cantidad**, todos los escalones que quieras. Por ejemplo, 10% desde 4 clases y 15% desde 8.
- Descripción, qué incluye e ícono para la web. Se pueden subir, bajar, duplicar o borrar.

**Además:**
- **Extras** que se cobran una vez, por día, por perro o por perro y por día.
- **Formas de pago** con descuento o recargo.
- **Seña**, descuento desde el segundo perro, validez del presupuesto y **redondeo** de totales.
- **Recargo por tamaño.**
- **Visita de adaptación:** obligatoria para todos los perros nuevos, aunque hayan ido a otra guardería. Cuesta un % de un día del servicio (de fábrica, la mitad) o un monto fijo, por perro, y vale hasta X días antes del ingreso. En el presupuesto se puede destildar si el perro ya la hizo.
- **Fechas especiales** con recargo. `12-24` se repite todos los años y `2026-12-24` vale solo ese año. Si un día tiene varios recargos, se aplica el mayor.
- **Cupos** por día (en Agenda).
- **Textos de la calculadora** de la web: título, bajada, botones y notas.
- **Página web:** aviso destacado, texto de educación canina, requisitos obligatorios (qué traer y vacunas) y preguntas frecuentes.
- **Condiciones** que salen al pie de cada presupuesto.

La web y la app calculan con el mismo motor (`assets/cotizador.js`), así el precio siempre coincide.

## Fotos y opiniones

- **Fotos:** subilas a la carpeta `fotos/` (https://github.com/0ariell/WebGuarderiaCanina/upload/main/fotos) y anotá sus nombres en `fotos` dentro de `config.js`.
- **Opiniones:** en `opiniones` dentro de `config.js`. Solo opiniones reales. Si está vacío, la sección no aparece.

## Qué hay en la página

- Portada animada con el logo, aviso destacado y los rubros.
- Servicios con precio, unidad y descuentos por cantidad.
- **Educación canina**, con sus clases y packs.
- Cómo reservar, en cuatro pasos (incluye la visita de adaptación).
- **Calculadora en vivo:** categorías, servicio, cantidad, perros, primera vez (adaptación) y extras, con totales por forma de pago, seña y aviso de descuento. El botón abre la app con todo cargado.
- **Disponibilidad:** calendario con días con lugar, con pocos lugares y completos.
- **Requisitos obligatorios:** qué traer, vacunas (incluida la de tos de las perreras) y adaptación.
- Cómo lo cuidamos, fotos, opiniones, preguntas frecuentes y contacto.
- Modo claro y oscuro, WhatsApp en toda la página, imagen para compartir el link, datos para Google, página 404.

## Calidad (Lighthouse de Google)

| | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|
| Página en compu | 99 | 100 | 100 | 100 |
| Página en celular | 87* | 100 | 100 | 100 |
| App | 95 | 100 | 100 | no se indexa a propósito |

\* Simulando 4G lenta. Con buena conexión, el contenido principal aparece en menos de un segundo.

## Archivos

| Archivo | Para qué |
|---|---|
| `config.js` | Datos del negocio, precios y textos (lo escribe la app al publicar) |
| `disponibilidad.json` | Cupos ocupados y días cerrados (lo escribe la app al publicar) |
| `assets/cotizador.js` | Motor de cálculo compartido por la web y la app |
| `index.html`, `assets/landing.js`, `src/landing.css` | Página web |
| `app/` | App de presupuestos, agenda y ajustes |

## Tecnologías

- **Página:** HTML, Tailwind CSS 4, GSAP + ScrollTrigger y Lenis (copiados en `assets/vendor/`).
- **App:** HTML, CSS y JavaScript sin librerías, instalable (PWA) y con modo sin conexión.
- **Hosting:** GitHub Pages, gratis. No hay servidor ni base de datos: la app publica con la API de GitHub.

Para programadores, si cambiás clases de Tailwind en la página:

```bash
npm install
npm run build     # genera assets/landing.css
```

Si algún día usás un dominio propio, reemplazá `https://0ariell.github.io/WebGuarderiaCanina/` en `index.html`, `app/index.html`, `sitemap.xml` y `robots.txt`.

## Publicación (GitHub Pages)

Settings → Pages → **Deploy from a branch** → rama `main`, carpeta `/ (root)`.
