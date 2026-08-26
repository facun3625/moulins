"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/admin/confirm-provider";
import { setCouponEnabled, deleteCoupon } from "./actions";

export function CouponToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={enabled}
      disabled={pending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          try {
            await setCouponEnabled(id, checked);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error");
          }
        })
      }
    />
  );
}

export function CouponDeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: "Borrar cupón",
          description: "¿Borrar este cupón?",
          confirmLabel: "Borrar",
          destructive: true,
        });
        if (!ok) return;
        startTransition(async () => {
          try {
            await deleteCoupon(id);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error al borrar");
          }
        });
      }}
    >
      Borrar
    </Button>
  );
}
