"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/components/admin/confirm-provider";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/client";
import { approveOrder, rejectOrder, updateOrderStatus } from "./[id]/actions";

// Los tres estados "activos" se pueden reasignar libremente entre sí, en
// cualquier sentido (incluso desde Entregado hacia atrás).
const ACTIVE_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "DELIVERED"];

const CANCELLABLE_FROM: OrderStatus[] = ["CONFIRMED", "PREPARING"];

function triggerClass(status: OrderStatus) {
  return cn(
    badgeVariants({ variant: "secondary" }),
    "h-5 !rounded-full cursor-pointer gap-1 border-transparent px-2 py-0 pr-1.5 text-xs font-medium select-none data-[size=sm]:h-5 [&_svg]:size-2.5 [&_svg]:opacity-70",
    ORDER_STATUS_COLORS[status],
  );
}

const contentClass = "min-w-32 p-1";
const itemClass = "rounded-md py-1.5 pr-6 pl-2 text-xs";

// Cambiar el estado sin salir de la lista — se ve como el badge de siempre,
// pero es un select. Los pedidos "en revisión" (transferencia) usan
// aprobar/rechazar en vez del flujo normal. Cancelado es terminal (no se
// puede reabrir); los tres activos (confirmado/preparación/entregado) se
// pueden reasignar libremente entre sí, en cualquier sentido.
export function OrderStatusSelect({
  orderId,
  status,
  needsReview,
}: {
  orderId: string;
  status: OrderStatus;
  needsReview: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  function runApprove() {
    startTransition(async () => {
      try {
        await approveOrder(orderId);
        toast.success("Pedido aprobado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  }

  async function runReject() {
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
  }

  if (needsReview) {
    return (
      <Select
        value="_"
        disabled={pending}
        onValueChange={(value) => {
          if (value === "APPROVE") runApprove();
          else if (value === "REJECT") runReject();
        }}
      >
        <SelectTrigger size="sm" className={triggerClass("PAYMENT_REVIEW")}>
          <SelectValue>{ORDER_STATUS_LABELS.PAYMENT_REVIEW}</SelectValue>
        </SelectTrigger>
        <SelectContent className={contentClass}>
          <SelectItem value="APPROVE" className={itemClass}>
            Aprobar
          </SelectItem>
          <SelectItem value="REJECT" className={itemClass}>
            Rechazar pedido
          </SelectItem>
        </SelectContent>
      </Select>
    );
  }

  const otherActiveStatuses = ACTIVE_STATUSES.filter((s) => s !== status);
  const cancellable = CANCELLABLE_FROM.includes(status);

  if (!ACTIVE_STATUSES.includes(status) && !cancellable) {
    return <Badge className={ORDER_STATUS_COLORS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
  }

  function handleChange(value: string | null) {
    if (!value) return;
    if (value === "CANCELLED") {
      confirm({
        title: "Cancelar pedido",
        description: "¿Cancelar este pedido?",
        confirmLabel: "Cancelar pedido",
        destructive: true,
      }).then((ok) => {
        if (!ok) return;
        startTransition(async () => {
          try {
            await updateOrderStatus(orderId, "CANCELLED");
            toast.success("Pedido cancelado");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error");
          }
        });
      });
      return;
    }
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, value as OrderStatus);
        toast.success("Estado actualizado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <Select value="_" disabled={pending} onValueChange={handleChange}>
      <SelectTrigger size="sm" className={triggerClass(status)}>
        <SelectValue>{ORDER_STATUS_LABELS[status]}</SelectValue>
      </SelectTrigger>
      <SelectContent className={contentClass}>
        {otherActiveStatuses.map((s) => (
          <SelectItem key={s} value={s} className={itemClass}>
            {ORDER_STATUS_LABELS[s]}
          </SelectItem>
        ))}
        {cancellable && (
          <SelectItem value="CANCELLED" className={cn(itemClass, "text-destructive")}>
            Cancelar pedido
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
