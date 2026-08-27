"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/generated/prisma/client";
import { useConfirm } from "@/components/admin/confirm-provider";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { updateOrderStatus } from "./actions";

// Los tres estados activos se pueden reasignar libremente entre sí, en
// cualquier sentido (incluso desde Entregado hacia atrás si el admin se
// equivocó) — no es un avance de un solo paso.
const ACTIVE_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "DELIVERED"];
const CANCELLABLE_FROM: OrderStatus[] = ["CONFIRMED", "PREPARING"];

export function OrderStatusActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  if (!ACTIVE_STATUSES.includes(status)) return null;

  const otherActiveStatuses = ACTIVE_STATUSES.filter((s) => s !== status);
  const cancellable = CANCELLABLE_FROM.includes(status);

  function setStatus(next: OrderStatus) {
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, next);
        toast.success("Estado actualizado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {otherActiveStatuses.map((s) => (
        <Button key={s} type="button" variant="outline" disabled={pending} onClick={() => setStatus(s)}>
          Marcar {ORDER_STATUS_LABELS[s].toLowerCase()}
        </Button>
      ))}
      {cancellable && (
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
            setStatus("CANCELLED");
          }}
        >
          Cancelar pedido
        </Button>
      )}
    </div>
  );
}
