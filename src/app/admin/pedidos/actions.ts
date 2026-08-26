"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { logGroupStockMovement, logProductStockMovement } from "@/lib/stock-movements";

export async function deleteOrders(orderIds: string[]) {
  await requireAdmin();
  if (orderIds.length === 0) return;

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: { items: { include: { productVariant: { include: { product: true } } } } },
  });
  if (orders.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const order of orders) {
      // El pedido se descontó de un solo lado (grupo o producto, según el
      // modo de la fecha en ese momento) — intentar los dos es inofensivo,
      // el que no aplica simplemente no encuentra filas.
      const byGroup = new Map<string, number>();
      const byProduct = new Map<string, number>();
      for (const item of order.items) {
        const groupId = item.productVariant.product.stockGroupId;
        byGroup.set(groupId, (byGroup.get(groupId) ?? 0) + item.quantity);
        const productId = item.productVariant.productId;
        byProduct.set(productId, (byProduct.get(productId) ?? 0) + item.quantity);
      }
      for (const [stockGroupId, quantity] of byGroup) {
        await tx.stockGroupStock.updateMany({
          where: { stockGroupId, deliveryDateId: order.deliveryDateId },
          data: { quantitySold: { decrement: quantity } },
        });
        await logGroupStockMovement(tx, {
          deliveryDateId: order.deliveryDateId,
          stockGroupId,
          reason: "RESTOCK",
          delta: quantity,
          note: `Pedido ${order.id} borrado`,
        });
      }
      for (const [productId, quantity] of byProduct) {
        await tx.productStock.updateMany({
          where: { productId, deliveryDateId: order.deliveryDateId },
          data: { quantitySold: { decrement: quantity } },
        });
        await logProductStockMovement(tx, {
          deliveryDateId: order.deliveryDateId,
          productId,
          reason: "RESTOCK",
          delta: quantity,
          note: `Pedido ${order.id} borrado`,
        });
      }
    }
    await tx.order.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } });
  });

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/fechas");
}
