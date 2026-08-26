import { prisma } from "@/lib/prisma";

export async function getPickupSlotsForDate(deliveryDateId: string) {
  const specific = await prisma.pickupSlot.findMany({
    where: { deliveryDateId },
    orderBy: { order: "asc" },
  });
  if (specific.length > 0) return specific;

  return prisma.pickupSlot.findMany({
    where: { deliveryDateId: null },
    orderBy: { order: "asc" },
  });
}
