"use client";

import { ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

export function CartBar({ className }: { className?: string }) {
  const { itemCount, subtotal, openCart } = useCart();

  if (itemCount === 0) return null;

  return (
    <div className={cn("sticky bottom-0 z-10 border-t bg-background/95 p-3 backdrop-blur", className)}>
      <Button
        type="button"
        onClick={openCart}
        size="lg"
        className="flex w-full items-center justify-between px-4"
      >
        <span className="flex items-center gap-2">
          <ShoppingBagIcon className="size-4" />
          {itemCount} {itemCount === 1 ? "producto" : "productos"}
        </span>
        <span>{formatPrice(subtotal)}</span>
      </Button>
    </div>
  );
}
