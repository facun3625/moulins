"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { seedDefaultStock, toDateAtNoon } from "@/lib/schedule";
import { logGroupStockMovement, logProductStockMovement } from "@/lib/stock-movements";

const deliveryDateSchema = z.object({
  date: z.string().min(1, "Elegí una fecha"),
  orderOpenAt: z.string().optional(),
  cutoffAt: z.string().optional(),
  capacity: z.string().optional(),
  notes: z.string().optional(),
});

// Si alguno de los dos lados es "sin límite" no hay un delta numérico limpio.
function adjustmentDelta(oldValue: number | null, newValue: number | null): number | null {
  if (oldValue == null || newValue == null) return null;
  return newValue - oldValue;
}

// El corte de pedidos nunca puede caer después del propio día de entrega.
function assertCutoffNotAfterDelivery(date: string, cutoffAt: string | undefined) {
  if (!cutoffAt) return;
  const endOfDeliveryDay = new Date(`${date}T23:59:59`);
  if (new Date(cutoffAt) > endOfDeliveryDay) {
    throw new Error("El corte no puede ser posterior a la fecha de entrega");
  }
}

export async function createDeliveryDate(formData: FormData) {
  await requireAdmin();
  const parsed = deliveryDateSchema.parse({
    date: formData.get("date"),
    orderOpenAt: formData.get("orderOpenAt") || undefined,
    cutoffAt: formData.get("cutoffAt") || undefined,
    capacity: formData.get("capacity") || undefined,
    notes: formData.get("notes") || undefined,
  });
  assertCutoffNotAfterDelivery(parsed.date, parsed.cutoffAt);

  const deliveryDate = await prisma.deliveryDate.create({
    data: {
      date: toDateAtNoon(parsed.date),
      orderOpenAt: parsed.orderOpenAt ? new Date(parsed.orderOpenAt) : null,
      cutoffAt: parsed.cutoffAt ? new Date(parsed.cutoffAt) : null,
      capacity: parsed.capacity ? Number(parsed.capacity) : null,
      notes: parsed.notes,
    },
  });
  await seedDefaultStock(deliveryDate.id);
  revalidatePath("/admin/fechas");
  redirect(`/admin/fechas/${deliveryDate.id}`);
}

// Guarda de una sola vez TODO lo que se tocó en la pantalla de la fecha:
// datos (estado, horarios, capacidad, notas), modalidad de stock, el stock
// cargado (grupos o productos, según la modalidad elegida), a qué grupo
// pertenece cada producto, y las franjas especiales — un solo botón
// "Guardar cambios" para toda la pantalla, nada se persiste antes de eso.
const saveDeliveryDateSchema = deliveryDateSchema.extend({
  open: z.string(),
  stockMode: z.enum(["BY_GROUP", "BY_PRODUCT", "UNLIMITED"]),
  // productId -> groupId real, o "__solo__" para pedir un grupo individual nuevo.
  groupAssignments: z.string().optional(),
  // { added: string[] (labels nuevos), removedIds: string[] (franjas existentes a borrar) }
  pickupSlots: z.string().optional(),
});

