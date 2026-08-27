import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { FULFILLMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/client";
import { OrdersFilterBar } from "./orders-filter-bar";
import { OrdersTable } from "./orders-table";
import { ProductionSummary, type ProductionGroup } from "./production-summary";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const PAGE_SIZE = 25;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; fecha?: string; estado?: string; tipo?: string; pago?: string; page?: string; vista?: string }>;
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

  const productionMode = params.vista === "produccion";
  const [orders, total, deliveryDates, productionItems] = await Promise.all([
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
    productionMode ? prisma.orderItem.findMany({
      where: { order: {
        status: { in: ["CONFIRMED", "PREPARING", "READY"] },
        ...(params.fecha ? { deliveryDateId: params.fecha } : {}),
        ...(params.tipo ? { fulfillmentType: params.tipo as "DELIVERY" | "PICKUP" } : {}),
      } },
      include: { order: { include: { deliveryDate: true } }, productVariant: { include: { product: true } } },
    }) : Promise.resolve([]),
  ]);

  const productionMap = new Map<string, ProductionGroup>();
  for (const item of productionItems) {
    let group = productionMap.get(item.order.deliveryDateId);
    if (!group) { group = { deliveryDateId: item.order.deliveryDateId, deliveryLabel: dateFormatter.format(item.order.deliveryDate.date), deliverySortKey: item.order.deliveryDate.date.toISOString(), orderCount: 0, items: [] }; productionMap.set(item.order.deliveryDateId, group); }
    const existing = group.items.find(entry => entry.variantId === item.productVariantId);
    if (existing) existing.quantity += item.quantity;
    else group.items.push({ variantId: item.productVariantId, productName: item.productVariant.product.name, variantLabel: [item.productVariant.gusto, item.productVariant.tamano].filter(Boolean).join(" · ") || null, quantity: item.quantity });
  }
  for (const group of productionMap.values()) {
    group.orderCount = new Set(productionItems.filter(item => item.order.deliveryDateId === group!.deliveryDateId).map(item => item.orderId)).size;
    group.items.sort((a,b) => a.productName.localeCompare(b.productName, "es") || (a.variantLabel ?? "").localeCompare(b.variantLabel ?? "", "es"));
  }
  const productionGroups = [...productionMap.values()].sort((a,b) => a.deliverySortKey.localeCompare(b.deliverySortKey));

  function viewHref(production: boolean) {
    const search = new URLSearchParams();
    if (production) search.set("vista", "produccion");
    if (params.fecha) search.set("fecha", params.fecha);
    if (params.tipo) search.set("tipo", params.tipo);
    if (!production && params.estado) search.set("estado", params.estado);
    if (!production && params.pago) search.set("pago", params.pago);
    if (!production && params.q) search.set("q", params.q);
    return `/admin/pedidos${search.size ? `?${search}` : ""}`;
  }

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
      <div className="flex items-center justify-between gap-3"><h1 className="text-xl font-semibold">Pedidos</h1><div className="flex rounded-lg border bg-muted/30 p-1 print:hidden"><Button render={<Link href={viewHref(false)} />} variant={!productionMode ? "default" : "ghost"} size="sm">Por cliente</Button><Button render={<Link href={viewHref(true)} />} variant={productionMode ? "default" : "ghost"} size="sm">Por producto</Button></div></div>

      <OrdersFilterBar
        deliveryDates={deliveryDates.map((d) => ({ id: d.id, date: d.date.toISOString() }))}
        productionMode={productionMode}
      />

      {!productionMode && <><p className="text-sm text-muted-foreground">
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
      </>}
      {productionMode && <ProductionSummary groups={productionGroups} />}
    </div>
  );
}
