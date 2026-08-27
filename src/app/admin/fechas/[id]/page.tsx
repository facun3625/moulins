import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { DateEditor } from "./date-editor";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toDatetimeLocalValue(d: Date) {
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default async function EditDeliveryDatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const [deliveryDate, products, stockGroups, productStock, pickupEnabled, dateSlots, defaultSlots, movements, costs] =
    await Promise.all([
      prisma.deliveryDate.findUnique({ where: { id } }),
      prisma.product.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      prisma.stockGroup.findMany({
        include: { stock: { where: { deliveryDateId: id } } },
        orderBy: { name: "asc" },
      }),
      prisma.productStock.findMany({ where: { deliveryDateId: id } }),
      prisma.fulfillmentMethodConfig
        .findUnique({ where: { type: "PICKUP" } })
        .then((row) => row?.enabled ?? false),
      prisma.pickupSlot.findMany({
        where: { deliveryDateId: id },
        orderBy: { order: "asc" },
      }),
      prisma.pickupSlot.findMany({
        where: { deliveryDateId: null },
        orderBy: { order: "asc" },
      }),
      prisma.stockMovement.findMany({
        where: { deliveryDateId: id },
        include: { stockGroup: { select: { name: true } }, product: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.deliveryDateCost.findMany({
        where: { deliveryDateId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  if (!deliveryDate) notFound();

  // Todo producto activo pertenece a un grupo (propio o compartido); acá se
  // arma una sola lista, un pozo de stock por grupo.
  const groups = stockGroups
    .map((g) => {
      const productNames = products.filter((p) => p.stockGroupId === g.id).map((p) => p.name);
      const stock = g.stock[0];
      return {
        id: g.id,
        name: g.name,
        productNames,
        quantityAvailable: stock?.quantityAvailable ?? null,
        quantitySold: stock?.quantitySold ?? 0,
      };
    })
    .filter((g) => g.productNames.length > 0);

  const productStockById = new Map(productStock.map((s) => [s.productId, s]));
  const flatProducts = products.map((p) => {
    const s = productStockById.get(p.id);
    return {
      id: p.id,
      name: p.name,
      quantityAvailable: s?.quantityAvailable ?? null,
      quantitySold: s?.quantitySold ?? 0,
    };
  });

  return (
    <DateEditor
      key={deliveryDate.id}
      deliveryDate={{
        id: deliveryDate.id,
        date: toDateInputValue(deliveryDate.date),
        orderOpenAt: deliveryDate.orderOpenAt ? toDatetimeLocalValue(deliveryDate.orderOpenAt) : null,
        cutoffAt: deliveryDate.cutoffAt ? toDatetimeLocalValue(deliveryDate.cutoffAt) : null,
        capacity: deliveryDate.capacity,
        notes: deliveryDate.notes,
        status: deliveryDate.status,
      }}
      stockMode={deliveryDate.stockMode}
      groups={groups}
      flatProducts={flatProducts}
      allProducts={products.map((p) => ({ id: p.id, name: p.name, stockGroupId: p.stockGroupId }))}
      pickupEnabled={pickupEnabled}
      dateSlots={dateSlots}
      defaultSlots={defaultSlots}
      movements={movements.map((m) => ({
        id: m.id,
        targetName: m.stockGroup?.name ?? m.product?.name ?? "—",
        reason: m.reason,
        delta: m.delta,
        quantityAvailable: m.quantityAvailable,
        quantitySold: m.quantitySold,
        note: m.note,
        createdAt: m.createdAt.toISOString(),
      }))}
      costs={costs.map((c) => ({
        id: c.id,
        label: c.label,
        amount: Number(c.amount),
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
