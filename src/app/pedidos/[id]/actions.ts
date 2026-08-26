"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveScheduledSalesAvailability, resolveWeeklyAvailability } from "@/lib/availability";
import { getRemainingForProduct } from "@/lib/stock";

export type RepeatOrderItem = {
  productVariantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  imageUrl: string | null;
  maxQuantity: number;
  stockGroupId: string | null;
  requestedQuantity: number;
  addableQuantity: number;
  unavailable: boolean;
};

export type RepeatOrderResult =
  | { open: false; reason: string }
  | { open: true; deliveryDateId: string; items: RepeatOrderItem[] };

export async function getRepeatOrderItems(orderId: string): Promise<RepeatOrderResult> {
  const session = await auth();
  if (!session?.user) return { open: false, reason: "Iniciá sesión para repetir un pedido" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { productVariant: { include: { product: { include: { images: { take: 1, orderBy: { order: "asc" } } } } } } },
      },
    },
  });
  if (!order || order.userId !== session.user.id) {
    return { open: false, reason: "Pedido no encontrado" };
  }

  const storeConfig = await prisma.storeConfig.findUniqueOrThrow({ where: { id: 1 } });
  let deliveryDateId: string | null = null;
  if (storeConfig.orderingMode === "WEEKLY_HOURS") {
    const availability = await resolveWeeklyAvailability();
    if (availability.open) deliveryDateId = availability.deliveryDateId;
  } else {
    const availability = await resolveScheduledSalesAvailability();
    if (availability.open) deliveryDateId = availability.sales[0].id;
  }
  if (!deliveryDateId) {
    return { open: false, reason: "No hay pedidos abiertos en este momento" };
  }

  const items: RepeatOrderItem[] = [];
  for (const orderItem of order.items) {
    const variant = orderItem.productVariant;
    const product = variant.product;
    // Los productos "a consulta" no se pueden repetir solos — hay que
    // volver a coordinar el precio por WhatsApp.
    const unavailableBase = !product.active || !variant.active || product.contactToBuy;
    const remaining = unavailableBase ? 0 : await getRemainingForProduct(deliveryDateId, product.id);

    items.push({
      productVariantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantLabel: [variant.gusto, variant.tamano].filter(Boolean).join(" · ") || "Único",
      unitPrice: Number(variant.price),
      imageUrl: product.images[0]?.url ?? null,
      maxQuantity: remaining,
      stockGroupId: product.stockGroupId,
      requestedQuantity: orderItem.quantity,
      addableQuantity: Math.min(orderItem.quantity, remaining),
      unavailable: unavailableBase || remaining <= 0,
    });
  }

  return { open: true, deliveryDateId, items };
}
