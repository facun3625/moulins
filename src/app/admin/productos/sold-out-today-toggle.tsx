"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { toggleProductSoldOutToday } from "./actions";

export function SoldOutTodayToggle({ productId, soldOutToday }: { productId: string; soldOutToday: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      Agotado hoy
      <Switch
        checked={soldOutToday}
        disabled={pending}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            try {
              await toggleProductSoldOutToday(productId, checked);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            }
          })
        }
      />
    </div>
  );
}
