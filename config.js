/*
 * ============================================================
 *  INQUIETOS CANINOS · DATOS DEL NEGOCIO
 *  Publicado desde la app el 16/11/26, 2:43 p. m..
 *  Para cambiarlo: app → Ajustes → hacé tus cambios → Publicar.
 *  También se puede editar a mano. Qué significa cada campo: README.md
 * ============================================================
 */
window.INQUIETOS = {
  "negocio": "Inquietos Caninos",
  "rubros": "Paseos · Guardería · Estadías · Educación",
  "zona": "Buenos Aires",
  "direccion": "",
  "mapa": "",
  "horario": "Todos los días, de 9 a 18 h",
  "responsable": "Juan Ignacio",
  "alias": "inquietosxroma",
  "cbu": "",
  "titular": "Juan Ignacio Rivero",
  "banco": "",
  "horaIn": "09:00",
  "horaOut": "18:00",
  "aviso": {
    "texto": "Verano y fiestas se llenan rápido: reservá con tiempo",
    "link": "#disponibilidad"
  },
  "mostrarPrecios": true,
  "servicios": [
    {
      "nombre": "Estadía",
      "categoria": "Cuidado",
      "precio": 70000,
      "cobro": "dia",
      "unidad": "día",
      "unidadPlural": "días",
      "cantidadMin": 1,
      "cantidadMax": 60,
      "cantidadDefecto": 5,
      "porPerro": true,
      "ocupaCupo": true,
      "adaptacion": true,
      "recargoFinde": 0,
      "destacado": true,
      "icono": "casa",
      "descCantidad": [
        {
          "desde": 15,
          "pct": 5
        },
        {
          "desde": 30,
          "pct": 10
        }
      ],
      "bajada": "Se queda con nosotros los días que necesites, con rutina, paseos y su lugar para dormir.",
      "incluye": [
        "Paseos diarios",
        "Comidas en su horario",
        "Fotos y videos por WhatsApp",
        "Su cama y sus cosas de siempre"
      ]
    },
    {
      "nombre": "Guardería de día",
      "categoria": "Cuidado",
      "precio": 25000,
      "cobro": "dia",
      "unidad": "día",
      "unidadPlural": "días",
      "cantidadMin": 1,
      "cantidadMax": 60,
      "cantidadDefecto": 5,
      "porPerro": true,
      "ocupaCupo": true,
      "adaptacion": true,
      "recargoFinde": 0,
      "icono": "sol",
      "descCantidad": [
        {
          "desde": 15,
          "pct": 5
        },
        {
          "desde": 30,
          "pct": 10
        }
      ],
      "bajada": "Lo dejás a la mañana y lo buscás cansado y feliz. Ideal para los días de oficina.",
      "incluye": [
        "Juego en grupo reducido",
        "Descanso supervisado",
        "Ingreso 9 h · retiro 18 h"
      ]
    },
    {
      "nombre": "Paseo",
      "categoria": "Cuidado",
      "precio": 8000,
      "cobro": "dia",
      "unidad": "paseo",
      "unidadPlural": "paseos",
      "cantidadMin": 1,
      "cantidadMax": 60,
      "cantidadDefecto": 5,
      "porPerro": true,
      "ocupaCupo": false,
      "adaptacion": false,
      "recargoFinde": 0,
      "icono": "correa",
      "descCantidad": [
        {
          "desde": 15,
          "pct": 5
        },
        {
          "desde": 30,
          "pct": 10
        }
      ],
      "bajada": "Salidas para gastar energía, olfatear y socializar, con buscada y entrega en tu casa.",
      "incluye": [
        "Grupos chicos y compatibles",
        "Te avisamos al salir y al volver"
      ]
    },
    {
      "nombre": "Clases de educación",
      "categoria": "Educación",
      "precio": 20000,
      "cobro": "cantidad",
      "unidad": "clase",
      "unidadPlural": "clases",
      "cantidadMin": 1,
      "cantidadMax": 20,
      "cantidadDefecto": 4,
      "porPerro": true,
      "ocupaCupo": false,
      "adaptacion": false,
      "recargoFinde": 0,
      "icono": "educacion",
      "descCantidad": [
        {
          "desde": 4,
          "pct": 10
        },
        {
          "desde": 8,
          "pct": 15
        }
      ],
      "bajada": "Clases de educación canina en positivo para que la convivencia y los paseos sean más fáciles.",
      "incluye": [
        "Educación en positivo, sin castigos",
        "Plan según lo que necesite tu perro",
        "Ejercicios para practicar entre clases"
      ]
    }
  ],
  "extras": [
    {
      "nombre": "Baño",
      "precio": 15000,
      "cobro": "perro"
    },
    {
      "nombre": "Administración de medicación",
      "precio": 2000,
      "cobro": "perroDia"
    },
    {
      "nombre": "Traslado (búsqueda y entrega)",
      "precio": 10000,
      "cobro": "unico"
    }
  ],
  "pagos": [
    {
      "nombre": "Transferencia",
      "descuento": 0
    },
    {
      "nombre": "Efectivo",
      "descuento": 10
    }
  ],
  "tamanos": [],
  "descPerroAdicional": 0,
  "seniaPct": 30,
  "validez": 7,
  "redondeo": 0,
  "adaptacion": {
    "activa": true,
    "nombre": "Visita de adaptación",
    "pct": 50,
    "fijo": 0,
    "porPerro": true,
    "validezDias": 30,
    "texto": "Es obligatoria para todos los perros, aunque ya hayan ido a otra guardería. Cuesta medio día y conviene hacerla lo antes posible: vale si la hacés hasta 30 días antes del ingreso."
  },
  "fechasEspeciales": [
    {
      "nombre": "Nochebuena y Navidad",
      "desde": "12-24",
      "hasta": "12-25",
      "recargo": 100
    },
    {
      "nombre": "Fin de año y Año Nuevo",
      "desde": "12-31",
      "hasta": "01-01",
      "recargo": 100
    }
  ],
  "cupos": {
    "activo": true,
    "capacidad": 5,
    "avisoQuedan": 2
  },
  "textos": {
    "calcTitulo": "¿Cuánto sale? Calculalo acá",
    "calcBajada": "Elegí el servicio, la cantidad y cuántos perros son. El precio se actualiza solo.",
    "calcBoton": "Elegir fechas y reservar",
    "calcBotonCantidad": "Reservar",
    "calcNota": "Precio orientativo. Con las fechas exactas armás el presupuesto final en un minuto.",
    "primeraVez": "Es su primera vez con nosotros",
    "dispTitulo": "Fechas disponibles",
    "dispBajada": "Trabajamos con cupos reducidos para que cada perro tenga atención de verdad. Mirá qué días quedan lugares."
  },
  "condiciones": [
    "Los días festivos (Nochebuena, Navidad, Fin de año y Año Nuevo) la tarifa es doble.",
    "La visita de adaptación es obligatoria para todos los perros, aunque ya hayan ido a otra guardería. Cuesta medio día y vale si se hace hasta 30 días antes del ingreso.",
    "Es obligatorio traer su alimento, correa y la libreta sanitaria con las vacunas al día: séxtuple, antirrábica y tos de las perreras.",
    "La reserva de la estadía se realiza con una seña del 30%.",
    "El valor de la estadía puede modificarse al momento del ingreso, de acuerdo con las actualizaciones por inflación.",
    "Al ingresar tu/s cuatro patas, se descontará del total vigente el importe abonado previamente como reserva.",
    "En caso de querer realizar la reserva, los datos para la transferencia figuran en este presupuesto."
  ],
  "educador": {
    "titulo": "También soy educador canino",
    "texto": "Además de cuidarlo, lo puedo educar. Doy clases de educación canina en positivo para resolver tirones de correa, llamado, ansiedad y convivencia en casa. Los packs de varias clases tienen descuento.",
    "puntos": [
      "Clases individuales a medida",
      "Sin castigos ni retos",
      "Packs con descuento"
    ]
  },
  "requisitos": {
    "llevar": [
      "Su alimento para todos los días de la estadía",
      "Correa y collar o pechera",
      "Libreta sanitaria con las vacunas al día",
      "Su medicación con las indicaciones por escrito, si toma alguna"
    ],
    "vacunas": [
      "Séxtuple",
      "Antirrábica",
      "Tos de las perreras (Bordetella)",
      "Desparasitación interna y externa al día"
    ]
  },
  "forma": [
    {
      "titulo": "Grupos chicos",
      "texto": "Cupos reducidos y perros compatibles entre sí. Así cada uno tiene atención de verdad."
    },
    {
      "titulo": "Rutina como en casa",
      "texto": "Respetamos sus horarios de comida, paseo y descanso para que no extrañe."
    },
    {
      "titulo": "Educación en positivo",
      "texto": "Nada de retos ni castigos. Premios, paciencia y mucho juego."
    },
    {
      "titulo": "Te mandamos fotos",
      "texto": "Durante la estadía te contamos cómo está, con fotos y videos por WhatsApp."
    },
    {
      "titulo": "Adaptación para todos",
      "texto": "Antes del primer día hacemos una visita de adaptación, aunque ya haya ido a otra guardería."
    },
    {
      "titulo": "Seguridad primero",
      "texto": "Vacunas al día obligatorias, incluida la de tos de las perreras, y el contacto de tu veterinario a mano."
    }
  ],
  "fotos": [],
  "opiniones": [],
  "preguntas": [
    {
      "p": "¿Cómo reservo?",
      "r": "Mirá las fechas disponibles, armá el presupuesto eligiendo los días y mandánoslo por WhatsApp. Confirmás con una seña del 30% y el resto se abona al ingreso."
    },
    {
      "p": "¿Qué tengo que llevar?",
      "r": "Es obligatorio traer su alimento para todos los días, la correa con collar o pechera y la libreta sanitaria con las vacunas al día. Si toma medicación, también es obligatorio traerla con las indicaciones por escrito."
    },
    {
      "p": "¿Qué vacunas piden?",
      "r": "Séxtuple, antirrábica y tos de las perreras (Bordetella), todas al día, y la desparasitación interna y externa al día. Son obligatorias: nos importa la salud de tu perro y la de los demás."
    },
    {
      "p": "¿Es obligatoria la adaptación?",
      "r": "Sí, para todos los perros, aunque ya hayan ido a otra guardería. Es una visita que cuesta medio día. Conviene hacerla lo antes posible: vale si la hacés hasta 30 días antes del ingreso."
    },
    {
      "p": "¿Dan clases de educación?",
      "r": "Sí, soy educador canino y doy clases en positivo. Podés calcular el precio en esta página: los packs de varias clases tienen descuento."
    },
    {
      "p": "¿Se puede pagar en efectivo?",
      "r": "Sí. En efectivo tenés un 10% de descuento. También podés pagar por transferencia."
    },
    {
      "p": "¿Los feriados cuestan lo mismo?",
      "r": "Nochebuena, Navidad, Fin de año y Año Nuevo tienen tarifa doble. El resto del año, el precio de siempre."
    }
  ],
  "whatsapp": "5491166437118",
  "instagram": "inquietos.caninos"
};
