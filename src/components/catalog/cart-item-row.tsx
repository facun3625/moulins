"use client";

import { useState } from "react";
import Image from "next/image";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { roomToAdd, useCart, type CartItem } from "@/lib/cart-context";
import { checkRemainingStock } from "./stock-actions";

// Fila de un producto en el carrito (usada en el panel de escritorio y en
// el sheet mobile) — el "+" revalida el stock real contra el server antes
// de sumar, para no dejar pasar de lo que en verdad queda disponible.
export function CartItemRow({ item }: { item: CartItem }) {
  const { cart, updateQuantity, removeItem } = useCart();
  const [checking, setChecking] = useState(false);

  async function handleIncrement() {
    if (!cart.deliveryDateId) return;
    setChecking(true);
    const fresh = await checkRemainingStock(cart.deliveryDateId, item.productId);
    setChecking(false);
    const room = roomToAdd(cart.items, item.stockGroupId, fresh, item.productVariantId);
    if (room <= 0) {
      toast.error(`No queda más stock disponible de "${item.productName}".`);
      return;
    }
    updateQuantity(item.productVariantId, item.quantity + 1, fresh);
  }

  return (
    <div className="flex items-start gap-3.5">
      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
        {item.imageUrl && (
          <Image
            src={item.imageUrl}
            alt={item.productName}
            width={56}
            height={56}
            className="size-14 object-cover"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium">{item.productName}</span>
        <span className="text-sm font-semibold text-primary">
          {formatPrice(item.unitPrice * item.quantity)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-center">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => updateQuantity(item.productVariantId, item.quantity - 1)}
        >
          <MinusIcon className="size-3.5" />
        </Button>
        <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
        <Button type="button" size="icon-sm" variant="outline" disabled={checking} onClick={handleIncrement}>
          <PlusIcon className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => removeItem(item.productVariantId)}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
