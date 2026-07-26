import { MapPin, Sparkles, Tag, User, Users } from "lucide-react";
import type { ContactDto, StageDto } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelBadge } from "./channel-badge";
import { PhaseStepper } from "./phase-stepper";

/**
 * Detalle del cliente (diseño Colsubsidio de Sarah), manejado por datos reales:
 * "Datos del perfil" sale de `contact.perfil` (lo llena el cerebro vía RAG, aquí
 * solo lectura) y "Análisis de IA" de `contact.analisis` (resumen + ranking).
 * Reusado por el dialog de Contactos y el panel de Bandeja.
 */
export function ClientDetail({
  contact,
  canal = null,
  stages,
  currentStageId = null,
}: {
  contact: ContactDto;
  canal?: "whatsapp" | "web" | null;
  stages?: StageDto[];
  currentStageId?: string | null;
}) {
  const perfil = contact.perfil;
  const ranking = contact.analisis?.ranking ?? [];
  const resumen = contact.analisis?.resumen ?? contact.analisisResumen;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-semibold text-brand-blue">
          {contact.name}
        </h2>
        <ChannelBadge canal={canal} />
      </div>

      {stages && stages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-3">Fase actual</CardTitle>
          </CardHeader>
          <CardContent>
            <PhaseStepper stages={stages} currentStageId={currentStageId} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-3">Datos del perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {perfil ? (
              <>
                {perfil.edad != null && (
                  <Row icon={<User className="h-4 w-4 text-text-3" />}>
                    {perfil.edad} años
                  </Row>
                )}
                {perfil.ciudad && (
                  <Row icon={<MapPin className="h-4 w-4 text-text-3" />}>
                    {perfil.ciudad}
                  </Row>
                )}
                {perfil.categoria && (
                  <Row icon={<Tag className="h-4 w-4 text-text-3" />}>
                    Categoría {perfil.categoria}
                  </Row>
                )}
                {perfil.grupoFamiliar && (
                  <Row icon={<Users className="mt-0.5 h-4 w-4 text-text-3" />}>
                    {perfil.grupoFamiliar}
                  </Row>
                )}
                {perfil.seguroInteres && perfil.seguroInteres !== "—" && (
                  <div className="pt-2 text-xs text-text-3">
                    Seguro de interés:{" "}
                    <span className="font-medium text-foreground">
                      {perfil.seguroInteres}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-text-3">
                Aún no hay datos de perfil. El cerebro los completa a medida que
                el cliente comparte información.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-text-3">
              <Sparkles className="h-4 w-4 text-brand-yellow" strokeWidth={1.7} />
              Análisis de IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {resumen && <p className="text-xs text-text-2">{resumen}</p>}
            {ranking.length === 0 ? (
              !resumen && (
                <p className="text-text-3">
                  Aún no hay recomendaciones. El cliente apenas está siendo
                  perfilado.
                </p>
              )
            ) : (
              ranking.map((r) => (
                <div
                  key={`${r.familia}-${r.nombre}`}
                  className="rounded-md border bg-muted/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-brand-blue">
                      {r.nombre}
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      {Math.round(r.match)}% match
                    </Badge>
                  </div>
                  {r.blurb && (
                    <p className="mt-1 text-xs text-text-3">{r.blurb}</p>
                  )}
                  {(r.aseguradora || r.prima_mensual != null) && (
                    <p className="mt-1 text-[11px] text-text-3">
                      {r.aseguradora}
                      {r.aseguradora && r.prima_mensual != null ? " · " : ""}
                      {r.prima_mensual != null
                        ? `$${r.prima_mensual.toLocaleString("es-CO")}/mes`
                        : ""}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon}
      <span>{children}</span>
    </div>
  );
}
