import Link from "next/link";
import {
  WalletIcon,
  TrendingUpIcon,
  ClipboardListIcon,
  PackageIcon,
  CalendarDaysIcon,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export default async function AdminDashboard() {
  const { session } = await requireAdmin();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    productCount,
    openDatesCount,
    pendingOrdersCount,
    salesToday,
    salesMonth,
    recentOrders,
  ] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.deliveryDate.count({ where: { status: "OPEN" } }),
    prisma.order.count({
      where: { status: { in: ["PENDING_PAYMENT", "PAYMENT_REVIEW"] } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: "CANCELLED" }, createdAt: { gte: startOfToday } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: "CANCELLED" }, createdAt: { gte: startOfMonth } },
    }),
    prisma.order.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const stats = [
    { label: "Ventas hoy", value: formatPrice(Number(salesToday._sum.total ?? 0)), icon: WalletIcon },
    { label: "Ventas del mes", value: formatPrice(Number(salesMonth._sum.total ?? 0)), icon: TrendingUpIcon },
    { label: "Pedidos pendientes", value: pendingOrdersCount, icon: ClipboardListIcon },
    { label: "Productos activos", value: productCount, icon: PackageIcon },
    { label: "Fechas abiertas", value: openDatesCount, icon: CalendarDaysIcon },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Hola, {session?.user?.name}</h1>
        <p className="text-sm text-muted-foreground">Panel de administración</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{s.value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Pedidos recientes</CardTitle>
          <Link href="/admin/pedidos" className="text-sm text-primary underline">
            Ver todos
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Todavía no hay pedidos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/admin/pedidos/${o.id}`} className="font-medium underline">
                        {o.user?.name ?? o.user?.email ?? o.guestName ?? o.guestEmail ?? "Invitado"}
                      </Link>
                    </TableCell>
                    <TableCell>{dateFormatter.format(o.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "CANCELLED" ? "secondary" : "default"}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(Number(o.total))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
