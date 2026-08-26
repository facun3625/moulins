import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { EditCouponForm } from "./edit-coupon-form";

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) notFound();

  const pointsCoupon = coupon.pointsCost > 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{pointsCoupon ? "Editar cupón por puntos" : "Editar cupón"}</h1>
      <EditCouponForm
        coupon={{
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          usageLimit: coupon.usageLimit,
          expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString().slice(0, 10) : null,
          pointsCost: coupon.pointsCost,
        }}
        pointsCoupon={pointsCoupon}
      />
    </div>
  );
}
