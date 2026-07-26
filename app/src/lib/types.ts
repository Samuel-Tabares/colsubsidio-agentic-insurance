/** DTOs que viajan por la API interna (lado cliente). */

export type ConversationDto = {
  id: string;
  contact: { id: string; name: string; phone: string };
  channel: "whatsapp" | "web";
  stageName: string | null;
  aiEnabled: boolean;
  handoffAt: string | null;
  handoffReason: string | null;
  lastInboundAt: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  windowOpen: boolean;
  windowRemainingMs: number;
  preview: string | null;
};

export type MessageDto = {
  id: string;
  conversationId: string;
  direction: "in" | "out";
  type: string;
  text: string | null;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  aiGenerated: boolean;
  createdAt: string;
};

export type TemplateDto = {
  id: string;
  name: string;
  language: string;
  category: string;
  body: string;
  status: "draft" | "pending" | "approved" | "rejected";
  rejectionReason: string | null;
};

export type StageDto = {
  id: string;
  name: string;
  position: number;
  kind: "open" | "won" | "lost";
};

/**
 * Un dato que la persona contó en la conversación (mascota, dependientes,
 * trabajo). Lo extrae el cerebro turno a turno; NO viene de la base de
 * afiliados, y por eso se muestra aparte: es la prueba de que se le escuchó.
 */
export type PerfilHecho = {
  id: string;
  etiqueta: string;
  valor: string;
  icono?: string;
};

/**
 * Perfil del afiliado (Colsubsidio). Vive en `contact.perfilCrudo` (jsonb) y lo
 * llena el cerebro de Jhon vía RAG; el admin lo muestra en solo lectura. Todos
 * los campos son opcionales: un prospecto recién llegado aún no tiene perfil.
 *
 * Dos fuentes conviven acá: los campos planos salen de la base de afiliados (la
 * semilla), `hechos` sale de lo que la persona dice en vivo. La semilla es la
 * base, los hechos son lo que la actualiza.
 */
export type Perfil = {
  edad?: number;
  ciudad?: string;
  categoria?: string;
  grupoFamiliar?: string;
  seguroInteres?: string;
  hechos?: PerfilHecho[];
};

/** Familia puntuada en el ranking en vivo (mismo shape que `CerebroRankItem`). */
export type AnalisisRankItem = {
  familia: string;
  nombre: string;
  aseguradora?: string;
  match: number;
  blurb?: string;
  prima_mensual?: number;
};

/** El "hacia dónde va el cliente" que guarda el cerebro en `contact.analisis`. */
export type Analisis = {
  resumen?: string;
  familia?: string;
  ranking?: AnalisisRankItem[];
  [key: string]: unknown;
};

export type ContactDto = {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  archivedAt: string | null;
  perfil: Perfil | null;
  analisis: Analisis | null;
  analisisResumen: string | null;
};

/** Fila enriquecida para la vista Contactos (lista tipo CRM). */
export type ContactRowDto = ContactDto & {
  stageName: string | null;
  stageKind: "open" | "won" | "lost" | null;
  seguro: string | null;
  canal: "whatsapp" | "web" | null;
  ultimaInteraccion: string | null;
};
