import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getStoreSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/format";
import { FULFILLMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/order-status";
import { PrintButton } from "./print-button";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "full" });
const createdAtFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hour12: false });

export default async function ComandaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const [order, storeSettings] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        deliveryDate: true,
        pickupSlot: true,
        items: { include: { productVariant: { include: { product: true } } } },
      },
    }),
    getStoreSettings(),
  ]);
  if (!order) notFound();

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-6 text-foreground print:px-0 print:py-0">
      <PrintButton />

      <div className="flex flex-col items-center gap-1 border-b border-dashed pb-3 text-center">
        <span className="text-lg font-bold">{storeSettings.storeName}</span>
        <span className="text-sm font-semibold uppercase tracking-wide">Comanda</span>
        <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(-8)}</span>
        <span className="text-xs text-muted-foreground">{createdAtFormatter.format(order.createdAt)}</span>
      </div>

      <div className="flex flex-col gap-1 border-b border-dashed pb-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Cliente</span>
          <span className="font-medium">
            {order.user?.name ?? order.user?.email ?? order.guestName ?? order.guestEmail ?? "Invitado"}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Teléfono</span>
          <span className="font-medium">{order.deliveryPhone}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Entrega</span>
          <span className="font-medium">{FULFILLMENT_TYPE_LABELS[order.fulfillmentType]}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Fecha</span>
          <span className="text-right font-medium capitalize">
            {dateFormatter.format(order.deliveryDate.date)}
          </span>
        </div>
        {order.fulfillmentType === "PICKUP" && order.pickupSlot && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Horario</span>
            <span className="font-medium">{order.pickupSlot.label}</span>
          </div>
        )}
        {order.fulfillmentType === "DELIVERY" && order.deliveryAddress && (
          <div className="flex justify-between gap-2">
            <span className="shrink-0 text-muted-foreground">Dirección</span>
            <span className="text-right font-medium">{order.deliveryAddress}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-b border-dashed pb-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-base">
            <span className="font-bold">{item.quantity}×</span>
            <span className="flex-1 font-medium">
              {item.productVariant.product.name}
              {(item.productVariant.gusto || item.productVariant.tamano) && (
                <span className="block text-sm text-muted-foreground">
                  {[item.productVariant.gusto, item.productVariant.tamano].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Medio de pago</span>
          <span className="font-medium">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
        </div>
        <div className="flex justify-between gap-2 text-base font-bold">
          <span>Total</span>
          <span>{formatPrice(Number(order.total))}</span>
        </div>
        {order.paymentMethod === "CASH_ON_DELIVERY" && (
          <span className="text-center text-xs text-muted-foreground">
            Cobrar en efectivo al entregar
          </span>
        )}
      </div>
    </div>
  );
}
