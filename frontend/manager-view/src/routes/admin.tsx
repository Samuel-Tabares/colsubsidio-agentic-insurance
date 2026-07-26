import { Outlet, createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel gerencial — Colsubsidio Seguros" },
      {
        name: "description",
        content:
          "Panel administrativo interno para supervisar clientes y conversaciones del asistente de seguros de Colsubsidio.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Panel gerencial — Colsubsidio Seguros" },
      {
        property: "og:description",
        content: "Herramienta interna del equipo Colsubsidio para supervisar la venta automatizada de seguros.",
      },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div style={{ backgroundColor: "var(--brand-cream)", fontFamily: "var(--font-sans)" }}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
          <div className="flex flex-1 flex-col">
            <header
              className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-white/80 px-4 backdrop-blur"
            >
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <span
                  className="h-6 w-1.5 rounded"
                  style={{ backgroundColor: "var(--brand-yellow)" }}
                />
                <h1
                  className="text-base font-semibold"
                  style={{ fontFamily: "var(--font-display)", color: "var(--brand-blue)" }}
                >
                  Colsubsidio Seguros · Panel gerencial
                </h1>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                Uso interno · No visible para el cliente
              </div>
            </header>
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
