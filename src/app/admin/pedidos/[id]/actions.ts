"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import type { OrderStatus } from "@/generated/prisma/client";
import { logGroupStockMovement } from "@/lib/stock-movements";
import { awardPointsForOrder, reversePointsForOrder } from "@/lib/points";

// Los tres estados "activos" del pedido se pueden reasignar libremente
// entre sí en cualquier sentido (incluso desde Entregado hacia atrás, por
// si el admin se equivocó) — no es un avance de un solo paso como antes.
const ACTIVE_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "DELIVERED"];

const CANCELLABLE_FROM: OrderStatus[] = ["CONFIRMED", "PREPARING"];

async function restoreStockForOrder(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    include: { productVariant: true },
  });
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });

  const byGroup = new Map<string, number>();
  for (const item of items) {
    const groupId = item.productVariant.stockGroupId;
    byGroup.set(groupId, (byGroup.get(groupId) ?? 0) + item.quantity);
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
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await requireAdmin();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Pedido no encontrado");

  const isActiveSwitch = ACTIVE_STATUSES.includes(order.status) && ACTIVE_STATUSES.includes(status);
  const isCancel = status === "CANCELLED" && CANCELLABLE_FROM.includes(order.status);
  if (!isActiveSwitch && !isCancel) throw new Error("Ese cambio de estado no es válido");

  await prisma.$transaction(async (tx) => {
    if (isCancel) {
      await restoreStockForOrder(tx, orderId);
      await reversePointsForOrder(tx, order);
    }
    await tx.order.update({ where: { id: orderId }, data: { status } });
  });
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin", "layout");
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
  revalidatePath("/admin", "layout");
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
  revalidatePath("/admin", "layout");
}
