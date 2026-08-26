"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import type { FulfillmentType } from "@/generated/prisma/client";

export async function setFulfillmentMethodEnabled(type: FulfillmentType, enabled: boolean) {
  await requireAdmin();
  await prisma.fulfillmentMethodConfig.upsert({
    where: { type },
    update: { enabled },
    create: { type, enabled },
  });
  revalidatePath("/admin/entrega");
}

export async function addDefaultPickupSlot(label: string) {
  await requireAdmin();
  if (!label.trim()) throw new Error("Ingresá un horario");

  const last = await prisma.pickupSlot.findFirst({
    where: { deliveryDateId: null },
    orderBy: { order: "desc" },
  });
  await prisma.pickupSlot.create({
    data: { deliveryDateId: null, label: label.trim(), order: (last?.order ?? -1) + 1 },
  });
  revalidatePath("/admin/entrega");
}

export async function deleteDefaultPickupSlot(id: string) {
  await requireAdmin();
  await prisma.pickupSlot.delete({ where: { id, deliveryDateId: null } });
  revalidatePath("/admin/entrega");
}

const deliveryFeeSchema = z.object({
  fee: z.coerce.number().min(0, "El costo no puede ser negativo"),
});

export async function updateDeliveryFee(formData: FormData) {
  await requireAdmin();
  const parsed = deliveryFeeSchema.parse({ fee: formData.get("fee") || 0 });

  await prisma.fulfillmentMethodConfig.upsert({
    where: { type: "DELIVERY" },
    update: { config: { fee: parsed.fee } },
    create: { type: "DELIVERY", enabled: false, config: { fee: parsed.fee } },
  });
  revalidatePath("/admin/entrega");
}
