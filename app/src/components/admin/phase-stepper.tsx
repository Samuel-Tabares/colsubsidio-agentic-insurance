import { Check, Hand } from "lucide-react";
import type { StageDto } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Etapas del post-venta: se marcan con el ícono "manual" (las cierra un humano). */
const MANUAL_STAGES = new Set(["En suscripción", "Póliza emitida"]);

/**
 * Stepper horizontal de fase del funnel, manejado por las etapas REALES del
 * pipeline (no por labels mock). Si el lead está en "Cierre perdido" (kind
 * lost) se resalta esa ancla en rojo. Solo lectura (para el detalle del
 * cliente); la edición vive en el panel de Bandeja.
 */
export function PhaseStepper({
  stages,
  currentStageId,
}: {
  stages: StageDto[];
  currentStageId: string | null;
}) {
  // Las anclas won/lost comparten "columna" de cierre; para el riel horizontal
  // mostramos las etapas open + la ancla won, y tratamos lost como estado del
  // paso de cierre.
  const lostStage = stages.find((s) => s.kind === "lost");
  const isLost = currentStageId != null && currentStageId === lostStage?.id;
  const rail = stages.filter((s) => s.kind !== "lost");
  const closeIndex = rail.findIndex((s) => s.kind === "won");

  const currentIndex = isLost
    ? closeIndex >= 0
      ? closeIndex
      : rail.length - 1
    : rail.findIndex((s) => s.id === currentStageId);

  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2 py-2">
        {rail.map((stage, i) => {
          const done = currentIndex >= 0 && i < currentIndex;
          const active = i === currentIndex;
          const manual = MANUAL_STAGES.has(stage.name);
          const showLost = isLost && stage.kind === "won";
          return (
            <li key={stage.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
                  done && "border-transparent bg-emerald-100 text-emerald-800",
                  active && !showLost && "border-transparent bg-brand-blue text-white",
                  showLost && "border-transparent bg-rose-100 text-rose-800",
                  !done && !active && "bg-background text-text-3"
                )}
              >
                {done && <Check className="h-3 w-3" strokeWidth={2.5} />}
                {manual && <Hand className="h-3 w-3" strokeWidth={1.7} />}
                <span>{showLost ? "Cierre perdido" : stage.name}</span>
                {manual && (
                  <span className="ml-1 rounded-sm bg-white/30 px-1 text-[10px] uppercase tracking-wide">
                    manual
                  </span>
                )}
              </div>
              {i < rail.length - 1 && <div className="h-px w-5 bg-border" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
