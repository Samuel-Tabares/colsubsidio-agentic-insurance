import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { MessageCircle, Globe, Users, TrendingUp, Handshake } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  CLIENTS,
  INSURANCE_SALES,
  PHASE_ORDER,
  SUBSTATE_COLORS,
  type Client,
} from "@/lib/admin-mock-data";
import { ClientDetail } from "@/components/admin/ClientDetail";

export const Route = createFileRoute("/admin/")({
  component: CRMPage,
});

const chartConfig = {
  clientes: { label: "Clientes", color: "var(--brand-blue)" },
  ventas: { label: "Ventas", color: "var(--brand-yellow)" },
} satisfies ChartConfig;

function CRMPage() {
  const [selected, setSelected] = useState<Client | null>(null);

  const phaseData = useMemo(
    () =>
      PHASE_ORDER.map((p) => ({
        fase: p.length > 12 ? p.slice(0, 12) + "…" : p,
        full: p,
        clientes: CLIENTS.filter((c) => c.fase === p).length,
      })),
    [],
  );

  const salesData = useMemo(
    () => [...INSURANCE_SALES].sort((a, b) => b.value - a.value).map((s) => ({ name: s.name, ventas: s.value })),
    [],
  );

  const total = CLIENTS.length;
  const enNegociacion = CLIENTS.filter((c) => c.fase === "En negociación").length;
  const cerrados = CLIENTS.filter((c) =>
    ["Cierre ganado", "En suscripción", "Póliza emitida"].includes(c.fase),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--brand-blue)" }}
        >
          CRM de clientes
        </h2>
        <p className="text-sm text-muted-foreground">
          Estado comercial de cada persona que ha interactuado con el asistente de seguros.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Total de clientes"
          value={total.toString()}
          hint="En pipeline activo"
        />
        <MetricCard
          icon={<Handshake className="h-4 w-4" />}
          label="En negociación"
          value={enNegociacion.toString()}
          hint="Requieren seguimiento cercano"
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Cerrados / suscritos"
          value={cerrados.toString()}
          hint="Ganados + en emisión"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ fontFamily: "var(--font-display)" }}>
              Clientes por fase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={phaseData} margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="fase" tickLine={false} axisLine={false} fontSize={10} interval={0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""}
                    />
                  }
                />
                <Bar dataKey="clientes" fill="var(--brand-blue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ fontFamily: "var(--font-display)" }}>
              Seguros más vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={salesData} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={130} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="ventas" fill="var(--brand-yellow)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base" style={{ fontFamily: "var(--font-display)" }}>
            Todos los clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Fase actual</TableHead>
                <TableHead>Seguro</TableHead>
                <TableHead>Última interacción</TableHead>
                <TableHead>Canal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CLIENTS.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(c)}
                >
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: "color-mix(in oklab, var(--brand-blue) 10%, white)",
                          color: "var(--brand-blue)",
                        }}
                      >
                        {c.fase}
                      </Badge>
                      {c.subEstado && (
                        <span
                          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${SUBSTATE_COLORS[c.subEstado]}`}
                        >
                          {c.subEstado}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.seguro}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.ultimaInteraccion}
                  </TableCell>
                  <TableCell>
                    <ChannelBadge channel={c.canal} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
              Detalle del cliente
            </DialogTitle>
          </DialogHeader>
          {selected && <ClientDetail client={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="flex h-6 w-6 items-center justify-center rounded"
            style={{ backgroundColor: "var(--brand-yellow)", color: "var(--brand-blue)" }}
          >
            {icon}
          </span>
          {label}
        </div>
        <div
          className="mt-2 text-3xl font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--brand-blue)" }}
        >
          {value}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

export function ChannelBadge({ channel }: { channel: "WhatsApp" | "Web" }) {
  if (channel === "WhatsApp") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <MessageCircle className="h-3 w-3" />
        WhatsApp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
      <Globe className="h-3 w-3" />
      Web
    </span>
  );
}
