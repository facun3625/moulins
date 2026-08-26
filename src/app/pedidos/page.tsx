import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardListIcon } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { RepeatOrderButton } from "@/components/catalog/repeat-order-button";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export default async function MisPedidosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/pedidos");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { deliveryDate: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-1 flex-col">
      <StoreHero />
      <main className="relative z-1 -mt-6 mx-5 flex flex-1 flex-col gap-3 rounded-t-3xl bg-background px-4 py-4 lg:-mt-32 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:shadow-2xl">
        <h1 className="text-xl font-semibold">Tus pedidos</h1>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <ClipboardListIcon className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium">Todavía no hiciste ningún pedido</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Acá vas a ver tu historial de pedidos y vas a poder repetir uno con un toque.
              </p>
            </div>
            <Button size="sm" render={<Link href="/" />} className="mt-2">
              Ver el catálogo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center gap-2 rounded-2xl border p-4">
                <Link
                  href={`/pedidos/${o.id}`}
                  className="flex flex-1 items-center justify-between gap-3 active:opacity-70"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Pedido del {dateFormatter.format(o.createdAt)}</span>
                    <span className="text-xs text-muted-foreground">
                      {o.items.length} {o.items.length === 1 ? "producto" : "productos"} · Entrega{" "}
                      {dateFormatter.format(o.deliveryDate.date)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold">{formatPrice(Number(o.total))}</span>
                    <Badge variant={o.status === "CANCELLED" ? "secondary" : "default"}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
                  </div>
                </Link>
                <RepeatOrderButton orderId={o.id} compact />
              </div>
            ))}
          </div>
        )}
      </main>
      <StoreFooter />
    </div>
  );
}
