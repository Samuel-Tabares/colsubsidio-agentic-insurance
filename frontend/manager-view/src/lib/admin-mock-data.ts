export type Channel = "WhatsApp" | "Web";

export type Phase =
  | "Prospecto"
  | "Contactado"
  | "Necesidad identificada"
  | "Oferta presentada"
  | "En negociación"
  | "Cierre ganado"
  | "Cierre perdido"
  | "En suscripción"
  | "Póliza emitida";

export const PHASE_ORDER: Phase[] = [
  "Prospecto",
  "Contactado",
  "Necesidad identificada",
  "Oferta presentada",
  "En negociación",
  "Cierre ganado",
  "En suscripción",
  "Póliza emitida",
];

export const MANUAL_PHASES: Phase[] = ["En suscripción", "Póliza emitida"];

export type NegotiationSubState =
  | "Comparando opciones"
  | "Objeción de precio"
  | "Objeción de confianza"
  | "Esperando decisión"
  | "Escalado a asesor";

export const SUBSTATE_COLORS: Record<NegotiationSubState, string> = {
  "Comparando opciones": "bg-blue-100 text-blue-800 border-blue-200",
  "Objeción de precio": "bg-amber-100 text-amber-900 border-amber-200",
  "Objeción de confianza": "bg-rose-100 text-rose-800 border-rose-200",
  "Esperando decisión": "bg-violet-100 text-violet-800 border-violet-200",
  "Escalado a asesor": "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export interface ChatMessage {
  from: "asistente" | "cliente";
  text: string;
  time: string;
  channel: Channel;
}

export interface Client {
  id: string;
  nombre: string;
  edad: number;
  ciudad: string;
  categoria: "A" | "B" | "C";
  grupoFamiliar: string;
  fase: Phase;
  subEstado?: NegotiationSubState;
  seguro: string;
  canal: Channel;
  ultimaInteraccion: string;
  analisisIA: { seguro: string; razon: string }[];
  chat: ChatMessage[];
}

