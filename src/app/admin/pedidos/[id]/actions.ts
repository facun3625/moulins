"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import type { OrderStatus } from "@/generated/prisma/client";
import { logGroupStockMovement, logProductStockMovement } from "@/lib/stock-movements";
import { awardPointsForOrder, reversePointsForOrder } from "@/lib/points";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED",
};

const CANCELLABLE_FROM: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY"];

async function restoreStockForOrder(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    include: { productVariant: { include: { product: true } } },
  });
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });

  // El pedido se descontó de un solo lado (grupo o producto, según el modo
  // de la fecha en ese momento) — intentar los dos es inofensivo.
  const byGroup = new Map<string, number>();
  const byProduct = new Map<string, number>();
  for (const item of items) {
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
      note: `Pedido ${order.id} cancelado`,
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
      note: `Pedido ${order.id} cancelado`,
    });
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await requireAdmin();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Pedido no encontrado");

  const isForward = NEXT_STATUS[order.status] === status;
  const isCancel = status === "CANCELLED" && CANCELLABLE_FROM.includes(order.status);
  if (!isForward && !isCancel) throw new Error("Ese cambio de estado no es válido");

  await prisma.$transaction(async (tx) => {
    if (isCancel) {
      await restoreStockForOrder(tx, orderId);
      await reversePointsForOrder(tx, order);
    }
    await tx.order.update({ where: { id: orderId }, data: { status } });
  });
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
}

export async function approveOrder(orderId: string) {
  await requireAdmin();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Pedido no encontrado");

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
    await tx.paymentProof.updateMany({ where: { orderId }, data: { status: "APPROVED", reviewedAt: new Date() } });
    await awardPointsForOrder(tx, order);
  });

  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
}

export async function rejectOrder(orderId: string) {
  await requireAdmin();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Pedido no encontrado");

  await prisma.$transaction(async (tx) => {
    await restoreStockForOrder(tx, orderId);
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await tx.paymentProof.updateMany({ where: { orderId }, data: { status: "REJECTED", reviewedAt: new Date() } });
  });

  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
}
