import type { CerebroRequest, CerebroResponse, CerebroMensaje } from "@/lib/cerebro/types";
import catalogo from "@/lib/fixtures/catalogo.json";

/**
 * Stub local del cerebro: un recorrido guionizado y DETERMINÍSTICO para que el
 * sistema corra de punta a punta HOY, sin el repo de Jhon. No es IA — avanza por
 * número de turno del cliente. Cuando exista el cerebro real, este archivo deja
 * de usarse (CEREBRO_MODE=external) sin tocar nada más.
 *
 * Recorrido (UX §4): llega → discovery (una pregunta por turno) → recomendación
 * con razón de dos patas → comparación → ajuste de cobertura → cierre con aviso
 * de que un asesor retoma.
 */

type Producto = (typeof catalogo)["productos"][number];

const DISCOVERY: string[] = [
  "Para recomendarte bien, cuéntame: ¿quién depende económicamente de ti hoy?",
  "Gracias por contarme. Y si no pudieras trabajar por un mes, ¿de qué vivirías?",
  "Entiendo. ¿Vives en casa propia o arrendada, y hay mascotas contigo?",
  "Última pregunta: ¿cada cuánto terminas pagando droguería o médico de tu bolsillo?",
];

const GREETING =
  "¡Hola! Soy Asegura, de Colsubsidio 👋 En un par de minutos te ayudo a encontrar el seguro que de verdad te sirve. Sin letra menuda y sin llamar a nadie.";

export function stubDecidirTurno(req: CerebroRequest): CerebroResponse {
  const turnos = req.historial.filter((m) => m.rol === "cliente").length;
  const texto = ultimoTexto(req);

  // Turno 1: saludo + primera pregunta de discovery.
  if (turnos <= 1) {
    return {
      mensajes: [{ tipo: "text", texto: GREETING }, { tipo: "text", texto: DISCOVERY[0]! }],
      fase: "Prospecto",
    };
  }
  // Turnos 2..4: siguientes preguntas del discovery.
  if (turnos >= 2 && turnos <= DISCOVERY.length) {
    return {
      mensajes: [{ tipo: "text", texto: DISCOVERY[turnos - 1]! }],
      fase: turnos >= 3 ? "Análisis" : undefined,
    };
  }
  // Turno 5: recomendación con razón de dos patas + análisis.
  if (turnos === DISCOVERY.length + 1) {
    const familia = elegirFamilia(req);
    const producto = productoDe(familia);
    return {
      mensajes: [
        {
          tipo: "text",
          texto:
            "Con lo que me contaste ya tengo una recomendación clara para ti 👇",
        },
        recomendacionCard(producto, req),
      ],
      fase: "Cotización / negociación",
      analisis: {
        resumen: `Perfil orientado a ${familia}. ${razonPerfil(familia)}`,
        familia,
      },
    };
  }
  // Turno 6: comparación (2-3 opciones, incluida otra aseguradora).
  if (turnos === DISCOVERY.length + 2) {
    return {
      mensajes: [
        { tipo: "text", texto: "Para que veas que no te escondo nada, mira otras opciones:" },
        comparacionCard(elegirFamilia(req)),
      ],
    };
  }
  // Turno 7: control de cobertura en vivo.
  if (turnos === DISCOVERY.length + 3) {
    const producto = productoDe(elegirFamilia(req));
    return {
      mensajes: [
        {
          tipo: "text",
          texto:
            "Puedes ajustar la cobertura y ver el precio moverse. Pagas menos si asumes un poco más.",
        },
        controlCoberturaCard(producto),
      ],
    };
  }
  // Turno 8+: cierre si acepta; si no, resuelve la duda con lenguaje simple.
  if (afirma(texto)) {
    const producto = productoDe(elegirFamilia(req));
    return {
      mensajes: [cierreCard(producto)],
      fase: "Cierre ganado",
      handoff: {
        motivo: "cierre",
        despedida:
          "¡Listo! Quedaste con tu protección elegida. Un asesor te contacta para finalizar los últimos detalles. 🙌",
      },
    };
  }
  return {
    mensajes: [
      {
        tipo: "text",
        texto:
          "Buena pregunta. Lo que te muestro sale del catálogo real de Colsubsidio, sin sorpresas. ¿Quieres que sigamos con tu protección o ajustamos algo?",
      },
    ],
  };
}

/* ----------------------------- tarjetas ----------------------------- */

