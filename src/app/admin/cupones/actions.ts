"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(30, "Máximo 30 caracteres")
    .transform((v) => v.toUpperCase()),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.coerce.number().positive("El valor debe ser mayor a 0"),
  usageLimit: z.coerce.number().int().positive().optional(),
  expiresAt: z.string().optional(),
  pointsCost: z.coerce.number().int().nonnegative().optional(),
});

export async function createCoupon(formData: FormData) {
  await requireAdmin();

  const parsed = couponSchema.parse({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    usageLimit: formData.get("usageLimit") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    pointsCost: formData.get("pointsCost") || undefined,
  });

  if (parsed.discountType === "PERCENT" && parsed.discountValue > 100) {
    throw new Error("Un descuento porcentual no puede ser mayor a 100");
  }

  const existing = await prisma.coupon.findUnique({ where: { code: parsed.code } });
  if (existing) throw new Error("Ya existe un cupón con ese código");

  await prisma.coupon.create({
    data: {
      code: parsed.code,
      discountType: parsed.discountType,
      discountValue: parsed.discountValue,
      usageLimit: parsed.usageLimit ?? null,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      pointsCost: parsed.pointsCost ?? 0,
    },
  });
  revalidatePath("/admin/cupones");
}

export async function updateCoupon(id: string, formData: FormData) {
  await requireAdmin();

  const parsed = couponSchema.parse({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    usageLimit: formData.get("usageLimit") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    pointsCost: formData.get("pointsCost") || undefined,
  });

  if (parsed.discountType === "PERCENT" && parsed.discountValue > 100) {
    throw new Error("Un descuento porcentual no puede ser mayor a 100");
  }

  const existing = await prisma.coupon.findFirst({ where: { code: parsed.code, NOT: { id } } });
  if (existing) throw new Error("Ya existe otro cupón con ese código");

  await prisma.coupon.update({
    where: { id },
    data: {
      code: parsed.code,
      discountType: parsed.discountType,
      discountValue: parsed.discountValue,
      usageLimit: parsed.usageLimit ?? null,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      pointsCost: parsed.pointsCost ?? 0,
    },
  });
  revalidatePath("/admin/cupones");
  revalidatePath(`/admin/cupones/${id}`);
}

export async function setCouponEnabled(id: string, enabled: boolean) {
  await requireAdmin();
  await prisma.coupon.update({ where: { id }, data: { active: enabled } });
  revalidatePath("/admin/cupones");
}

export async function deleteCoupon(id: string) {
  await requireAdmin();
  const redemptionCount = await prisma.couponRedemption.count({ where: { couponId: id } });
  if (redemptionCount > 0) {
    throw new Error("No se puede borrar un cupón ya usado. Desactivalo en su lugar.");
  }
  await prisma.coupon.delete({ where: { id } });
  revalidatePath("/admin/cupones");
}
