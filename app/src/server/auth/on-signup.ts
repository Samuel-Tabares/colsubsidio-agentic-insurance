import { count, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { FUNNEL_STAGES } from "@/lib/funnel";

/** Etapas sembradas del pipeline: el funnel de seguros de Colsubsidio (US2). */
const SEED_STAGES = FUNNEL_STAGES;

/**
 * Primer registro de la instancia: crea la organización, deja al usuario como
 * propietario y siembra pipeline + perfil del agente.
 *
 * Solo actúa si NO existe ninguna organización (las cuentas de equipo las crea
 * el propietario y reciben su membresía explícita). Un advisory lock evita que
 * dos registros simultáneos en instancia vacía creen dos organizaciones.
 */
export async function onUserCreated(userId: string, _userName: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    // Lock transaccional de "primer arranque" (clave arbitraria fija):
    // dos registros simultáneos en instancia vacía → solo uno crea la org.
    await tx.execute(sql`select pg_advisory_xact_lock(874201)`);

    const existing = await tx
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .limit(2);

    // Si ya hay UNA sola org (típicamente la sembrada sin dueño por los canales
    // públicos) y este usuario no tiene membresía, la adopta como owner. Con más
    // de una org, se respeta el flujo de equipos (no se crea ni adopta nada).
    if (existing.length === 1) {
      const orgId = existing[0]!.id;
      const [mem] = await tx
        .select({ n: count() })
        .from(schema.member)
        .where(eq(schema.member.userId, userId));
      if ((mem?.n ?? 0) === 0) {
        await tx.insert(schema.member).values({
          id: newId("organization"),
          organizationId: orgId,
          userId,
          role: "owner",
        });
      }
      return;
    }
    if (existing.length > 1) return;

    await seedOrganization(tx, userId);
  });
}

/**
 * Crea la organización Colsubsidio con el funnel de seguros y el agente
 * ENCENDIDO (esta instancia es el asesor automático: el agente activo es el
 * comportamiento por defecto, no una excepción). `ownerUserId` opcional: los
 * canales públicos siembran una org sin dueño y el primer registro la adopta.
 */
export async function seedOrganization(
  tx: TxOrDb,
  ownerUserId?: string
): Promise<string> {
  const orgId = newId("organization");
  await tx.insert(schema.organization).values({
    id: orgId,
    name: "Colsubsidio",
    slug: "colsubsidio",
  });
  if (ownerUserId) {
    await tx.insert(schema.member).values({
      id: newId("organization"),
      organizationId: orgId,
      userId: ownerUserId,
      role: "owner",
    });
  }
  await tx.insert(schema.pipelineStage).values(
    SEED_STAGES.map((s, i) => ({
      id: newId("stage"),
      organizationId: orgId,
      name: s.name,
      position: i,
      kind: s.kind,
    }))
  );
  await tx.insert(schema.agentProfile).values({
    id: newId("agentProfile"),
    organizationId: orgId,
    enabled: true,
    name: "Asegura",
  });
  return orgId;
}

type TxOrDb = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/** Organización activa de un usuario (su primera membresía). */
export async function resolveActiveOrganizationId(
  userId: string
): Promise<string | null> {
  return (await resolveMembership(userId))?.organizationId ?? null;
}

export async function resolveMembership(
  userId: string
): Promise<{ organizationId: string; role: string } | null> {
  const db = getDb();
  const rows = await db
    .select({
      organizationId: schema.member.organizationId,
      role: schema.member.role,
    })
    .from(schema.member)
    .where(eq(schema.member.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}
