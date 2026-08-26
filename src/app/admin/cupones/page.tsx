import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CouponsTable } from "./coupons-table";

export default async function CouponsPage() {
  await requireAdmin();

  const coupons = await prisma.coupon.findMany({
    include: { _count: { select: { redemptions: true } } },
    orderBy: { createdAt: "desc" },
  });

  const normales = coupons.filter((c) => c.pointsCost === 0);
  const porPuntos = coupons.filter((c) => c.pointsCost > 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Cupones</h1>

      <Tabs defaultValue="normales">
        <TabsList className="w-full max-w-sm">
          <TabsTrigger value="normales" className="flex-1">
            Cupones
          </TabsTrigger>
          <TabsTrigger value="puntos" className="flex-1">
            Por puntos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="normales" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Se usan escribiendo el código en el checkout.</p>
            <Button render={<Link href="/admin/cupones/nuevo" />} size="sm">
              Nuevo cupón
            </Button>
          </div>
          <CouponsTable
            coupons={normales}
            showPointsColumn={false}
            emptyLabel="Todavía no creaste ningún cupón."
          />
        </TabsContent>

        <TabsContent value="puntos" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              El cliente los canjea con puntos desde &quot;Mis puntos&quot; — no se usan tipeando el código.
            </p>
            <Button render={<Link href="/admin/cupones/nuevo-puntos" />} size="sm">
              Nuevo cupón por puntos
            </Button>
          </div>
          <CouponsTable
            coupons={porPuntos}
            showPointsColumn
            emptyLabel="Todavía no creaste ningún cupón por puntos."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
