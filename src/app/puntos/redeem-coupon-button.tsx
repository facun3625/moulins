"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { redeemCoupon } from "./actions";

export function RedeemCouponButton({ couponId, disabled }: { couponId: string; disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        await redeemCoupon(couponId);
        toast.success("Cupón canjeado — ya lo podés usar en tu próximo pedido");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo canjear");
      }
    });
  }

  return (
    <Button size="sm" disabled={disabled || pending} onClick={handleClick}>
      {pending ? "Canjeando…" : "Canjear"}
    </Button>
  );
}
