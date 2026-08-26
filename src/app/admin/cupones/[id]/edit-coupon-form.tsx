"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateCoupon } from "../actions";

type CouponData = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  usageLimit: number | null;
  expiresAt: string | null;
  pointsCost: number;
};

export function EditCouponForm({ coupon, pointsCoupon }: { coupon: CouponData; pointsCoupon: boolean }) {
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(coupon.discountType);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          try {
            await updateCoupon(coupon.id, formData);
            toast.success("Cupón actualizado");
            router.push("/admin/cupones");
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo guardar");
          }
        })
      }
      className="flex flex-col gap-4"
    >
      {pointsCoupon && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="pointsCost">Costo en puntos</Label>
          <Input id="pointsCost" name="pointsCost" type="number" min="1" defaultValue={coupon.pointsCost} required />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="code">{pointsCoupon ? "Código interno" : "Código"}</Label>
        <Input id="code" name="code" defaultValue={coupon.code} required className="uppercase" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tipo de descuento</Label>
        <input type="hidden" name="discountType" value={discountType} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDiscountType("PERCENT")}
            className={cn(
              "flex-1 rounded-xl border px-4 py-3 text-left font-medium transition-colors",
              discountType === "PERCENT" ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            Porcentaje
          </button>
          <button
            type="button"
            onClick={() => setDiscountType("FIXED")}
            className={cn(
              "flex-1 rounded-xl border px-4 py-3 text-left font-medium transition-colors",
              discountType === "FIXED" ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            Monto fijo
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="discountValue">
          {discountType === "PERCENT" ? "Porcentaje de descuento" : "Monto de descuento"}
        </Label>
        <Input
          id="discountValue"
          name="discountValue"
          type="number"
          min="0"
          step={discountType === "PERCENT" ? "1" : "0.01"}
          max={discountType === "PERCENT" ? "100" : undefined}
          defaultValue={coupon.discountValue}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="usageLimit">Límite de usos (opcional)</Label>
        <Input
          id="usageLimit"
          name="usageLimit"
          type="number"
          min="1"
          placeholder="Sin límite"
          defaultValue={coupon.usageLimit ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="expiresAt">Vencimiento (opcional)</Label>
        <Input id="expiresAt" name="expiresAt" type="date" defaultValue={coupon.expiresAt ?? ""} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button type="button" variant="outline" render={<Link href="/admin/cupones" />}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
