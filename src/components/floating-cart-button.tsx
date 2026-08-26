"use client";

import { usePathname } from "next/navigation";
import { ShoppingBagIcon } from "lucide-react";

import { useCart } from "@/lib/cart-context";

export function FloatingCartButton() {
  const pathname = usePathname();
  const { itemCount, openCart } = useCart();

  if (pathname.startsWith("/admin")) return null;

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label="Carrito"
      className="fixed top-4 right-4 z-[99] flex size-12 items-center justify-center rounded-full bg-background text-foreground shadow-lg ring-1 ring-border transition-transform hover:scale-110 active:scale-95 lg:hidden"
    >
      <ShoppingBagIcon className="size-5" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[0.7rem] font-medium text-primary-foreground">
          {itemCount}
        </span>
      )}
    </button>
  );
}