export async function saveDeliveryDate(id: string, formData: FormData) {
  await requireAdmin();

  const deliveryDate = await prisma.deliveryDate.findUnique({ where: { id } });
  if (!deliveryDate) throw new Error("Fecha no encontrada");

  const parsed = saveDeliveryDateSchema.parse({
    date: formData.get("date"),
    orderOpenAt: formData.get("orderOpenAt") || undefined,
    cutoffAt: formData.get("cutoffAt") || undefined,
    capacity: formData.get("capacity") || undefined,
    notes: formData.get("notes") || undefined,
    open: formData.get("open"),
    stockMode: formData.get("stockMode"),
    groupAssignments: formData.get("groupAssignments") || undefined,
    pickupSlots: formData.get("pickupSlots") || undefined,
  });
  assertCutoffNotAfterDelivery(parsed.date, parsed.cutoffAt);

  const groupEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith("stockgroup_"));
  const productEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith("product_"));

  const groupAssignments: Record<string, { target: string; quantity?: string }> = parsed.groupAssignments
    ? JSON.parse(parsed.groupAssignments)
    : {};
  const pickupSlotsPayload: { added: string[]; removedIds: string[] } = parsed.pickupSlots
    ? JSON.parse(parsed.pickupSlots)
    : { added: [], removedIds: [] };

  await prisma.$transaction(async (tx) => {
    await tx.deliveryDate.update({
      where: { id },
      data: {
        date: toDateAtNoon(parsed.date),
        orderOpenAt: parsed.orderOpenAt ? new Date(parsed.orderOpenAt) : null,
        cutoffAt: parsed.cutoffAt ? new Date(parsed.cutoffAt) : null,
        capacity: parsed.capacity ? Number(parsed.capacity) : null,
        notes: parsed.notes || null,
        status: parsed.open === "true" ? "OPEN" : "CLOSED",
        stockMode: parsed.stockMode,
      },
    });

    for (const [key, value] of groupEntries) {
      const stockGroupId = key.replace("stockgroup_", "");
      const raw = String(value).trim();
      const quantityAvailable = raw === "" ? null : Math.max(0, Number(raw) || 0);
      const before = await tx.stockGroupStock.findUnique({
        where: { stockGroupId_deliveryDateId: { stockGroupId, deliveryDateId: id } },
      });
      if (before && before.quantityAvailable === quantityAvailable) continue;
      if (quantityAvailable != null && quantityAvailable < (before?.quantitySold ?? 0)) {
        throw new Error("El stock disponible no puede quedar por debajo de lo ya vendido");
      }
      await tx.stockGroupStock.upsert({
        where: { stockGroupId_deliveryDateId: { stockGroupId, deliveryDateId: id } },
        update: { quantityAvailable },
        create: { stockGroupId, deliveryDateId: id, quantityAvailable },
      });
      await logGroupStockMovement(tx, {
        deliveryDateId: id,
        stockGroupId,
        reason: "ADJUSTMENT",
        delta: adjustmentDelta(before?.quantityAvailable ?? null, quantityAvailable),
      });
    }

    for (const [key, value] of productEntries) {
      const productId = key.replace("product_", "");
      const raw = String(value).trim();
      const quantityAvailable = raw === "" ? null : Math.max(0, Number(raw) || 0);
      const before = await tx.productStock.findUnique({
        where: { productId_deliveryDateId: { productId, deliveryDateId: id } },
      });
      if (before && before.quantityAvailable === quantityAvailable) continue;
      if (quantityAvailable != null && quantityAvailable < (before?.quantitySold ?? 0)) {
        throw new Error("El stock disponible no puede quedar por debajo de lo ya vendido");
      }
      await tx.productStock.upsert({
        where: { productId_deliveryDateId: { productId, deliveryDateId: id } },
        update: { quantityAvailable },
        create: { productId, deliveryDateId: id, quantityAvailable },
      });
      await logProductStockMovement(tx, {
        deliveryDateId: id,
        productId,
        reason: "ADJUSTMENT",
        delta: adjustmentDelta(before?.quantityAvailable ?? null, quantityAvailable),
      });
    }

    for (const [productId, entry] of Object.entries(groupAssignments)) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) continue;

      let targetGroupId = entry.target;
      if (entry.target === "__solo__") {
        let name = product.name;
        let attempt = 1;
        let soloId: string | null = null;
        while (soloId == null) {
          try {
            const solo = await tx.stockGroup.create({ data: { name } });
            soloId = solo.id;
          } catch {
            attempt += 1;
            name = `${product.name} (${attempt})`;
            if (attempt > 20) throw new Error("No se pudo crear el grupo individual");
          }
        }
        targetGroupId = soloId;
      } else {
        const group = await tx.stockGroup.findUnique({ where: { id: entry.target } });
        if (!group) continue;
      }

      await tx.product.update({ where: { id: productId }, data: { stockGroupId: targetGroupId } });

      if (entry.quantity !== undefined) {
        const raw = entry.quantity.trim();
        const quantityAvailable = raw === "" ? null : Math.max(0, Number(raw) || 0);
        const before = await tx.stockGroupStock.findUnique({
          where: { stockGroupId_deliveryDateId: { stockGroupId: targetGroupId, deliveryDateId: id } },
        });
        await tx.stockGroupStock.upsert({
          where: { stockGroupId_deliveryDateId: { stockGroupId: targetGroupId, deliveryDateId: id } },
          update: { quantityAvailable },
          create: { stockGroupId: targetGroupId, deliveryDateId: id, quantityAvailable },
        });
        await logGroupStockMovement(tx, {
          deliveryDateId: id,
          stockGroupId: targetGroupId,
          reason: "ADJUSTMENT",
          delta: adjustmentDelta(before?.quantityAvailable ?? null, quantityAvailable),
          note: entry.target === "__solo__" ? "Grupo individual nuevo" : undefined,
        });
      }
    }

    if (pickupSlotsPayload.removedIds.length > 0) {
      await tx.pickupSlot.deleteMany({
        where: { id: { in: pickupSlotsPayload.removedIds }, deliveryDateId: id },
      });
    }
    if (pickupSlotsPayload.added.length > 0) {
      const last = await tx.pickupSlot.findFirst({
        where: { deliveryDateId: id },
        orderBy: { order: "desc" },
      });
      let nextOrder = (last?.order ?? -1) + 1;
      for (const label of pickupSlotsPayload.added) {
        if (!label.trim()) continue;
        await tx.pickupSlot.create({
          data: { deliveryDateId: id, label: label.trim(), order: nextOrder },
        });
        nextOrder += 1;
      }
    }
  });

  revalidatePath("/admin/fechas");
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/fechas/${id}`);
}

export async function deleteDeliveryDate(id: string) {
  await requireAdmin();
  const orderCount = await prisma.order.count({ where: { deliveryDateId: id } });
  if (orderCount > 0) {
    throw new Error("No se puede borrar una fecha con pedidos asociados. Cerrala en su lugar.");
  }
  await prisma.deliveryDate.delete({ where: { id } });
  revalidatePath("/admin/fechas");
  redirect("/admin/fechas");
}

// ---------- Modo de disponibilidad ----------

export async function setOrderingMode(mode: "WEEKLY_HOURS" | "SCHEDULED_SALES") {
  await requireAdmin();
  await prisma.storeConfig.update({ where: { id: 1 }, data: { orderingMode: mode } });
  revalidatePath("/admin/fechas");
  revalidatePath("/");
}

export async function setOrdersManuallyClosed(closed: boolean) {
  await requireAdmin();
  await prisma.storeConfig.update({ where: { id: 1 }, data: { ordersManuallyClosed: closed } });
  revalidatePath("/admin/fechas");
  revalidatePath("/");
}

// ---------- Horario semanal (modo A) ----------

const windowSchema = z.object({
  order: z.number().int().min(0),
  orderOpenTime: z.string().regex(/^\d{2}:\d{2}$/),
  orderCloseTime: z.string().regex(/^\d{2}:\d{2}$/),
  fulfillmentStart: z.string().regex(/^\d{2}:\d{2}$/),
  fulfillmentEnd: z.string().regex(/^\d{2}:\d{2}$/),
});

const daySchema = z.object({
  weekday: z.number().min(0).max(6),
  enabled: z.boolean(),
  windows: z.array(windowSchema),
});

export async function saveWeeklySchedule(formData: FormData) {
  await requireAdmin();

  const days = JSON.parse(String(formData.get("days") || "[]")).map((d: unknown) => daySchema.parse(d)) as z.infer<
    typeof daySchema
  >[];

  for (const day of days) {
    if (day.enabled && day.windows.length === 0) {
      throw new Error("Cada día activo necesita al menos una franja horaria");
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const day of days) {
      const rule = await tx.weeklyScheduleRule.upsert({
        where: { weekday: day.weekday },
        update: { enabled: day.enabled },
        create: { weekday: day.weekday, enabled: day.enabled },
      });
      await tx.weeklyScheduleWindow.deleteMany({ where: { ruleId: rule.id } });
      if (day.windows.length > 0) {
        await tx.weeklyScheduleWindow.createMany({
          data: day.windows.map((w) => ({ ...w, ruleId: rule.id })),
        });
      }
    }
  });

  revalidatePath("/admin/fechas");
  revalidatePath("/");
}

// ---------- Cierres (feriados / vacaciones) ----------

const closureSchema = z.object({
  startDate: z.string().min(1, "Elegí una fecha de inicio"),
  endDate: z.string().min(1, "Elegí una fecha de fin"),
  reason: z.string().optional(),
});

export async function createStoreClosure(formData: FormData) {
  await requireAdmin();
  const parsed = closureSchema.parse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason") || undefined,
  });

  const start = toDateAtNoon(parsed.startDate);
  const end = toDateAtNoon(parsed.endDate);
  if (end < start) throw new Error("La fecha de fin no puede ser anterior a la de inicio");

  await prisma.storeClosure.create({
    data: { startDate: start, endDate: end, reason: parsed.reason ?? null },
  });
  revalidatePath("/admin/fechas/cierres");
}

export async function deleteStoreClosure(id: string) {
  await requireAdmin();
  await prisma.storeClosure.delete({ where: { id } });
  revalidatePath("/admin/fechas/cierres");
}
