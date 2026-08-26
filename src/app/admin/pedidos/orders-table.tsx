"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useConfirm } from "@/components/admin/confirm-provider";
import type { OrderStatus } from "@/generated/prisma/client";
import { deleteOrders } from "./actions";
import { PaymentProofView } from "./payment-proof-view";
import { OrderStatusSelect } from "./order-status-select";

export type OrderRow = {
  id: string;
  buyerLabel: string;
  isGuest: boolean;
  deliveryLabel: string;
  fulfillmentLabel: string;
  paymentLabel: string;
  status: OrderStatus;
  needsReview: boolean;
  totalLabel: string;
  proofUrl: string | null;
};

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  const allSelected = orders.length > 0 && selected.size === orders.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    const count = selected.size;
    if (count === 0) return;
    const ok = await confirm({
      title: count === 1 ? "Borrar pedido" : "Borrar pedidos",
      description: `¿Borrar ${count === 1 ? "el pedido seleccionado" : `los ${count} pedidos seleccionados`}? Esta acción no se puede deshacer.`,
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteOrders(Array.from(selected));
        toast.success(count === 1 ? "Pedido borrado" : `${count} pedidos borrados`);
        setSelected(new Set());
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo borrar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted px-3 py-2">
          <span className="text-sm font-medium">
            {selected.size} {selected.size === 1 ? "pedido seleccionado" : "pedidos seleccionados"}
          </span>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
            <Trash2Icon className="size-4" />
            {pending ? "Borrando..." : "Borrar"}
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={toggleAll}
                aria-label="Seleccionar todos"
              />
            </TableHead>
            <TableHead>Comprador</TableHead>
            <TableHead>Entrega</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Medio de pago</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id} data-state={selected.has(o.id) ? "selected" : undefined}>
              <TableCell>
                <Checkbox
                  checked={selected.has(o.id)}
                  onCheckedChange={() => toggleOne(o.id)}
                  aria-label={`Seleccionar pedido de ${o.buyerLabel}`}
                />
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/pedidos/${o.id}`}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-primary"
                >
                  <span>{o.buyerLabel}</span>
                  {o.isGuest && <Badge variant="secondary">Invitado</Badge>}
                </Link>
              </TableCell>
              <TableCell>{o.deliveryLabel}</TableCell>
              <TableCell>{o.fulfillmentLabel}</TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1">
                  {o.paymentLabel}
                  {o.proofUrl && <PaymentProofView url={o.proofUrl} />}
                </span>
              </TableCell>
              <TableCell>
                <OrderStatusSelect orderId={o.id} status={o.status} needsReview={o.needsReview} />
              </TableCell>
              <TableCell className="text-right">{o.totalLabel}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Ver pedido de ${o.buyerLabel}`}
                  render={<Link href={`/admin/pedidos/${o.id}`} />}
                >
                  <EyeIcon className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
