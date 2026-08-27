import { prisma } from "@/lib/prisma";

const UNLIMITED_STOCK = 999;

// Remanente real, leído en el momento — usado para revalidar justo antes de
// agregar/incrementar en el carrito, porque el remanente que trae la página
// puede haber quedado viejo (otra persona compró, o el admin ajustó stock).
export async function getRemainingForVariant(
  deliveryDateId: string,
  variantId: string,
): Promise<number> {
  const [storeConfig, deliveryDate, variant] = await Promise.all([
    prisma.storeConfig.findUnique({ where: { id: 1 } }),
    prisma.deliveryDate.findUnique({ where: { id: deliveryDateId } }),
    prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } }),
  ]);
  if (!storeConfig || !deliveryDate || !variant) return 0;

  if (storeConfig.orderingMode === "WEEKLY_HOURS" && variant.product.soldOutToday) return 0;
  if (deliveryDate.stockMode === "UNLIMITED") return UNLIMITED_STOCK;

  const stock = await prisma.stockGroupStock.findUnique({
    where: { stockGroupId_deliveryDateId: { stockGroupId: variant.stockGroupId, deliveryDateId } },
  });
  if (!stock || stock.quantityAvailable == null) return UNLIMITED_STOCK;
  return Math.max(0, stock.quantityAvailable - stock.quantitySold);
}

// Batch de la misma cuenta de arriba, para no hacer N+1 al armar el
// catálogo (una consulta por variante mostrada).
export async function getRemainingForVariants(
  deliveryDateId: string,
  variantIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (variantIds.length === 0) return result;

  const [storeConfig, deliveryDate, variants] = await Promise.all([
    prisma.storeConfig.findUnique({ where: { id: 1 } }),
    prisma.deliveryDate.findUnique({ where: { id: deliveryDateId } }),
    prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    }),
  ]);
  if (!storeConfig || !deliveryDate) {
    for (const id of variantIds) result.set(id, 0);
    return result;
  }

  if (deliveryDate.stockMode === "UNLIMITED") {
    for (const v of variants) {
      const remaining =
        storeConfig.orderingMode === "WEEKLY_HOURS" && v.product.soldOutToday ? 0 : UNLIMITED_STOCK;
      result.set(v.id, remaining);
    }
    return result;
  }

  const stockGroupIds = [...new Set(variants.map((v) => v.stockGroupId))];
  const stocks = await prisma.stockGroupStock.findMany({
    where: { deliveryDateId, stockGroupId: { in: stockGroupIds } },
  });
  const stockByGroup = new Map(stocks.map((s) => [s.stockGroupId, s]));

  for (const v of variants) {
    if (storeConfig.orderingMode === "WEEKLY_HOURS" && v.product.soldOutToday) {
      result.set(v.id, 0);
      continue;
    }
    const stock = stockByGroup.get(v.stockGroupId);
    if (!stock || stock.quantityAvailable == null) {
      result.set(v.id, UNLIMITED_STOCK);
      continue;
    }
    result.set(v.id, Math.max(0, stock.quantityAvailable - stock.quantitySold));
  }
  return result;
}

// Remanente a nivel producto (el máximo entre sus variantes) — usado antes
// de que el cliente elija una variante puntual, ej. el badge "agotado" de
// la card del catálogo.
export async function getRemainingForProduct(
  deliveryDateId: string,
  productId: string,
): Promise<number> {
  const variants = await prisma.productVariant.findMany({
    where: { productId, active: true },
    select: { id: true },
  });
  if (variants.length === 0) return 0;
  const remaining = await getRemainingForVariants(
    deliveryDateId,
    variants.map((v) => v.id),
  );
  return Math.max(0, ...remaining.values());
}
