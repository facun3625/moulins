import { prisma } from "@/lib/prisma";

export function toDateAtNoon(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function toHHMM(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// Solo hace falta sembrar los grupos con un stock por defecto configurado
// (los demás nacen "sin límite" hasta que alguien cargue una cantidad).
export async function seedDefaultStock(deliveryDateId: string) {
  const stockGroups = await prisma.stockGroup.findMany({
    where: { defaultStockQuantity: { not: null } },
  });
  if (stockGroups.length === 0) return;

  await prisma.stockGroupStock.createMany({
    data: stockGroups.map((g) => ({
      stockGroupId: g.id,
      deliveryDateId,
      quantityAvailable: g.defaultStockQuantity,
    })),
    skipDuplicates: true,
  });
}

/**
 * Cualquier fecha que quedó OPEN pero ya no puede recibir pedidos (el día de
 * entrega quedó en el pasado, o se pasó la hora de corte) pasa a EXPIRED. No
 * se toca nada que ya esté CLOSED a mano.
 */
export async function expireStaleDates() {
  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  await prisma.deliveryDate.updateMany({
    where: {
      status: "OPEN",
      OR: [{ date: { lt: startOfToday } }, { cutoffAt: { lt: now } }],
    },
    data: { status: "EXPIRED" },
  });
}
