import { Sparkles, MapPin, User, Users, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUBSTATE_COLORS, type Client } from "@/lib/admin-mock-data";
import { PhaseStepper } from "./PhaseStepper";

export function ClientDetail({ client }: { client: Client }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          className="text-xl font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--brand-blue)" }}
        >
          {client.nombre}
        </h2>
        <Badge variant="outline" className="border-current" style={{ color: "var(--brand-blue)" }}>
          {client.canal}
        </Badge>
        {client.subEstado && (
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${SUBSTATE_COLORS[client.subEstado]}`}
          >
            {client.subEstado}
          </span>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Fase actual</CardTitle>
        </CardHeader>
        <CardContent>
          <PhaseStepper current={client.fase} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Datos del perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{client.edad} años</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{client.ciudad}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span>Categoría {client.categoria}</span>
            </div>
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <span>{client.grupoFamiliar}</span>
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              Seguro de interés: <span className="font-medium text-foreground">{client.seguro}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" style={{ color: "var(--brand-yellow)" }} />
              Análisis de IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {client.analisisIA.length === 0 ? (
              <p className="text-muted-foreground">
                Aún no hay recomendaciones. El cliente apenas está siendo perfilado.
              </p>
            ) : (
              client.analisisIA.map((a) => (
                <div key={a.seguro} className="rounded-md border bg-muted/40 p-3">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "var(--brand-blue)" }}
                  >
                    {a.seguro}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.razon}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
