"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/generated/prisma/client";
import { useConfirm } from "@/components/admin/confirm-provider";
import { updateOrderStatus } from "./actions";

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "Marcar en preparación",
  PREPARING: "Marcar listo",
  READY: "Marcar entregado",
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED",
};

export function OrderStatusActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const nextStatus = NEXT_STATUS[status];
  const nextLabel = NEXT_STATUS_LABEL[status];

  if (!nextStatus) return null;

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await updateOrderStatus(orderId, nextStatus);
              toast.success("Estado actualizado");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            }
          })
        }
      >
        {nextLabel}
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: "Cancelar pedido",
            description: "¿Cancelar este pedido?",
            confirmLabel: "Cancelar pedido",
            destructive: true,
          });
          if (!ok) return;
          startTransition(async () => {
            try {
              await updateOrderStatus(orderId, "CANCELLED");
              toast.success("Pedido cancelado");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            }
          });
        }}
      >
        Cancelar pedido
      </Button>
    </div>
  );
}
