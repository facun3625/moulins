import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import {
  COUNTED_ORDER_STATUSES,
  type CustomerStatsRow,
  type DeliveryDateOption,
  type OrderStatsRow,
} from "@/lib/stats";
import { StatsDashboard } from "./stats-dashboard";

const deliveryDateLabelFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export default async function EstadisticasPage() {
  await requireAdmin();

  const [orders, customers, deliveryDates] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: COUNTED_ORDER_STATUSES } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        total: true,
        status: true,
        paymentMethod: true,
        fulfillmentType: true,
        userId: true,
        deliveryDateId: true,
        pointsEarned: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            productVariant: {
              select: {
                product: {
                  select: { id: true, name: true, category: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    }),
    // Traemos todas las cuentas, no solo las de rol CUSTOMER — una cuenta
    // ADMIN que también compró (típico: el dueño probando o comprando para
    // sí mismo) es igual un cliente real y no debería desaparecer de las
    // estadísticas. Las cuentas de staff sin ningún pedido se filtran abajo.
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        orders: {
          where: { status: { in: COUNTED_ORDER_STATUSES } },
          orderBy: { createdAt: "desc" },
          select: { total: true, createdAt: true, deliveryPhone: true },
        },
        whatsappLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    // Solo fechas con al menos un pedido contado o un costo cargado — evita
    // llenar el selector con fechas futuras vacías.
    prisma.deliveryDate.findMany({
      where: {
        OR: [
          { orders: { some: { status: { in: COUNTED_ORDER_STATUSES } } } },
          { costs: { some: {} } },
        ],
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        costs: { orderBy: { createdAt: "desc" }, select: { id: true, label: true, amount: true } },
      },
    }),
  ]);

  const orderRows: OrderStatsRow[] = orders.map((o) => ({
    id: o.id,
    createdAt: o.createdAt.toISOString(),
    total: Number(o.total),
    status: o.status,
    paymentMethod: o.paymentMethod,
    fulfillmentType: o.fulfillmentType,
    userId: o.userId,
    deliveryDateId: o.deliveryDateId,
    pointsEarned: o.pointsEarned,
    items: o.items.map((i) => ({
      productId: i.productVariant.product.id,
      productName: i.productVariant.product.name,
      categoryName: i.productVariant.product.category.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })),
  }));

  const customerRows: CustomerStatsRow[] = customers
    .filter((u) => u.role === "CUSTOMER" || u.orders.length > 0)
    .map((u) => {
      const orderCount = u.orders.length;
      const totalSpent = u.orders.reduce((sum, o) => sum + Number(o.total), 0);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? u.orders.find((o) => o.deliveryPhone)?.deliveryPhone ?? null,
        createdAt: u.createdAt.toISOString(),
        orderCount,
        totalSpent,
        avgOrderValue: orderCount > 0 ? totalSpent / orderCount : 0,
        lastOrderAt: u.orders[0]?.createdAt.toISOString() ?? null,
        lastWhatsappAt: u.whatsappLogs[0]?.createdAt.toISOString() ?? null,
      };
    });

  const deliveryDateOptions: DeliveryDateOption[] = deliveryDates.map((d) => ({
    id: d.id,
    label: deliveryDateLabelFormatter.format(d.date),
    costs: d.costs.map((c) => ({ id: c.id, label: c.label, amount: Number(c.amount) })),
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Estadísticas</h1>
      <StatsDashboard orders={orderRows} customers={customerRows} deliveryDateOptions={deliveryDateOptions} />
    </div>
  );
}
