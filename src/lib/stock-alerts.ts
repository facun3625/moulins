import { prisma } from "@/lib/prisma";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export type StockAlert = {
  deliveryDateId: string;
  deliveryDateLabel: string;
  outOfStockNames: string[];
};

// Fechas abiertas (tomando pedidos ahora) donde algún grupo de stock o
// producto con tope cargado ya se agotó — para avisarle al admin antes de
// que se entere por un cliente que no pudo comprar.
export async function getStockAlerts(): Promise<StockAlert[]> {
  const openDates = await prisma.deliveryDate.findMany({
    where: { status: "OPEN" },
    include: {
      stockGroupStock: { include: { stockGroup: true } },
      productStock: { include: { product: true } },
    },
    orderBy: { date: "asc" },
  });

  const alerts: StockAlert[] = [];
  for (const d of openDates) {
    const outOfStockNames: string[] = [];
    for (const sgs of d.stockGroupStock) {
      if (sgs.quantityAvailable != null && sgs.quantitySold >= sgs.quantityAvailable) {
        outOfStockNames.push(sgs.stockGroup.name);
      }
    }
    for (const ps of d.productStock) {
      if (ps.quantityAvailable != null && ps.quantitySold >= ps.quantityAvailable) {
        outOfStockNames.push(ps.product.name);
      }
    }
    if (outOfStockNames.length > 0) {
      alerts.push({ deliveryDateId: d.id, deliveryDateLabel: dateFormatter.format(d.date), outOfStockNames });
    }
  }
  return alerts;
}
