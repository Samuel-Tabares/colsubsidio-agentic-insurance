import { Check, Hand } from "lucide-react";
import { MANUAL_PHASES, PHASE_ORDER, type Phase } from "@/lib/admin-mock-data";
import { cn } from "@/lib/utils";

export function PhaseStepper({ current }: { current: Phase }) {
  const isLost = current === "Cierre perdido";
  const currentIndex = isLost
    ? PHASE_ORDER.indexOf("Cierre ganado")
    : PHASE_ORDER.indexOf(current);

  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2 py-2">
        {PHASE_ORDER.map((phase, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const manual = MANUAL_PHASES.includes(phase);
          const showLost = isLost && phase === "Cierre ganado";
          return (
            <li key={phase} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
                  done && "border-transparent bg-emerald-100 text-emerald-800",
                  active && !showLost && "border-transparent text-white",
                  showLost && "border-transparent bg-rose-100 text-rose-800",
                  !done && !active && "bg-background text-muted-foreground",
                )}
                style={
                  active && !showLost
                    ? { backgroundColor: "var(--brand-blue)" }
                    : undefined
                }
              >
                {done && <Check className="h-3 w-3" />}
                {manual && <Hand className="h-3 w-3" />}
                <span>{showLost ? "Cierre perdido" : phase}</span>
                {manual && (
                  <span className="ml-1 rounded-sm bg-white/30 px-1 text-[10px] uppercase tracking-wide">
                    manual
                  </span>
                )}
              </div>
              {i < PHASE_ORDER.length - 1 && (
                <div className="h-px w-6 bg-border" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
