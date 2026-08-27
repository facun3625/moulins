import type { Prisma, StockMovementReason } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

// Se llama DESPUÉS de escribir en StockGroupStock — relee la fila para
// dejar la foto (tope/vendido) resultante junto al movimiento.
export async function logGroupStockMovement(
  tx: Tx,
  params: {
    deliveryDateId: string;
    stockGroupId: string;
    reason: StockMovementReason;
    delta?: number | null;
    note?: string;
  },
) {
  const row = await tx.stockGroupStock.findUnique({
    where: { stockGroupId_deliveryDateId: { stockGroupId: params.stockGroupId, deliveryDateId: params.deliveryDateId } },
  });
  if (!row) return;
  await tx.stockMovement.create({
    data: {
      deliveryDateId: params.deliveryDateId,
      stockGroupId: params.stockGroupId,
      reason: params.reason,
      delta: params.delta ?? null,
      quantityAvailable: row.quantityAvailable,
      quantitySold: row.quantitySold,
      note: params.note,
    },
  });
}
