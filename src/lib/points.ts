import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export async function getActivePointsRule(tx: Tx | typeof prisma = prisma) {
  const now = new Date();
  return tx.pointsRule.findFirst({
    where: {
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

export function computePoints(subtotal: number, pointsPerAmount: number) {
  return Math.max(0, Math.floor(subtotal * pointsPerAmount));
}

// Se llama cuando un pedido pasa a CONFIRMED (efectivo al crearse, o
// transferencia aprobada) — los invitados no tienen cuenta para acumular.
export async function awardPointsForOrder(
  tx: Tx,
  order: { id: string; userId: string | null; subtotal: Prisma.Decimal | number },
) {
  if (!order.userId) return;

  const rule = await getActivePointsRule(tx);
  if (!rule) return;

  const points = computePoints(Number(order.subtotal), Number(rule.pointsPerAmount));
  if (points <= 0) return;

  await tx.order.update({ where: { id: order.id }, data: { pointsEarned: points } });
  await tx.pointsLedger.create({
    data: { userId: order.userId, orderId: order.id, delta: points, reason: "ORDER" },
  });
}

// Se llama al cancelar un pedido que ya había otorgado puntos (CONFIRMED
// o PREPARING) — resta lo que se había sumado.
export async function reversePointsForOrder(
  tx: Tx,
  order: { id: string; userId: string | null; pointsEarned: number },
) {
  if (!order.userId || order.pointsEarned <= 0) return;

  await tx.pointsLedger.create({
    data: {
      userId: order.userId,
      orderId: order.id,
      delta: -order.pointsEarned,
      reason: "ORDER_CANCELLED",
    },
  });
}

export async function getUserPointsBalance(userId: string) {
  const result = await prisma.pointsLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}
