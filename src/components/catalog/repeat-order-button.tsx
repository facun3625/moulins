"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { getRepeatOrderItems } from "@/app/pedidos/[id]/actions";

export function RepeatOrderButton({
  orderId,
  className,
  compact = false,
}: {
  orderId: string;
  className?: string;
  compact?: boolean;
}) {
  const { addItem, confirmReplace, cart } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await getRepeatOrderItems(orderId);
      if (!result.open) {
        toast.error(result.reason);
        return;
      }

      const available = result.items.filter((i) => !i.unavailable && i.addableQuantity > 0);
      const unavailable = result.items.filter((i) => i.unavailable || i.addableQuantity <= 0);

      if (available.length === 0) {
        toast.error("Ninguno de los productos de ese pedido está disponible ahora");
        return;
      }

      let replacedCart = false;
      for (const item of available) {
        const cartItem = {
          productVariantId: item.productVariantId,
          productId: item.productId,
          productName: item.productName,
          variantLabel: item.variantLabel,
          unitPrice: item.unitPrice,
          imageUrl: item.imageUrl,
          maxQuantity: item.maxQuantity,
          stockGroupId: item.stockGroupId,
        };
        if (!replacedCart && cart.items.length > 0 && cart.deliveryDateId !== result.deliveryDateId) {
          confirmReplace(result.deliveryDateId, cartItem, item.addableQuantity);
          replacedCart = true;
        } else {
          addItem(result.deliveryDateId, cartItem, item.addableQuantity);
        }
      }

      if (unavailable.length > 0) {
        toast.warning(`Se agregaron ${available.length} productos — no disponibles: ${unavailable.map((i) => i.productName).join(", ")}`);
      } else {
        toast.success(`Se agregaron ${available.length} productos al carrito`);
      }
      router.push("/carrito");
    });
  }

  if (compact) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={pending}
        onClick={handleClick}
        aria-label="Repetir pedido"
        className={className}
      >
        <RefreshCcwIcon className={pending ? "size-4 animate-spin" : "size-4"} />
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" disabled={pending} onClick={handleClick} className={className}>
      <RefreshCcwIcon className="size-4" />
      {pending ? "Revisando…" : "Repetir pedido"}
    </Button>
  );
}
