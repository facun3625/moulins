import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { FULFILLMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/client";
import { OrdersFilterBar } from "./orders-filter-bar";
import { OrdersTable } from "./orders-table";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const PAGE_SIZE = 25;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; fecha?: string; estado?: string; tipo?: string; pago?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);

  const where = {
    ...(params.fecha ? { deliveryDateId: params.fecha } : {}),
    ...(params.estado ? { status: params.estado as OrderStatus } : {}),
    ...(params.tipo ? { fulfillmentType: params.tipo as "DELIVERY" | "PICKUP" } : {}),
    ...(params.pago
      ? { paymentMethod: params.pago as "CASH_ON_DELIVERY" | "TRANSFER" | "MERCADOPAGO" }
      : {}),
    ...(params.q
      ? {
          OR: [
            { user: { name: { contains: params.q, mode: "insensitive" as const } } },
            { user: { email: { contains: params.q, mode: "insensitive" as const } } },
            { guestName: { contains: params.q, mode: "insensitive" as const } },
            { guestEmail: { contains: params.q, mode: "insensitive" as const } },
            { deliveryPhone: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [orders, total, deliveryDates] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: true, deliveryDate: true, paymentProof: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.deliveryDate.findMany({
      orderBy: { date: "desc" },
      select: { id: true, date: true },
      take: 100,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.fecha) sp.set("fecha", params.fecha);
    if (params.estado) sp.set("estado", params.estado);
    if (params.tipo) sp.set("tipo", params.tipo);
    if (params.pago) sp.set("pago", params.pago);
    sp.set("page", String(p));
    return `/admin/pedidos?${sp.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Pedidos</h1>

      <OrdersFilterBar
        deliveryDates={deliveryDates.map((d) => ({ id: d.id, date: d.date.toISOString() }))}
      />

      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "pedido encontrado" : "pedidos encontrados"}
      </p>

      <OrdersTable
        orders={orders.map((o) => ({
          id: o.id,
          buyerLabel: o.user?.name ?? o.user?.email ?? o.guestName ?? o.guestEmail ?? "Invitado",
          isGuest: !o.user,
          proofUrl: o.paymentProof?.url ?? null,
          deliveryLabel: dateFormatter.format(o.deliveryDate.date),
          fulfillmentLabel: FULFILLMENT_TYPE_LABELS[o.fulfillmentType],
          paymentLabel: PAYMENT_METHOD_LABELS[o.paymentMethod],
          status: o.status,
          needsReview: o.paymentMethod === "TRANSFER" && o.paymentProof?.status === "PENDING",
          totalLabel: formatPrice(Number(o.total)),
        }))}
      />

      {orders.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No hay pedidos que coincidan con esa búsqueda.
        </p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            render={<Link href={pageHref(page - 1)} />}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            render={<Link href={pageHref(page + 1)} />}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
