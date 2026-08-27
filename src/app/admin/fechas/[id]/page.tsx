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

function variantLabel(productName: string, gusto: string | null, tamano: string | null) {
  const suffix = [gusto, tamano].filter(Boolean).join(" · ");
  return suffix ? `${productName} — ${suffix}` : productName;
}

export default async function EditDeliveryDatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const [deliveryDate, variants, stockGroups, pickupEnabled, dateSlots, defaultSlots, movements, costs] =
    await Promise.all([
      prisma.deliveryDate.findUnique({ where: { id } }),
      prisma.productVariant.findMany({
        where: { active: true, product: { active: true } },
        include: { product: true },
        orderBy: [{ product: { name: "asc" } }, { order: "asc" }],
      }),
      prisma.stockGroup.findMany({
        include: { stock: { where: { deliveryDateId: id } } },
        orderBy: { name: "asc" },
      }),
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
        include: { stockGroup: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.deliveryDateCost.findMany({
        where: { deliveryDateId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  if (!deliveryDate) notFound();

  // Toda variante activa pertenece a un pozo (propio o compartido); acá se
  // arma una sola lista, un pozo de stock por grupo.
  const groups = stockGroups
    .map((g) => {
      const memberNames = variants
        .filter((v) => v.stockGroupId === g.id)
        .map((v) => variantLabel(v.product.name, v.gusto, v.tamano));
      const stock = g.stock[0];
      return {
        id: g.id,
        name: g.name,
        productNames: memberNames,
        quantityAvailable: stock?.quantityAvailable ?? null,
        quantitySold: stock?.quantitySold ?? 0,
      };
    })
    .filter((g) => g.productNames.length > 0);

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
      allProducts={variants.map((v) => ({
        id: v.id,
        name: variantLabel(v.product.name, v.gusto, v.tamano),
        stockGroupId: v.stockGroupId,
      }))}
      pickupEnabled={pickupEnabled}
      dateSlots={dateSlots}
      defaultSlots={defaultSlots}
      movements={movements.map((m) => ({
        id: m.id,
        targetName: m.stockGroup?.name ?? "—",
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
