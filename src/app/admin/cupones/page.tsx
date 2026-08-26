import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CouponToggle, CouponDeleteButton } from "./coupon-row-actions";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

function formatDiscount(type: "PERCENT" | "FIXED", value: number) {
  return type === "PERCENT" ? `${value}%` : formatPrice(value);
}

export default async function CouponsPage() {
  await requireAdmin();

  const coupons = await prisma.coupon.findMany({
    include: { _count: { select: { redemptions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Cupones</h1>
        <Button render={<Link href="/admin/cupones/nuevo" />} size="sm">
          Nuevo
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descuento</TableHead>
            <TableHead>Puntos</TableHead>
            <TableHead>Usos</TableHead>
            <TableHead>Vence</TableHead>
            <TableHead>Activo</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.code}</TableCell>
              <TableCell>{formatDiscount(c.discountType, Number(c.discountValue))}</TableCell>
              <TableCell>{c.pointsCost > 0 ? `${c.pointsCost} pts` : "—"}</TableCell>
              <TableCell>
                {c._count.redemptions}
                {c.usageLimit ? ` / ${c.usageLimit}` : ""}
              </TableCell>
              <TableCell>{c.expiresAt ? dateFormatter.format(c.expiresAt) : "—"}</TableCell>
              <TableCell>
                <CouponToggle id={c.id} enabled={c.active} />
              </TableCell>
              <TableCell className="text-right">
                <CouponDeleteButton id={c.id} />
              </TableCell>
            </TableRow>
          ))}

          {coupons.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Todavía no creaste ningún cupón.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
