import { prisma } from "@/lib/prisma";

const UNLIMITED_STOCK = 999;

// Remanente real, leído en el momento — usado para revalidar justo antes de
// agregar/incrementar en el carrito, porque el remanente que trae la página
// puede haber quedado viejo (otra persona compró, o el admin ajustó stock).
export async function getRemainingForProduct(
  deliveryDateId: string,
  productId: string,
): Promise<number> {
  const [storeConfig, deliveryDate, product] = await Promise.all([
    prisma.storeConfig.findUnique({ where: { id: 1 } }),
    prisma.deliveryDate.findUnique({ where: { id: deliveryDateId } }),
    prisma.product.findUnique({ where: { id: productId } }),
  ]);
  if (!storeConfig || !deliveryDate || !product) return 0;

  if (storeConfig.orderingMode === "WEEKLY_HOURS" && product.soldOutToday) return 0;
  if (deliveryDate.stockMode === "UNLIMITED") return UNLIMITED_STOCK;

  if (deliveryDate.stockMode === "BY_PRODUCT") {
    const stock = await prisma.productStock.findUnique({
      where: { productId_deliveryDateId: { productId, deliveryDateId } },
    });
    if (!stock || stock.quantityAvailable == null) return UNLIMITED_STOCK;
    return Math.max(0, stock.quantityAvailable - stock.quantitySold);
  }

  const stock = await prisma.stockGroupStock.findUnique({
    where: { stockGroupId_deliveryDateId: { stockGroupId: product.stockGroupId, deliveryDateId } },
  });
  if (!stock || stock.quantityAvailable == null) return UNLIMITED_STOCK;
  return Math.max(0, stock.quantityAvailable - stock.quantitySold);
}