function recomendacionCard(p: Producto, req: CerebroRequest): CerebroMensaje {
  return {
    tipo: "recomendacion",
    texto: `Te recomiendo ${p.nombre} de ${p.aseguradora}.`,
    payload: {
      producto_id: p.id,
      familia: p.familia,
      aseguradora: p.aseguradora,
      nombre: p.nombre,
      prima_mensual: p.prima_mensual,
      cubre: p.cubre,
      no_cubre: p.no_cubre,
      por_que: {
        por_tu_perfil: razonPerfil(p.familia),
        por_lo_que_me_contaste: razonConversacion(req),
      },
    },
  };
}

function comparacionCard(familia: string): CerebroMensaje {
  const opciones = catalogo.productos.filter((p) => p.familia === familia).slice(0, 3);
  const base = opciones.length >= 2 ? opciones : catalogo.productos.slice(0, 3);
  return {
    tipo: "comparacion",
    payload: {
      opciones: base.map((p) => ({
        producto_id: p.id,
        aseguradora: p.aseguradora,
        nombre: p.nombre,
        prima_mensual: p.prima_mensual,
        cubre: p.cubre,
        no_cubre: p.no_cubre,
      })),
    },
  };
}

function controlCoberturaCard(p: Producto): CerebroMensaje {
  const base = p.prima_mensual;
  return {
    tipo: "control_cobertura",
    payload: {
      producto_id: p.id,
      niveles: [
        { etiqueta: "Esencial", factor: 0.7, prima_mensual: Math.round(base * 0.7) },
        { etiqueta: "Recomendado", factor: 1.0, prima_mensual: base },
        { etiqueta: "Amplio", factor: 1.4, prima_mensual: Math.round(base * 1.4) },
      ],
      nota: "A menor prima asumes un poco más; a mayor prima, más te cubre el seguro.",
    },
  };
}

function cierreCard(p: Producto): CerebroMensaje {
  return {
    tipo: "cierre",
    texto: "Resumen de lo que quedó cubierto:",
    payload: {
      producto_id: p.id,
      nombre: p.nombre,
      aseguradora: p.aseguradora,
      prima_mensual: p.prima_mensual,
      cubre: p.cubre,
      no_cubre: p.no_cubre,
      aviso: "No hay pago ni firma aquí: un asesor de Colsubsidio retoma para finalizar.",
    },
  };
}

/* ----------------------------- lógica ----------------------------- */

function elegirFamilia(req: CerebroRequest): string {
  const t = req.historial
    .filter((m) => m.rol === "cliente")
    .map((m) => m.texto.toLowerCase())
    .join(" ");
  if (/(hij|esposa|esposo|mam|pap|depende|familia)/.test(t)) return "vida";
  if (/(independiente|freelance|por mi cuenta|no tengo empleo|sin empleo)/.test(t)) return "accidentes";
  if (/(arriend|arrend|casa|apartamento|hogar|mascota|perro|gato)/.test(t)) return "hogar";
  if (/(droguer|médic|medico|salud|enferm|remedio)/.test(t)) return "salud";
  return "salud";
}

function productoDe(familia: string): Producto {
  return (
    catalogo.productos.find((p) => p.familia === familia) ?? catalogo.productos[0]!
  );
}

function razonPerfil(familia: string): string {
  const m: Record<string, string> = {
    salud:
      "de cada 100 afiliados con tu perfil, cerca de 18 compran en droguería cada mes (dato ilustrativo).",
    vida: "los perfiles con dependientes son los que más protegen un ingreso familiar.",
    accidentes: "sin respaldo de empleador, un accidente te dejaría sin entrada de plata.",
    hogar: "usar servicios de vivienda es la señal de que proteger el hogar te aplica.",
    viajes: "tu consumo en viajes sugiere asistencia médica fuera de casa.",
  };
  return m[familia] ?? m.salud!;
}

function razonConversacion(req: CerebroRequest): string {
  const primera = req.historial.find((m) => m.rol === "cliente")?.texto?.trim();
  if (primera) return `me dijiste: "${recorta(primera, 90)}".`;
  return "por lo que me contaste en la conversación.";
}

function afirma(texto: string): boolean {
  return /(s[íi]\b|acepto|lo quiero|me sirve|dale|de acuerdo|contrat|listo|cerr)/i.test(
    texto
  );
}

function ultimoTexto(req: CerebroRequest): string {
  for (let i = req.historial.length - 1; i >= 0; i--) {
    if (req.historial[i]!.rol === "cliente") return req.historial[i]!.texto;
  }
  return "";
}

function recorta(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