export const CLIENTS: Client[] = [
  {
    id: "c1",
    nombre: "María Fernanda Rojas",
    edad: 38,
    ciudad: "Bogotá",
    categoria: "B",
    grupoFamiliar: "Cónyuge y 2 hijos (8 y 12 años)",
    fase: "En negociación",
    subEstado: "Objeción de precio",
    seguro: "Seguro de Vida Familiar",
    canal: "WhatsApp",
    ultimaInteraccion: "hace 12 min",
    analisisIA: [
      { seguro: "Vida Familiar", razon: "Es cabeza de hogar con dos hijos menores dependientes." },
      { seguro: "Salud Complementario", razon: "Grupo familiar con hijos en edad escolar, alto uso probable." },
    ],
    chat: [
      { from: "asistente", text: "¡Hola María Fernanda! Soy tu asesora virtual de Colsubsidio. ¿Te gustaría revisar opciones de protección para tu familia?", time: "10:02", channel: "WhatsApp" },
      { from: "cliente", text: "Hola, sí me interesa pero me preocupa el precio", time: "10:05", channel: "WhatsApp" },
      { from: "asistente", text: "Entiendo. Tengo un plan familiar desde $58.000 mensuales que cubre a tus dos hijos. ¿Te lo comparto?", time: "10:06", channel: "WhatsApp" },
      { from: "cliente", text: "Sí por favor, pero necesito algo más económico", time: "10:12", channel: "WhatsApp" },
    ],
  },
  {
    id: "c2",
    nombre: "Andrés Felipe Gutiérrez",
    edad: 29,
    ciudad: "Medellín",
    categoria: "A",
    grupoFamiliar: "Soltero",
    fase: "Oferta presentada",
    seguro: "Seguro de Movilidad",
    canal: "Web",
    ultimaInteraccion: "hace 34 min",
    analisisIA: [
      { seguro: "Movilidad / Bici", razon: "Perfil joven urbano, usa bicicleta según sus respuestas." },
      { seguro: "Accidentes Personales", razon: "Complementa cobertura para trayectos diarios." },
    ],
    chat: [
      { from: "cliente", text: "Quiero un seguro para mi bici", time: "09:20", channel: "Web" },
      { from: "asistente", text: "¡Perfecto Andrés! Tengo el plan Movilidad Colsubsidio con cobertura por robo y accidente. ¿Te muestro los detalles?", time: "09:21", channel: "Web" },
      { from: "cliente", text: "Sí", time: "09:22", channel: "Web" },
    ],
  },
  {
    id: "c3",
    nombre: "Luz Ángela Ramírez",
    edad: 54,
    ciudad: "Cali",
    categoria: "C",
    grupoFamiliar: "Vive con su mamá adulta mayor",
    fase: "Cierre ganado",
    seguro: "Salud Adulto Mayor",
    canal: "WhatsApp",
    ultimaInteraccion: "hace 2 h",
    analisisIA: [
      { seguro: "Salud Adulto Mayor", razon: "Convive con mamá de 78 años, alta prioridad de cobertura médica." },
    ],
    chat: [
      { from: "cliente", text: "Necesito algo para mi mamá que ya tiene 78", time: "08:00", channel: "WhatsApp" },
      { from: "asistente", text: "Con gusto Luz Ángela. Nuestro plan Adulto Mayor cubre consulta domiciliaria y medicamentos.", time: "08:01", channel: "WhatsApp" },
      { from: "cliente", text: "Perfecto, lo tomo", time: "08:30", channel: "WhatsApp" },
    ],
  },
  {
    id: "c4",
    nombre: "Carlos Julio Peñaloza",
    edad: 45,
    ciudad: "Barranquilla",
    categoria: "B",
    grupoFamiliar: "Esposa y 1 hija universitaria",
    fase: "En negociación",
    subEstado: "Comparando opciones",
    seguro: "Vida + Educación",
    canal: "Web",
    ultimaInteraccion: "hace 45 min",
    analisisIA: [
      { seguro: "Vida", razon: "Proveedor principal del hogar." },
      { seguro: "Educación", razon: "Hija en primer semestre universitario." },
    ],
    chat: [
      { from: "cliente", text: "Estoy viendo qué seguro me conviene", time: "11:00", channel: "Web" },
      { from: "asistente", text: "Cuéntame Carlos, ¿te interesa más protección para tu familia o para los estudios de tu hija?", time: "11:01", channel: "Web" },
      { from: "cliente", text: "Los dos", time: "11:15", channel: "Web" },
    ],
  },
  {
    id: "c5",
    nombre: "Diana Marcela Sánchez",
    edad: 33,
    ciudad: "Bogotá",
    categoria: "A",
    grupoFamiliar: "Pareja sin hijos",
    fase: "Necesidad identificada",
    seguro: "Mascotas",
    canal: "WhatsApp",
    ultimaInteraccion: "hace 1 h",
    analisisIA: [
      { seguro: "Mascotas", razon: "Tiene 2 perros, alta afinidad emocional y disposición a cubrir salud animal." },
    ],
    chat: [
      { from: "cliente", text: "Tengo dos perritos, hay seguro para ellos?", time: "10:30", channel: "WhatsApp" },
      { from: "asistente", text: "¡Claro Diana! Colsubsidio Mascotas cubre urgencias veterinarias. ¿Quieres cotizar para los dos?", time: "10:31", channel: "WhatsApp" },
    ],
  },
  {
    id: "c6",
    nombre: "Jorge Iván Cárdenas",
    edad: 61,
    ciudad: "Bucaramanga",
    categoria: "C",
    grupoFamiliar: "Pensionado, esposa",
    fase: "Póliza emitida",
    seguro: "Exequial Familiar",
    canal: "WhatsApp",
    ultimaInteraccion: "hace 1 día",
    analisisIA: [
      { seguro: "Exequial", razon: "Perfil pensionado, prioridad en tranquilidad familiar." },
    ],
    chat: [
      { from: "cliente", text: "Buenas, me interesa el exequial", time: "Ayer 14:00", channel: "WhatsApp" },
      { from: "asistente", text: "Con gusto Jorge Iván, te comparto planes desde $22.000 mensuales.", time: "Ayer 14:02", channel: "WhatsApp" },
    ],
  },
  {
    id: "c7",
    nombre: "Paola Andrea Villegas",
    edad: 27,
    ciudad: "Pereira",
    categoria: "A",
    grupoFamiliar: "Soltera, vive sola",
    fase: "Contactado",
    seguro: "—",
    canal: "Web",
    ultimaInteraccion: "hace 3 min",
    analisisIA: [
      { seguro: "Accidentes Personales", razon: "Perfil joven independiente, cobertura básica recomendable." },
    ],
    chat: [
      { from: "asistente", text: "¡Hola Paola! ¿Te gustaría explorar opciones de protección personal?", time: "11:45", channel: "Web" },
      { from: "cliente", text: "Hola, cuéntame", time: "11:47", channel: "Web" },
    ],
  },
  {
    id: "c8",
    nombre: "Héctor Manuel Ospina",
    edad: 49,
    ciudad: "Cartagena",
    categoria: "B",
    grupoFamiliar: "Esposa y 3 hijos",
    fase: "Cierre perdido",
    seguro: "—",
    canal: "WhatsApp",
    ultimaInteraccion: "hace 3 días",
    analisisIA: [
      { seguro: "Vida Familiar", razon: "Perfil idóneo, pero manifestó no tener presupuesto ahora." },
    ],
    chat: [
      { from: "asistente", text: "Hola Héctor, ¿te comparto la propuesta ajustada?", time: "Lun 09:00", channel: "WhatsApp" },
      { from: "cliente", text: "Gracias pero por ahora no puedo", time: "Lun 09:30", channel: "WhatsApp" },
    ],
  },
  {
    id: "c9",
    nombre: "Sandra Milena Torres",
    edad: 41,
    ciudad: "Bogotá",
    categoria: "B",
    grupoFamiliar: "Madre soltera, 1 hijo (6 años)",
    fase: "En suscripción",
    seguro: "Salud + Educación",
    canal: "Web",
    ultimaInteraccion: "hace 5 h",
    analisisIA: [
      { seguro: "Salud", razon: "Madre cabeza de hogar, prioridad de cobertura médica para el hijo." },
      { seguro: "Educación", razon: "Hijo en primaria, protección de continuidad escolar." },
    ],
    chat: [
      { from: "cliente", text: "Ya acepté, cómo sigo?", time: "07:00", channel: "Web" },
      { from: "asistente", text: "¡Excelente Sandra! Un asesor te contactará para completar tu suscripción.", time: "07:01", channel: "Web" },
    ],
  },
  {
    id: "c10",
    nombre: "Ricardo Alberto Mejía",
    edad: 36,
    ciudad: "Medellín",
    categoria: "A",
    grupoFamiliar: "Pareja, 1 bebé",
    fase: "En negociación",
    subEstado: "Escalado a asesor",
    seguro: "Vida + Salud Infantil",
    canal: "WhatsApp",
    ultimaInteraccion: "hace 20 min",
    analisisIA: [
      { seguro: "Vida", razon: "Recién es padre, prioridad de protección familiar." },
      { seguro: "Salud Infantil", razon: "Bebé de 4 meses, alto uso esperado." },
    ],
    chat: [
      { from: "cliente", text: "Necesito hablar con alguien, tengo dudas específicas", time: "11:30", channel: "WhatsApp" },
      { from: "asistente", text: "Claro Ricardo, te escalo con un asesor especializado en protección familiar.", time: "11:31", channel: "WhatsApp" },
    ],
  },
  {
    id: "c11",
    nombre: "Natalia Restrepo",
    edad: 31,
    ciudad: "Manizales",
    categoria: "A",
    grupoFamiliar: "Soltera, vive con hermana",
    fase: "En negociación",
    subEstado: "Esperando decisión",
    seguro: "Viajes Internacional",
    canal: "Web",
    ultimaInteraccion: "hace 4 h",
    analisisIA: [
      { seguro: "Viajes", razon: "Mencionó viaje próximo a Europa." },
    ],
    chat: [
      { from: "cliente", text: "Viajo a España en 2 semanas", time: "07:30", channel: "Web" },
      { from: "asistente", text: "Perfecto Natalia, el plan Europa cubre hasta 60.000€. ¿Lo tomas?", time: "07:31", channel: "Web" },
      { from: "cliente", text: "Déjame pensarlo", time: "07:45", channel: "Web" },
    ],
  },
  {
    id: "c12",
    nombre: "Freddy Alexander Molina",
    edad: 52,
    ciudad: "Cali",
    categoria: "C",
    grupoFamiliar: "Esposa",
    fase: "En negociación",
    subEstado: "Objeción de confianza",
    seguro: "Vida",
    canal: "WhatsApp",
    ultimaInteraccion: "hace 1 h",
    analisisIA: [
      { seguro: "Vida", razon: "Edad y perfil compatible, pero manifiesta dudas sobre respaldo." },
    ],
    chat: [
      { from: "cliente", text: "Y esto sí lo respalda Colsubsidio de verdad?", time: "10:00", channel: "WhatsApp" },
      { from: "asistente", text: "Sí Freddy, Colsubsidio Seguros es respaldada por más de 65 años de experiencia. Te comparto la ficha oficial.", time: "10:01", channel: "WhatsApp" },
    ],
  },
  {
    id: "c13",
    nombre: "Camila Herrera",
    edad: 24,
    ciudad: "Bogotá",
    categoria: "A",
    grupoFamiliar: "Vive con padres",
    fase: "Prospecto",
    seguro: "—",
    canal: "Web",
    ultimaInteraccion: "hace 1 min",
    analisisIA: [],
    chat: [
      { from: "asistente", text: "¡Hola Camila! Bienvenida a Colsubsidio Seguros.", time: "11:59", channel: "Web" },
    ],
  },
];

export const INSURANCE_SALES = [
  { name: "Vida Familiar", value: 42 },
  { name: "Salud Complementario", value: 31 },
  { name: "Movilidad", value: 18 },
  { name: "Exequial", value: 24 },
  { name: "Mascotas", value: 12 },
  { name: "Viajes", value: 9 },
];
