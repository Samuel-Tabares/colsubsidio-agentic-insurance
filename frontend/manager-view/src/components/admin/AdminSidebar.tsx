import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, MessagesSquare, ShieldCheck } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "CRM Clientes", url: "/admin", icon: LayoutGrid, exact: true },
  { title: "Registros de chats", url: "/admin/registros", icon: MessagesSquare, exact: false },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md"
            style={{ backgroundColor: "var(--brand-yellow)" }}
          >
            <ShieldCheck className="h-5 w-5" style={{ color: "var(--brand-blue)" }} />
          </div>
          <div className="flex flex-col leading-tight">
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--brand-blue)" }}
            >
              Colsubsidio
            </span>
            <span className="text-xs text-muted-foreground">Panel gerencial</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.exact
                  ? pathname === item.url
                  : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
