import { eq, inArray } from "drizzle-orm";
import type { getDb } from "@/lib/db";
import { schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import type { Analisis, Perfil } from "@/lib/types";

/**
 * Negocio de demostración "Colsubsidio Seguros" (FR-075).
 * Idempotente: borra los datos demo previos de la organización (scoped por
 * los identificadores demo) y reinserta. Los perfiles y el análisis de IA
 * imitan lo que el cerebro (Jhon) llenaría vía RAG, para que Dashboard,
 * Contactos y Bandeja se vean coherentes ante el jurado. El KB queda lleno
 * EXCEPTO exclusiones y reclamaciones — hueco INTENCIONAL para que el
 * Laboratorio encuentre algo real en la primera corrida.
 *
 * Las etapas usan los nombres REALES del funnel (`lib/funnel.ts`), no labels
 * sueltos: `Prospecto · Análisis · Cotización / negociación · Cierre ganado ·
 * En suscripción · Póliza emitida · Cierre perdido`.
 */

type Db = ReturnType<typeof getDb>;

const HOURS = 60 * 60 * 1000;

type DemoContact = {
  /** id opaco del cliente: celular en WhatsApp, id generado en web. */
  phone: string;
  name: string;
  channel: "whatsapp" | "web";
  notes?: string;
  /** Nombre EXACTO de una etapa del funnel real. */
  stage: string;
  perfil: Perfil;
  analisis: Analisis;
  presupuesto?: number;
  thread: { dir: "in" | "out"; text: string; hoursAgo: number; ai?: boolean }[];
};

const DEMO_CONTACTS: DemoContact[] = [
  {
    phone: "573001112201",
    name: "María Fernanda Rojas",
    channel: "whatsapp",
    stage: "Cotización / negociación",
    notes: "Cabeza de hogar con dos hijos menores; le preocupa el precio.",
    perfil: {
      edad: 38,
      ciudad: "Bogotá",
      categoria: "B",
      grupoFamiliar: "Cónyuge y 2 hijos (8 y 12 años)",
      seguroInteres: "Seguro de Vida Familiar",
    },
    analisis: {
      familia: "Vida",
      resumen:
        "Cabeza de hogar con dos hijos menores dependientes: prioriza proteger el ingreso familiar. Sensible al precio.",
      ranking: [
        { familia: "Vida", nombre: "Vida Familiar Protegida", aseguradora: "Seguros Bolívar", match: 92, blurb: "Cubre a los dos hijos menores.", prima_mensual: 58000 },
        { familia: "Salud", nombre: "Salud Complementario", aseguradora: "Colsanitas", match: 74, blurb: "Hijos en edad escolar, alto uso probable.", prima_mensual: 96000 },
      ],
    },
    thread: [
      { dir: "out", text: "¡Hola María Fernanda! Soy Asegura, tu asesora virtual de Colsubsidio. ¿Te gustaría revisar opciones de protección para tu familia?", hoursAgo: 5, ai: true },
      { dir: "in", text: "Hola, sí me interesa pero me preocupa el precio", hoursAgo: 4.8 },
      { dir: "out", text: "Entiendo. Tengo un plan familiar desde $58.000 mensuales que cubre a tus dos hijos. ¿Te lo comparto?", hoursAgo: 4.7, ai: true },
      { dir: "in", text: "Sí por favor, pero necesito algo más económico", hoursAgo: 3 },
    ],
  },
  {
    phone: "web_a1c2movil",
    name: "Andrés Felipe Gutiérrez",
    channel: "web",
    stage: "Cotización / negociación",
    presupuesto: 80000,
    perfil: {
      edad: 29,
      ciudad: "Medellín",
      categoria: "A",
      grupoFamiliar: "Soltero",
      seguroInteres: "Seguro de Movilidad",
    },
    analisis: {
      familia: "Movilidad",
      resumen:
        "Perfil joven urbano que se mueve en bicicleta: busca cobertura por robo y accidente en trayectos diarios.",
      ranking: [
        { familia: "Movilidad", nombre: "Movilidad Bici", aseguradora: "SURA", match: 88, blurb: "Cobertura por robo y accidente.", prima_mensual: 32000 },
        { familia: "Accidentes", nombre: "Accidentes Personales", aseguradora: "Seguros del Estado", match: 70, blurb: "Complementa los trayectos diarios.", prima_mensual: 21000 },
      ],
    },
    thread: [
      { dir: "in", text: "Quiero un seguro para mi bici", hoursAgo: 0.6 },
      { dir: "out", text: "¡Perfecto Andrés! Tengo el plan Movilidad Colsubsidio con cobertura por robo y accidente. ¿Te muestro los detalles?", hoursAgo: 0.5, ai: true },
      { dir: "in", text: "Sí", hoursAgo: 0.4 },
    ],
  },
  {
    phone: "573001112203",
    name: "Luz Ángela Ramírez",
    channel: "whatsapp",
    stage: "Cierre ganado",
    notes: "Convive con su mamá adulta mayor; alta prioridad de cobertura médica.",
    perfil: {
      edad: 54,
      ciudad: "Cali",
      categoria: "C",
      grupoFamiliar: "Vive con su mamá adulta mayor",
      seguroInteres: "Salud Adulto Mayor",
    },
    analisis: {
      familia: "Salud",
      resumen:
        "Convive con su mamá de 78 años: prioridad alta de cobertura médica domiciliaria y medicamentos.",
      ranking: [
        { familia: "Salud", nombre: "Salud Adulto Mayor", aseguradora: "Colsanitas", match: 95, blurb: "Consulta domiciliaria y medicamentos.", prima_mensual: 120000 },
      ],
    },
    thread: [
      { dir: "in", text: "Necesito algo para mi mamá que ya tiene 78", hoursAgo: 3 },
      { dir: "out", text: "Con gusto Luz Ángela. Nuestro plan Adulto Mayor cubre consulta domiciliaria y medicamentos.", hoursAgo: 2.9, ai: true },
      { dir: "in", text: "Perfecto, lo tomo", hoursAgo: 2 },
    ],
  },
  {
    phone: "web_b7edu4321",
    name: "Carlos Julio Peñaloza",
    channel: "web",
    stage: "Cotización / negociación",
    notes: "Comparando opciones: protección familiar vs. educación de la hija.",
    perfil: {
      edad: 45,
      ciudad: "Barranquilla",
      categoria: "B",
      grupoFamiliar: "Esposa y 1 hija universitaria",
      seguroInteres: "Vida + Educación",
    },
    analisis: {
      familia: "Vida",
      resumen:
        "Proveedor principal del hogar con hija en primer semestre: interesa combinar protección de vida y continuidad educativa.",
      ranking: [
        { familia: "Vida", nombre: "Vida Proveedor", aseguradora: "Seguros Bolívar", match: 86, blurb: "Proveedor principal del hogar.", prima_mensual: 64000 },
        { familia: "Educación", nombre: "Renta Educativa", aseguradora: "SURA", match: 80, blurb: "Hija en primer semestre universitario.", prima_mensual: 71000 },
      ],
    },
    thread: [
      { dir: "in", text: "Estoy viendo qué seguro me conviene", hoursAgo: 0.8 },
      { dir: "out", text: "Cuéntame Carlos, ¿te interesa más protección para tu familia o para los estudios de tu hija?", hoursAgo: 0.75, ai: true },
      { dir: "in", text: "Los dos", hoursAgo: 0.6 },
    ],
  },
  {
    phone: "573001112205",
    name: "Diana Marcela Sánchez",
    channel: "whatsapp",
    stage: "Análisis",
    perfil: {
      edad: 33,
      ciudad: "Bogotá",
      categoria: "A",
      grupoFamiliar: "Pareja sin hijos",
      seguroInteres: "Seguro de Mascotas",
    },
    analisis: {
      familia: "Mascotas",
      resumen:
        "Tiene dos perros y alta afinidad emocional: dispuesta a cubrir urgencias veterinarias.",
      ranking: [
        { familia: "Mascotas", nombre: "Mascotas Colsubsidio", aseguradora: "SURA", match: 90, blurb: "Urgencias veterinarias para dos perros.", prima_mensual: 44000 },
      ],
    },
    thread: [
      { dir: "in", text: "Tengo dos perritos, ¿hay seguro para ellos?", hoursAgo: 1 },
      { dir: "out", text: "¡Claro Diana! Colsubsidio Mascotas cubre urgencias veterinarias. ¿Quieres cotizar para los dos?", hoursAgo: 0.95, ai: true },
    ],
  },
  {
    phone: "573001112206",
    name: "Jorge Iván Cárdenas",
    channel: "whatsapp",
    stage: "Póliza emitida",
    notes: "Pensionado; prioridad en tranquilidad familiar.",
    perfil: {
      edad: 61,
      ciudad: "Bucaramanga",
      categoria: "C",
      grupoFamiliar: "Pensionado, esposa",
      seguroInteres: "Exequial Familiar",
    },
    analisis: {
      familia: "Exequial",
      resumen:
        "Perfil pensionado que busca tranquilidad familiar: encaja con plan exequial de prima baja.",
      ranking: [
        { familia: "Exequial", nombre: "Exequial Familiar", aseguradora: "Los Olivos", match: 93, blurb: "Cobertura para la pareja desde $22.000.", prima_mensual: 22000 },
      ],
    },
    thread: [
      { dir: "in", text: "Buenas, me interesa el exequial", hoursAgo: 26 },
      { dir: "out", text: "Con gusto Jorge Iván, te comparto planes desde $22.000 mensuales.", hoursAgo: 25.9, ai: true },
      { dir: "in", text: "Perfecto, quedo asegurado entonces", hoursAgo: 24 },
    ],
  },
  {
    phone: "web_c9prosp01",
    name: "Paola Andrea Villegas",
    channel: "web",
    stage: "Prospecto",
    perfil: {
      edad: 27,
      ciudad: "Pereira",
      categoria: "A",
      grupoFamiliar: "Soltera, vive sola",
      seguroInteres: "Accidentes Personales",
    },
    analisis: {
      familia: "Accidentes Personales",
      resumen:
        "Perfil joven independiente: cobertura básica de accidentes personales recomendable como primer seguro.",
      ranking: [
        { familia: "Accidentes Personales", nombre: "Accidentes Personales", aseguradora: "Seguros del Estado", match: 68, blurb: "Cobertura base para independientes.", prima_mensual: 19000 },
      ],
    },
    thread: [
      { dir: "out", text: "¡Hola Paola! Soy Asegura de Colsubsidio. ¿Te gustaría explorar opciones de protección personal?", hoursAgo: 0.05, ai: true },
      { dir: "in", text: "Hola, cuéntame", hoursAgo: 0.03 },
    ],
  },
  {
    phone: "573001112208",
    name: "Héctor Manuel Ospina",
    channel: "whatsapp",
    stage: "Cierre perdido",
    notes: "Perfil idóneo, pero manifestó no tener presupuesto ahora.",
    perfil: {
      edad: 49,
      ciudad: "Cartagena",
      categoria: "B",
      grupoFamiliar: "Esposa y 3 hijos",
      seguroInteres: "Vida Familiar",
    },
    analisis: {
      familia: "Vida",
      resumen:
        "Perfil idóneo para Vida Familiar por 3 hijos dependientes, pero sin presupuesto disponible en este momento.",
      ranking: [
        { familia: "Vida", nombre: "Vida Familiar Protegida", aseguradora: "Seguros Bolívar", match: 84, blurb: "Tres hijos dependientes.", prima_mensual: 72000 },
      ],
    },
    thread: [
      { dir: "out", text: "Hola Héctor, ¿te comparto la propuesta ajustada?", hoursAgo: 74 },
      { dir: "in", text: "Gracias pero por ahora no puedo", hoursAgo: 72 },
    ],
  },
  {
    phone: "web_d3subs987",
    name: "Sandra Milena Torres",
    channel: "web",
    stage: "En suscripción",
    notes: "Madre cabeza de hogar; ya aceptó, completando suscripción.",
    perfil: {
      edad: 41,
      ciudad: "Bogotá",
      categoria: "B",
      grupoFamiliar: "Madre soltera, 1 hijo (6 años)",
      seguroInteres: "Salud + Educación",
    },
    analisis: {
      familia: "Salud",
      resumen:
        "Madre cabeza de hogar con hijo en primaria: prioridad de cobertura médica y continuidad escolar.",
      ranking: [
        { familia: "Salud", nombre: "Salud Complementario", aseguradora: "Colsanitas", match: 89, blurb: "Cobertura médica para el hijo.", prima_mensual: 88000 },
        { familia: "Educación", nombre: "Renta Educativa", aseguradora: "SURA", match: 78, blurb: "Continuidad escolar en primaria.", prima_mensual: 60000 },
      ],
    },
    thread: [
      { dir: "in", text: "Ya acepté, ¿cómo sigo?", hoursAgo: 5 },
      { dir: "out", text: "¡Excelente Sandra! Un asesor te acompañará para completar tu suscripción.", hoursAgo: 4.9, ai: true },
    ],
  },
  {
    phone: "573001112210",
    name: "Ricardo Alberto Mejía",
    channel: "whatsapp",
    stage: "Cotización / negociación",
    notes: "Recién es padre; escaló pidiendo hablar con un asesor.",
    perfil: {
      edad: 36,
      ciudad: "Medellín",
      categoria: "A",
      grupoFamiliar: "Pareja, 1 bebé",
      seguroInteres: "Vida + Salud Infantil",
    },
    analisis: {
      familia: "Vida",
      resumen:
        "Recién es padre de un bebé de 4 meses: prioridad de protección familiar y salud infantil.",
      ranking: [
        { familia: "Vida", nombre: "Vida Proveedor", aseguradora: "Seguros Bolívar", match: 87, blurb: "Recién es padre.", prima_mensual: 55000 },
        { familia: "Salud", nombre: "Salud Infantil", aseguradora: "Colsanitas", match: 82, blurb: "Bebé de 4 meses, alto uso esperado.", prima_mensual: 74000 },
      ],
    },
    thread: [
      { dir: "in", text: "Necesito hablar con alguien, tengo dudas específicas", hoursAgo: 0.4 },
      { dir: "out", text: "Claro Ricardo, te acompaño con un asesor especializado en protección familiar.", hoursAgo: 0.35, ai: true },
    ],
  },
  {
    phone: "web_e5prosp22",
    name: "Camila Herrera",
    channel: "web",
    stage: "Prospecto",
    perfil: {
      edad: 24,
      ciudad: "Bogotá",
      categoria: "A",
      grupoFamiliar: "Vive con padres",
      seguroInteres: "—",
    },
    analisis: {
      resumen: "Apenas inicia la conversación; aún sin señal suficiente para recomendar.",
    },
    thread: [
      { dir: "out", text: "¡Hola Camila! Bienvenida a Colsubsidio Seguros. Soy Asegura, ¿en qué te ayudo hoy?", hoursAgo: 0.02, ai: true },
    ],
  },
];

const DEMO_KB: { kind: "qa" | "block"; question?: string; answer?: string; content?: string }[] = [
  {
    kind: "block",
    content:
      "Colsubsidio Seguros — Colsubsidio actúa como distribuidor de seguros de terceros (no es la aseguradora): conecta a cada afiliado con la póliza que mejor encaja con su perfil. Familias disponibles: Vida, Salud Complementario, Movilidad, Exequial, Mascotas, Accidentes Personales, Educación y Viajes. La atención es 100% autoguiada por el asistente Asegura, por WhatsApp o web.",
  },
  { kind: "qa", question: "¿Colsubsidio es la aseguradora?", answer: "No. Colsubsidio es distribuidor: te acompaña a elegir y contratar la póliza de aseguradoras aliadas (Seguros Bolívar, SURA, Colsanitas, entre otras). El respaldo del pago de siniestros es de la aseguradora." },
  { kind: "qa", question: "¿Cómo se paga la prima?", answer: "La prima mensual se descuenta según el plan elegido. Puedes pagarla con débito automático o con tu cuenta Colsubsidio; el valor exacto depende del perfil y las coberturas." },
  { kind: "qa", question: "¿Necesito ser afiliado a Colsubsidio?", answer: "Los planes están disponibles para afiliados. El asistente valida tu afiliación con tu documento antes de emitir la cotización final." },
  { kind: "qa", question: "¿Qué cubre el Seguro de Vida Familiar?", answer: "Ampara el fallecimiento del asegurado y, según el plan, incapacidad total y auxilio educativo para los hijos. La suma asegurada se ajusta al perfil del hogar." },
  { kind: "qa", question: "¿El plan de Movilidad cubre robo de bicicleta?", answer: "Sí: el plan Movilidad cubre robo y accidente en trayectos, con asistencia para el ciclista. Aplica para bicicletas y patinetas registradas." },
  { kind: "qa", question: "¿En cuánto tiempo queda activa la póliza?", answer: "Tras aceptar la cotización y validar tus datos, la póliza queda en suscripción y se emite en 24–48 horas hábiles. Recibes la carátula por el mismo canal." },
  { kind: "qa", question: "¿Puedo asegurar a mis padres o adultos mayores?", answer: "Sí: el plan Salud Adulto Mayor cubre consulta domiciliaria y medicamentos, y el Exequial Familiar protege al grupo familiar incluyendo adultos mayores." },
  // HUECO INTENCIONAL: nada sobre exclusiones ni reclamaciones/siniestros (lo encuentra el Laboratorio).
];

export async function seedDemo(
  db: Db,
  organizationId: string
): Promise<{ contacts: number; kbEntries: number }> {
  const demoPhones = DEMO_CONTACTS.map((c) => c.phone);

  // --- Idempotencia: limpiar datos demo previos (orden inverso de FKs) ---
  const prevContacts = await db
    .select({ id: schema.contact.id })
    .from(schema.contact)
    .where(inArray(schema.contact.phone, demoPhones));
  const prevIds = prevContacts.map((c) => c.id);
  if (prevIds.length > 0) {
    const prevConvs = await db
      .select({ id: schema.conversation.id })
      .from(schema.conversation)
      .where(inArray(schema.conversation.contactId, prevIds));
    const convIds = prevConvs.map((c) => c.id);
    if (convIds.length > 0) {
      await db
        .delete(schema.message)
        .where(inArray(schema.message.conversationId, convIds));
      await db
        .delete(schema.conversation)
        .where(inArray(schema.conversation.id, convIds));
    }
    await db.delete(schema.lead).where(inArray(schema.lead.contactId, prevIds));
    await db.delete(schema.contact).where(inArray(schema.contact.id, prevIds));
  }
  // KB y corridas demo previas
  await db
    .delete(schema.kbEntry)
    .where(eq(schema.kbEntry.organizationId, organizationId));
  await db
    .delete(schema.agentTestCase)
    .where(eq(schema.agentTestCase.organizationId, organizationId));
  await db
    .delete(schema.agentTestRun)
    .where(eq(schema.agentTestRun.organizationId, organizationId));

  // --- Etapas (por nombre) ---
  const stages = await db
    .select()
    .from(schema.pipelineStage)
    .where(eq(schema.pipelineStage.organizationId, organizationId));
  const stageByName = new Map(stages.map((s) => [s.name, s.id]));
  const fallbackStage = stages[0]?.id;
  if (!fallbackStage) throw new Error("La organización no tiene etapas");

  // --- Contactos + conversaciones + mensajes + leads ---
  const now = Date.now();
  let position = 0;
  for (const demo of DEMO_CONTACTS) {
    const contactId = newId("contact");
    await db.insert(schema.contact).values({
      id: contactId,
      organizationId,
      phone: demo.phone,
      name: demo.name,
      notes: demo.notes ?? null,
      perfilCrudo: demo.perfil,
      analisis: demo.analisis,
      analisisResumen: demo.analisis.resumen ?? null,
    });

    const lastInbound = demo.thread
      .filter((t) => t.dir === "in")
      .reduce((min, t) => Math.min(min, t.hoursAgo), Infinity);
    const lastMessage = demo.thread.reduce(
      (min, t) => Math.min(min, t.hoursAgo),
      Infinity
    );

    const conversationId = newId("conversation");
    await db.insert(schema.conversation).values({
      id: conversationId,
      organizationId,
      contactId,
      channel: demo.channel,
      presupuesto: demo.presupuesto ?? null,
      lastInboundAt: Number.isFinite(lastInbound)
        ? new Date(now - lastInbound * HOURS)
        : null,
      lastMessageAt: new Date(now - lastMessage * HOURS),
      unreadCount: demo.thread[demo.thread.length - 1]?.dir === "in" ? 1 : 0,
    });

    for (const msg of demo.thread) {
      const at = new Date(now - msg.hoursAgo * HOURS);
      await db.insert(schema.message).values({
        id: newId("message"),
        organizationId,
        conversationId,
        waMessageId: `wamid.demo.${newId("message")}`,
        direction: msg.dir,
        type: "text",
        text: msg.text,
        status: msg.dir === "in" ? "delivered" : "read",
        aiGenerated: msg.ai ?? false,
        waTimestamp: at,
        createdAt: at,
      });
    }

    await db.insert(schema.lead).values({
      id: newId("lead"),
      organizationId,
      contactId,
      stageId: stageByName.get(demo.stage) ?? fallbackStage,
      position: position++,
      lastActivityAt: new Date(now - lastMessage * HOURS),
    });
  }

  // --- Knowledge base (con el hueco intencional) ---
  for (const entry of DEMO_KB) {
    await db.insert(schema.kbEntry).values({
      id: newId("kbEntry"),
      organizationId,
      kind: entry.kind,
      question: entry.question ?? null,
      answer: entry.answer ?? null,
      content: entry.content ?? null,
    });
  }

  // --- Comportamiento del agente de la demo ---
  await db
    .update(schema.agentProfile)
    .set({
      name: "Asegura",
      tone: "Cercano y confiable, en lenguaje claro y sin jerga de pólizas. Tutea al cliente.",
      instructions:
        "Ayuda a cada afiliado a entender qué seguro necesita y a quedar asegurado sin asesor humano. Explica coberturas en palabras simples y justifica la recomendación con el perfil del cliente (edad, grupo familiar, hábitos). Da primas solo si están en el conocimiento. Recuerda que Colsubsidio es distribuidor, no la aseguradora. Nunca inventes coberturas ni exclusiones.",
      escalationRules:
        "Escala a un humano si el cliente lo pide explícitamente, si hay una reclamación/siniestro en curso, o si pregunta por exclusiones específicas que el conocimiento no cubre.",
      greeting:
        "¡Hola! Soy Asegura, tu asistente de Colsubsidio Seguros. Te ayudo a encontrar el seguro ideal para ti y tu familia 🛡️",
      updatedAt: new Date(),
    })
    .where(eq(schema.agentProfile.organizationId, organizationId));

  // --- Corrida de Laboratorio de ejemplo (guardada, con el hueco encontrado) ---
  const runId = newId("testRun");
  await db.insert(schema.agentTestRun).values({
    id: runId,
    organizationId,
    status: "done",
    score: 83,
    startedAt: new Date(now - 24 * HOURS),
    finishedAt: new Date(now - 24 * HOURS + 3 * 60 * 1000),
  });
  const exampleCases: {
    persona: string;
    veredicto: "verde" | "amarillo" | "rojo";
    hallazgos: unknown[];
    transcript: { role: string; text: string }[];
  }[] = [
    {
      persona: "comprador_decidido",
      veredicto: "verde",
      hallazgos: [],
      transcript: [
        { role: "cliente", text: "Quiero un seguro de vida para mi familia, ¿cómo lo tomo?" },
        { role: "agente", text: "¡Perfecto! Con dos hijos menores te recomiendo Vida Familiar desde $58.000 mensuales, que los cubre a ambos." },
        { role: "cliente", text: "Me convence, lo tomo. ¿Cómo pago?" },
        { role: "agente", text: "Validamos tu afiliación con tu documento y activamos el débito mensual. La póliza queda emitida en 24–48 horas." },
      ],
    },
    {
      persona: "pregunton_precios",
      veredicto: "verde",
      hallazgos: [],
      transcript: [
        { role: "cliente", text: "¿Cuánto cuesta el seguro de mascotas?" },
        { role: "agente", text: "El plan Mascotas cubre urgencias veterinarias; la prima depende del número de mascotas. ¿Cuántas quieres asegurar para darte el valor exacto?" },
      ],
    },
    {
      persona: "cliente_desconfiado",
      veredicto: "amarillo",
      hallazgos: [
        {
          tipo: "tono",
          evidencia:
            "El agente dio el dato correcto (Colsubsidio es distribuidor) pero algo seco ante la duda de respaldo; faltó reforzar confianza antes de continuar.",
        },
      ],
      transcript: [
        { role: "cliente", text: "¿Y esto sí lo respalda Colsubsidio de verdad?" },
        { role: "agente", text: "Colsubsidio es el distribuidor; la póliza la respalda la aseguradora aliada. Te comparto la ficha oficial." },
      ],
    },
    {
      persona: "fuera_de_kb",
      veredicto: "rojo",
      hallazgos: [
        {
          tipo: "fuera_de_kb",
          evidencia:
            "El cliente preguntó por exclusiones y cómo poner una reclamación, y el conocimiento no lo cubre.",
          sugerencia: {
            pregunta: "¿Qué exclusiones tiene la póliza y cómo presento una reclamación?",
            respuesta:
              "Cada póliza detalla sus exclusiones en la carátula; para una reclamación se radica con el documento y el soporte del siniestro ante la aseguradora, que responde en los plazos de ley.",
          },
        },
      ],
      transcript: [
        { role: "cliente", text: "¿Qué exclusiones tiene y cómo hago una reclamación si pasa algo?" },
        { role: "agente", text: "Déjame confirmar ese detalle con el equipo y te respondo en un momento." },
      ],
    },
    {
      persona: "pide_humano",
      veredicto: "verde",
      hallazgos: [],
      transcript: [
        { role: "cliente", text: "Prefiero que me atienda una persona, quiero hablar con un asesor" },
        { role: "agente", text: "(handoff: la conversación pasó a atención humana)" },
      ],
    },
    {
      persona: "errores_modismos",
      veredicto: "verde",
      hallazgos: [],
      transcript: [
        { role: "cliente", text: "ola, tienen seguro pa la moto?" },
        { role: "agente", text: "¡Claro! El plan Movilidad cubre robo y accidente. ¿Es para moto o bicicleta?" },
      ],
    },
  ];
  for (const c of exampleCases) {
    await db.insert(schema.agentTestCase).values({
      id: newId("testCase"),
      organizationId,
      runId,
      persona: c.persona,
      status: "done",
      veredicto: c.veredicto,
      hallazgos: c.hallazgos,
      transcript: c.transcript,
    });
  }

  return { contacts: DEMO_CONTACTS.length, kbEntries: DEMO_KB.length };
}

/** true si la organización aún no tiene datos de dominio (para el botón). */
export async function isDomainEmpty(
  db: Db,
  organizationId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: schema.contact.id })
    .from(schema.contact)
    .where(eq(schema.contact.organizationId, organizationId))
    .limit(1);
  return rows.length === 0;
}
