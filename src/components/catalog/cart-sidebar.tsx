"use client";

import { ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import { CartItemRow } from "./cart-item-row";

export function CartSidebar({ className }: { className?: string }) {
  const { cart, itemCount, subtotal, openCart } = useCart();

  return (
    <aside
      className={cn(
        "flex flex-col rounded-2xl border bg-background px-6 pt-2.5 pb-6 shadow-sm",
        className,
      )}
    >
      <h2 className="mb-5 text-sm font-semibold">Mi pedido</h2>

      {itemCount === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted">
            <ShoppingBagIcon className="size-9 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">Pedido vacío</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-5">
            {cart.items.map((item) => (
              <CartItemRow key={item.productVariantId} item={item} />
            ))}
          </div>

          <div className="mt-[30px] flex flex-col gap-3 border-t pt-5">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <Button type="button" size="lg" onClick={openCart}>
              Ver pedido
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
