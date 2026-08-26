"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import type { PaymentMethodType } from "@/generated/prisma/client";

export async function setPaymentMethodEnabled(type: PaymentMethodType, enabled: boolean) {
  await requireAdmin();
  await prisma.paymentMethodConfig.upsert({
    where: { type },
    update: { enabled },
    create: { type, enabled },
  });
  revalidatePath("/admin/pagos");
}

export async function updatePaymentMethodLabel(type: PaymentMethodType, label: string) {
  await requireAdmin();
  const trimmed = label.trim() || null;
  await prisma.paymentMethodConfig.upsert({
    where: { type },
    update: { label: trimmed },
    create: { type, enabled: false, label: trimmed },
  });
  revalidatePath("/admin/pagos");
  revalidatePath("/checkout");
}

export async function updateCashRestriction(minPreviousOrders: number | null) {
  await requireAdmin();
  await prisma.paymentMethodConfig.upsert({
    where: { type: "CASH_ON_DELIVERY" },
    update: { minPreviousOrders },
    create: { type: "CASH_ON_DELIVERY", enabled: false, minPreviousOrders },
  });
  revalidatePath("/admin/pagos");
  revalidatePath("/checkout");
}

const transferConfigSchema = z.object({
  bankName: z.string().optional(),
  accountHolder: z.string().optional(),
  cbuOrAlias: z.string().optional(),
});

export async function updateTransferConfig(formData: FormData) {
  await requireAdmin();
  const parsed = transferConfigSchema.parse({
    bankName: formData.get("bankName") || undefined,
    accountHolder: formData.get("accountHolder") || undefined,
    cbuOrAlias: formData.get("cbuOrAlias") || undefined,
  });

  await prisma.paymentMethodConfig.upsert({
    where: { type: "TRANSFER" },
    update: { config: parsed },
    create: { type: "TRANSFER", enabled: false, config: parsed },
  });
  revalidatePath("/admin/pagos");
}
