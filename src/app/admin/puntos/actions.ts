"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const rateSchema = z.object({
  pointsPerAmount: z.coerce.number().nonnegative("No puede ser negativo"),
});

export async function updatePointsRate(formData: FormData) {
  await requireAdmin();
  const parsed = rateSchema.parse({ pointsPerAmount: formData.get("pointsPerAmount") });

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.pointsRule.updateMany({
      where: { effectiveTo: null },
      data: { effectiveTo: now },
    });
    await tx.pointsRule.create({
      data: { pointsPerAmount: parsed.pointsPerAmount, effectiveFrom: now },
    });
  });

  revalidatePath("/admin/puntos");
}
