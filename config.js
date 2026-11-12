/*
 * ============================================================
 *  INQUIETOS CANINOS · DATOS DEL NEGOCIO
 *  Este es el único archivo que hace falta editar.
 *  Lo usan la página web (landing) y la app de presupuestos.
 *  Cambiá los textos entre comillas y guardá.
 * ============================================================
 */
window.INQUIETOS = {
  negocio: 'Inquietos Caninos',

  // Contacto. WhatsApp con código de país, sin espacios ni signos: 5491155555555
  whatsapp: '',
  instagram: '',            // usuario sin @, por ejemplo: inquietoscaninos
  zona: 'Buenos Aires',     // barrio o zona donde trabajás
  direccion: '',            // opcional: dirección exacta
  mapa: '',                 // opcional: link de Google Maps
  horario: 'Todos los días, de 9 a 18 h',
  responsable: '',          // tu nombre (sale en los recibos)

  // Datos para transferir la seña (salen en los presupuestos)
  alias: '',
  cbu: '',
  titular: '',
  banco: '',

  // Horario habitual de ingreso y retiro
  horaIn: '09:00',
  horaOut: '18:00',

  // ---------------- PRECIOS ----------------
  // unidad: 'dia' cuenta días (ingreso y retiro incluidos) · 'noche' cuenta noches
  mostrarPrecios: true,     // false para ocultar precios en la página web
  servicios: [
    {
      nombre: 'Estadía', precio: 70000, unidad: 'dia', icono: 'casa',
      bajada: 'Se queda con nosotros los días que necesites, con rutina, paseos y su lugar para dormir.',
      incluye: ['Paseos diarios', 'Comidas en su horario', 'Fotos y videos por WhatsApp', 'Su cama y sus cosas de siempre'],
    },
    {
      nombre: 'Guardería de día', precio: 25000, unidad: 'dia', icono: 'sol',
      bajada: 'Lo dejás a la mañana y lo buscás cansado y feliz. Ideal para los días de oficina.',
      incluye: ['Juego en grupo reducido', 'Descanso supervisado', 'Ingreso 9 h · retiro 18 h'],
    },
    {
      nombre: 'Paseo', precio: 8000, unidad: 'dia', icono: 'correa',
      bajada: 'Salidas para gastar energía, olfatear y socializar, con buscada y entrega en tu casa.',
      incluye: ['Grupos chicos y compatibles', 'Te avisamos al salir y al volver'],
    },
  ],
  extras: [
    { nombre: 'Baño', precio: 15000, unidad: 'unico' },
    { nombre: 'Administración de medicación', precio: 2000, unidad: 'dia' },
    { nombre: 'Traslado (búsqueda y entrega)', precio: 10000, unidad: 'unico' },
  ],
  // descuento en %: un número negativo es recargo
  pagos: [
    { nombre: 'Transferencia', descuento: 0 },
    { nombre: 'Efectivo', descuento: 10 },
  ],
  descEstadia: [            // descuento sobre el servicio a partir de X días
    { desde: 15, pct: 5 },
    { desde: 30, pct: 10 },
  ],
  descPerroAdicional: 0,    // % de descuento para el segundo perro en adelante
  seniaPct: 30,             // seña para reservar, en %
  validez: 7,               // días de validez del presupuesto
  condiciones: [
    'Los días festivos (Noche buena, Navidad/ Fin de año y Año Nuevo) la tarifa es doble.',
    'La reserva de la estadía se realiza con una seña del 30%.',
    'El valor de la estadía puede modificarse al momento del ingreso, de acuerdo con las actualizaciones por inflación.',
    'Al ingresar tu/s cuatro patas, se descontará del total vigente el importe abonado previamente como reserva.',
    'En caso de querer realizar la reserva, los datos para la transferencia figuran en este presupuesto.',
  ],

  // ---------------- PÁGINA WEB ----------------
  // Cómo cuidan. Editá, sacá o agregá los que quieras.
  forma: [
    { titulo: 'Grupos chicos', texto: 'Pocos perros a la vez y compatibles entre sí. Así cada uno tiene atención de verdad.' },
    { titulo: 'Rutina como en casa', texto: 'Respetamos sus horarios de comida, paseo y descanso para que no extrañe.' },
    { titulo: 'Educación en positivo', texto: 'Nada de retos ni castigos. Premios, paciencia y mucho juego.' },
    { titulo: 'Te mandamos fotos', texto: 'Durante la estadía te contamos cómo está, con fotos y videos por WhatsApp.' },
    { titulo: 'Cada perro es distinto', texto: 'Antes de la primera vez charlamos de su carácter, miedos y mañas.' },
    { titulo: 'Seguridad primero', texto: 'Pedimos vacunas al día y tenemos a mano el contacto de tu veterinario.' },
  ],

  // Fotos: subí las imágenes a la carpeta "fotos" del repositorio y escribí acá sus nombres.
  // Ejemplo: fotos: ['fotos/tilo.jpg', 'fotos/plaza.jpg'],
  fotos: [],

  // Opiniones reales de clientes (si está vacío, la sección no aparece).
  // Ejemplo: { texto: 'Tilo vuelve feliz cada vez.', nombre: 'Laura', perro: 'Tilo' },
  opiniones: [],

  preguntas: [
    { p: '¿Cómo reservo?', r: 'Armás el presupuesto en esta página eligiendo las fechas, nos lo mandás por WhatsApp y confirmás con una seña del 30%. El resto se abona al ingreso.' },
    { p: '¿Qué tengo que llevar?', r: 'Su alimento, la correa, la libreta de vacunas y, si querés, su cama o un juguete que le guste. Si toma medicación, traela con las indicaciones.' },
    { p: '¿Qué vacunas piden?', r: 'Séxtuple y antirrábica al día, y desparasitación reciente. Nos importa la salud de tu perro y la de los demás.' },
    { p: '¿Se puede pagar en efectivo?', r: 'Sí. En efectivo tenés un 10% de descuento. También podés pagar por transferencia.' },
    { p: '¿Y si mi perro nunca se quedó afuera de casa?', r: 'Es muy común. Podemos hacer una primera visita o un día de guardería antes de la estadía para que se vaya acostumbrando.' },
    { p: '¿Los feriados cuestan lo mismo?', r: 'Noche buena, Navidad, Fin de año y Año Nuevo tienen tarifa doble. El resto del año, el precio de siempre.' },
  ],
};
