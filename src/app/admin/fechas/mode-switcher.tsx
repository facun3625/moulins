"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BikeIcon, CalendarClockIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/admin/confirm-provider";
import { setOrderingMode } from "./actions";

type Mode = "WEEKLY_HOURS" | "SCHEDULED_SALES";

const MODES: { value: Mode; icon: typeof BikeIcon; title: string; description: string }[] = [
  {
    value: "WEEKLY_HOURS",
    icon: BikeIcon,
    title: "Horario semanal",
    description: "Como un delivery: definís tus días y horarios habituales, se toman pedidos para hoy mismo.",
  },
  {
    value: "SCHEDULED_SALES",
    icon: CalendarClockIcon,
    title: "Ventas programadas",
    description: "Creás ventas puntuales con fecha de entrega/retiro y una ventana para tomar pedidos.",
  },
];

export function ModeSwitcher({ current }: { current: Mode }) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const router = useRouter();

  async function handleSelect(mode: Mode) {
    if (mode === current) return;
    const ok = await confirm({
      title: "Cambiar de modalidad",
      description:
        "Vas a cambiar cómo tu tienda recibe pedidos. La configuración anterior queda guardada pero deja de usarse hasta que vuelvas a este modo. No pueden funcionar las dos al mismo tiempo.",
      confirmLabel: "Cambiar",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await setOrderingMode(mode);
        toast.success("Modalidad actualizada");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo cambiar");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          disabled={pending}
          onClick={() => handleSelect(m.value)}
          className={cn(
            "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors disabled:opacity-60",
            current === m.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
          )}
        >
          <m.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{m.title}</span>
            <span className="text-xs text-muted-foreground">{m.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
