import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PrinterIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { FULFILLMENT_TYPE_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_METHOD_LABELS } from "@/lib/order-status";
import { OrderReviewActions } from "./order-review-actions";
import { OrderStatusActions } from "./order-status-actions";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", hour12: false });

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      deliveryDate: true,
      pickupSlot: true,
      coupon: true,
      paymentProof: true,
      items: { include: { productVariant: { include: { product: true } } } },
    },
  });
  if (!order) notFound();

  const isProofPending =
    order.paymentMethod === "TRANSFER" && order.paymentProof?.status === "PENDING";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href="/admin/pedidos" aria-label="Volver a pedidos" />}
          >
            <ArrowLeftIcon />
          </Button>
          <h1 className="truncate text-xl font-semibold">
            Pedido de {order.user?.name ?? order.user?.email ?? order.guestName ?? order.guestEmail ?? "invitado"}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!order.user && <Badge variant="secondary">Invitado</Badge>}
          <Badge className={ORDER_STATUS_COLORS[order.status]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/pedidos/${order.id}/comanda`} target="_blank" />}
          >
            <PrinterIcon className="size-4" />
            Comanda
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <span>Email: {order.user?.email ?? order.guestEmail ?? "—"}</span>
        <span>Teléfono: {order.deliveryPhone}</span>
        <span>Tipo de entrega: {FULFILLMENT_TYPE_LABELS[order.fulfillmentType]}</span>
        {order.fulfillmentType === "DELIVERY" && order.deliveryAddress && (
          <span>Dirección: {order.deliveryAddress}</span>
        )}
        {order.fulfillmentType === "PICKUP" && order.pickupSlot && (
          <span>Horario de retiro: {order.pickupSlot.label}</span>
        )}
        <span>Entrega: {dateFormatter.format(order.deliveryDate.date)}</span>
        <span>Pedido creado: {dateFormatter.format(order.createdAt)}</span>
        <span>Medio de pago: {PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {item.quantity}× {item.productVariant.product.name}
              {(item.productVariant.gusto || item.productVariant.tamano) && (
                <span className="text-muted-foreground">
                  {" "}
                  ({[item.productVariant.gusto, item.productVariant.tamano].filter(Boolean).join(" · ")})
                </span>
              )}
            </span>
            <span className="font-medium">{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
          </div>
        ))}
        {Number(order.deliveryFee) > 0 && (
          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">Envío</span>
            <span>{formatPrice(Number(order.deliveryFee))}</span>
          </div>
        )}
        {Number(order.discountFromCoupon) > 0 && (
          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">
              Descuento{order.coupon && ` (${order.coupon.code})`}
            </span>
            <span>-{formatPrice(Number(order.discountFromCoupon))}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
          <span>Total</span>
          <span>{formatPrice(Number(order.total))}</span>
        </div>
      </div>

      {order.paymentProof && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Comprobante de transferencia</span>
            <a
              href={order.paymentProof.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:opacity-80"
            >
              Ver comprobante
            </a>
          </div>
          {isProofPending && <OrderReviewActions orderId={order.id} />}
        </div>
      )}

      {!isProofPending && <OrderStatusActions orderId={order.id} status={order.status} />}
    </div>
  );
}
