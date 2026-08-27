"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function redeemCoupon(couponId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Iniciá sesión para canjear puntos");
  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
    if (!coupon || !coupon.active || coupon.pointsCost <= 0) {
      throw new Error("Ese cupón no está disponible para canjear");
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new Error("Ese cupón venció");
    }
    if (coupon.usageLimit) {
      const usedCount = await tx.couponRedemption.count({ where: { couponId: coupon.id } });
      if (usedCount >= coupon.usageLimit) {
        throw new Error("Ese cupón ya alcanzó el límite de usos");
      }
    }

    // Solo se puede tener un cupón canjeado sin usar a la vez — no importa
    // cuál, si ya hay uno pendiente hay que usarlo antes de canjear otro.
    const anyPending = await tx.couponRedemption.findFirst({
      where: { userId, orderId: null },
      include: { coupon: true },
    });
    if (anyPending) {
      throw new Error(
        `Ya tenés el cupón ${anyPending.coupon.code} canjeado sin usar — usalo en un pedido antes de canjear otro`,
      );
    }

    const balanceResult = await tx.pointsLedger.aggregate({
      where: { userId },
      _sum: { delta: true },
    });
    const balance = balanceResult._sum.delta ?? 0;
    if (balance < coupon.pointsCost) {
      throw new Error("No tenés puntos suficientes para este cupón");
    }

    await tx.couponRedemption.create({ data: { couponId, userId, orderId: null } });
    await tx.pointsLedger.create({
      data: { userId, couponId, delta: -coupon.pointsCost, reason: "COUPON_REDEMPTION" },
    });
  });

  revalidatePath("/puntos");
}
