"use client";

import Link from "next/link";
import { ShoppingBagIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { CartItemRow } from "./cart-item-row";

export function CartSheet() {
  const { cart, itemCount, subtotal, isCartOpen, closeCart } = useCart();

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md" showCloseButton={false}>
        <div className="flex items-center justify-between border-b p-4">
          <SheetTitle>Tu pedido</SheetTitle>
          <SheetClose
            render={<Button variant="ghost" size="icon-sm" aria-label="Cerrar" />}
          >
            <XIcon />
          </SheetClose>
        </div>

        {itemCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-muted">
              <ShoppingBagIcon className="size-9 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">Pedido vacío</p>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
              {cart.items.map((item) => (
                <CartItemRow key={item.productVariantId} item={item} />
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t p-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <Button
                size="lg"
                render={<Link href="/checkout" />}
                onClick={closeCart}
              >
                Finalizar compra
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
