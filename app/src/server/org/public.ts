import { asc, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { seedOrganization } from "@/server/auth/on-signup";

/**
 * Org de los canales públicos (web-chat, wa-sim). Esta instancia es
 * mono-tenant: hay una sola organización (Colsubsidio). Si aún no existe
 * ninguna, se siembra sin dueño (el primer registro en el admin la adopta,
 * ver `onUserCreated`). Un advisory lock evita que dos mensajes simultáneos
 * en instancia vacía creen dos orgs.
 */
let cachedOrgId: string | null = null;

export async function getPublicOrgId(): Promise<string> {
  if (cachedOrgId) return cachedOrgId;
  const db = getDb();

  const first = await firstOrgId();
  if (first) return (cachedOrgId = first);

  const orgId = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(874201)`);
    const rows = await tx
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .orderBy(asc(schema.organization.createdAt))
      .limit(1);
    if (rows[0]) return rows[0].id;
    return seedOrganization(tx);
  });
  return (cachedOrgId = orgId);
}

async function firstOrgId(): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .orderBy(asc(schema.organization.createdAt))
    .limit(1);
  return rows[0]?.id ?? null;
}
