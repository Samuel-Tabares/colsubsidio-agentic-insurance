"use client";

import { useCallback, useEffect, useState } from "react";
import { Handshake, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEvents } from "@/components/use-events";

type DashboardData = {
  totals: { total: number; enNegociacion: number; cerrados: number };
  porFase: { name: string; count: number }[];
  segurosMasVendidos: { familia: string; count: number }[];
};

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/dashboard").catch(() => null);
    if (!res?.ok) return;
    setData((await res.json()) as DashboardData);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // El panel se mantiene vivo: cada entrante/movimiento de etapa lo refresca.
  useEvents({
    onMessageNew: () => void refetch(),
    onConversationUpdated: () => void refetch(),
    onReconnect: () => void refetch(),
  });

  const t = data?.totals;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b px-6 py-4">
        <h2 className="font-display text-2xl font-semibold text-brand-blue">
          Panel gerencial
        </h2>
        <p className="text-sm text-text-3">
          Estado comercial de cada persona que ha interactuado con Asegura, el
          asistente de seguros de Colsubsidio.
        </p>
      </header>

      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            label="Total de clientes"
            value={t?.total ?? 0}
            hint="En pipeline activo"
          />
          <MetricCard
            icon={<Handshake className="h-4 w-4" />}
            label="En negociación"
            value={t?.enNegociacion ?? 0}
            hint="Requieren seguimiento cercano"
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Cerrados / suscritos"
            value={t?.cerrados ?? 0}
            hint="Ganados + en emisión"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">
                Clientes por fase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                data={(data?.porFase ?? []).map((f) => ({
                  label: f.name,
                  value: f.count,
                }))}
                barClass="bg-brand-blue"
                empty="Carga los datos de demostración para ver el pipeline."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">
                Seguros más recomendados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                data={(data?.segurosMasVendidos ?? []).map((s) => ({
                  label: s.familia,
                  value: s.count,
                }))}
                barClass="bg-brand-yellow"
                valueClass="text-brand-blue"
                empty="Aún no hay análisis de seguros por cliente."
              />
            </CardContent>
          </Card>
        </div>
      </div>
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
  value: number;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-text-3">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-yellow text-brand-blue">
            {icon}
          </span>
          {label}
        </div>
        <div className="mt-2 font-display text-3xl font-semibold text-brand-blue">
          {value}
        </div>
        <div className="mt-1 text-xs text-text-3">{hint}</div>
      </CardContent>
    </Card>
  );
}

/** Gráfica de barras horizontal ligera (sin dependencias de charting). */
function BarList({
  data,
  barClass,
  valueClass = "text-text-2",
  empty,
}: {
  data: { label: string; value: number }[];
  barClass: string;
  valueClass?: string;
  empty: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-text-3">{empty}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-[13px] text-text-2" title={d.label}>
            {d.label}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-subtle">
            <div
              className={`h-full rounded ${barClass}`}
              style={{ width: `${(d.value / max) * 100}%`, minWidth: d.value > 0 ? "8px" : 0 }}
            />
          </div>
          <span className={`w-6 shrink-0 text-right text-sm font-semibold ${valueClass}`}>
            {d.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
