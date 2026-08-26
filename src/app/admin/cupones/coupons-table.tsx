import Link from "next/link";

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
import type { Coupon } from "@/generated/prisma/client";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

function formatDiscount(type: "PERCENT" | "FIXED", value: number) {
  return type === "PERCENT" ? `${value}%` : formatPrice(value);
}

export type CouponRow = Coupon & { _count: { redemptions: number } };

export function CouponsTable({
  coupons,
  showPointsColumn,
  emptyLabel,
}: {
  coupons: CouponRow[];
  showPointsColumn: boolean;
  emptyLabel: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Descuento</TableHead>
          {showPointsColumn && <TableHead>Puntos</TableHead>}
          <TableHead>Usos</TableHead>
          <TableHead>Vence</TableHead>
          <TableHead>Activo</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {coupons.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">
              <Link href={`/admin/cupones/${c.id}`} className="hover:text-primary">
                {c.code}
              </Link>
            </TableCell>
            <TableCell>{formatDiscount(c.discountType, Number(c.discountValue))}</TableCell>
            {showPointsColumn && <TableCell>{c.pointsCost} pts</TableCell>}
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
            <TableCell colSpan={showPointsColumn ? 7 : 6} className="text-center text-muted-foreground">
              {emptyLabel}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
