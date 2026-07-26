import { withAuth } from "@/lib/api";
import { getDashboardData } from "@/server/dashboard";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const data = await getDashboardData(session.organizationId);
  return Response.json(data);
});
