"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setOrdersManuallyClosed } from "./actions";

export function ManualCloseToggle({
  manuallyClosed,
  liveOpen,
  statusLabel,
}: {
  manuallyClosed: boolean;
  liveOpen: boolean;
  statusLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      try {
        await setOrdersManuallyClosed(!manuallyClosed);
        toast.success(manuallyClosed ? "Pedidos reabiertos" : "Pedidos cerrados");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2.5">
        <CircleIcon
          className={liveOpen ? "size-3 shrink-0 fill-emerald-500 text-emerald-500" : "size-3 shrink-0 fill-destructive text-destructive"}
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{statusLabel}</span>
          {manuallyClosed && (
            <span className="text-xs text-muted-foreground">
              Cerrado a mano — no vuelve a abrir solo hasta que lo reabras.
            </span>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant={manuallyClosed ? "default" : "destructive"}
        size="sm"
        disabled={pending}
        onClick={toggle}
      >
        {pending ? "..." : manuallyClosed ? "Reabrir pedidos" : "Cerrar pedidos"}
      </Button>
    </div>
  );
}
