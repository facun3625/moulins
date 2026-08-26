"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { toggleProductActive } from "./actions";

export function ProductActiveToggle({ productId, active }: { productId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      Activo
      <Switch
        checked={active}
        disabled={pending}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            try {
              await toggleProductActive(productId, checked);
              toast.success(checked ? "Producto activado" : "Producto ocultado");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error al cambiar el estado");
            }
          })
        }
      />
    </div>
  );
}
