import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { FULFILLMENT_TYPE_LABELS, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/order-status";
import { RepeatOrderButton } from "@/components/catalog/repeat-order-button";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      deliveryDate: true,
      pickupSlot: true,
      coupon: true,
      paymentProof: true,
      items: {
        include: {
          productVariant: {
            include: { product: { include: { images: { orderBy: { order: "asc" }, take: 1 } } } },
          },
        },
      },
    },
  });
  if (!order) notFound();
  // Pedido de una cuenta: solo lo puede ver su dueño. Pedido de invitado
  // (userId null): el link en sí es el acceso, no hace falta estar logueado.
  if (order.userId && order.userId !== session?.user?.id) {
    redirect(`/login?callbackUrl=/pedidos/${id}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <StoreHero />
      <div className="relative z-1 -mt-6 mx-5 flex flex-1 flex-col rounded-t-3xl bg-background lg:-mt-32 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:shadow-2xl">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6 lg:max-w-3xl">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-semibold">Pedido del {dateFormatter.format(order.createdAt)}</h1>
            <Badge variant={order.status === "CANCELLED" ? "secondary" : "default"}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </div>

          <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-3 rounded-2xl border p-4">
            {order.items.map((item) => {
              const image = item.productVariant.product.images[0];
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {image && (
                      <Image
                        src={image.url}
                        alt={item.productVariant.product.name}
                        width={56}
                        height={56}
                        className="size-14 object-cover"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {item.productVariant.product.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.quantity} × {formatPrice(Number(item.unitPrice))}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {formatPrice(Number(item.unitPrice) * item.quantity)}
                  </span>
                </div>
              );
            })}
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
            {order.pointsEarned > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Puntos sumados</span>
                <span>+{order.pointsEarned}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 rounded-2xl border p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Comprador</span>
              <span className="font-medium">{order.user?.name ?? order.guestName ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{order.user?.email ?? order.guestEmail ?? "—"}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tipo de entrega</span>
              <span className="font-medium">{FULFILLMENT_TYPE_LABELS[order.fulfillmentType]}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Fecha</span>
              <span className="font-medium">{dateFormatter.format(order.deliveryDate.date)}</span>
            </div>
            {order.fulfillmentType === "DELIVERY" ? (
              order.deliveryAddress && (
                <div className="flex items-center justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">Dirección</span>
                  <span className="text-right font-medium">{order.deliveryAddress}</span>
                </div>
              )
            ) : (
              order.pickupSlot && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Horario de retiro</span>
                  <span className="font-medium">{order.pickupSlot.label}</span>
                </div>
              )
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Teléfono</span>
              <span className="font-medium">{order.deliveryPhone}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Medio de pago</span>
              <span className="font-medium">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
            </div>
            {order.paymentProof && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Comprobante</span>
                <a
                  href={order.paymentProof.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:opacity-80"
                >
                  Ver comprobante
                </a>
              </div>
            )}
          </div>
          </div>
          </div>

          <div className="flex gap-2">
            <Button size="lg" variant="outline" className="flex-1" render={<Link href="/" />}>
              Volver a la tienda
            </Button>
            {session?.user && order.userId === session.user.id && (
              <RepeatOrderButton orderId={order.id} className="flex-1" />
            )}
          </div>
        </main>
      </div>
      <StoreFooter />
    </div>
  );
}
