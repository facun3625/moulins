"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/admin/confirm-provider";
import { approveOrder, rejectOrder } from "./actions";

export function OrderReviewActions({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await approveOrder(orderId);
              toast.success("Pedido aprobado");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            }
          })
        }
      >
        Aprobar
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: "Rechazar pedido",
            description: "¿Rechazar el comprobante y cancelar el pedido?",
            confirmLabel: "Rechazar",
            destructive: true,
          });
          if (!ok) return;
          startTransition(async () => {
            try {
              await rejectOrder(orderId);
              toast.success("Pedido rechazado");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            }
          });
        }}
      >
        Rechazar
      </Button>
    </div>
  );
}
