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
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/order-status";
import { RepeatOrderButton } from "@/components/catalog/repeat-order-button";
import { CustomerSidebar } from "@/components/customer-sidebar";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export default async function MisPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { page } = await searchParams;
  const pageNumber = Math.max(1, parseInt(page as string) || 1);
  const take = 5;
  const skip = (pageNumber - 1) * take;

  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/pedidos");

  const [orders, totalOrders] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      include: { deliveryDate: true, items: true },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.order.count({ where: { userId: session.user.id } }),
  ]);
  
  const totalPages = Math.ceil(totalOrders / take);

  return (
    <div className="flex flex-1 flex-col">
      <StoreHero />
      <main className="relative z-1 -mt-6 mx-5 flex flex-1 flex-col gap-6 rounded-t-3xl bg-background px-4 py-6 lg:-mt-32 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-8 lg:shadow-2xl">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[240px_1fr] lg:items-start lg:gap-12">
          <CustomerSidebar />
          
          <div className="flex flex-col gap-6">
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
                        <Badge className={ORDER_STATUS_COLORS[o.status]}>
                          {ORDER_STATUS_LABELS[o.status]}
                        </Badge>
                      </div>
                    </Link>
                    <RepeatOrderButton orderId={o.id} compact />
                  </div>
                ))}
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    {pageNumber > 1 ? (
                      <Button variant="outline" size="sm" render={<Link href={`/pedidos?page=${pageNumber - 1}`} />}>
                        Anteriores
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>Anteriores</Button>
                    )}
                    <span className="text-sm text-muted-foreground">
                      Pág. {pageNumber} de {totalPages}
                    </span>
                    {pageNumber < totalPages ? (
                      <Button variant="outline" size="sm" render={<Link href={`/pedidos?page=${pageNumber + 1}`} />}>
                        Siguientes
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>Siguientes</Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
