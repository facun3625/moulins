"use client";

import Link from "next/link";
import Image from "next/image";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";

export default function CartPage() {
  const { cart, itemCount, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <div className="flex flex-1 flex-col">
      <StoreHero />
      <main className="relative z-1 -mt-6 mx-5 flex flex-1 flex-col gap-6 rounded-t-3xl bg-background px-4 py-4 lg:-mt-32 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:shadow-2xl">
        <h1 className="text-xl font-semibold">Tu pedido</h1>

        {itemCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-muted-foreground">Todavía no agregaste nada.</p>
            <Button render={<Link href="/" />} className="mt-2">
              Ver catálogo
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {cart.items.map((item) => (
                <div
                  key={item.productVariantId}
                  className="flex items-start gap-3 rounded-2xl border p-3"
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        width={64}
                        height={64}
                        className="size-16 object-cover"
                      />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">{item.productName}</span>
                    {item.variantLabel !== "Único" && (
                      <span className="truncate text-xs text-muted-foreground">{item.variantLabel}</span>
                    )}
                    <span className="font-semibold text-primary">
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
                    <span className="w-4 text-center font-medium">{item.quantity}</span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      disabled={item.quantity >= item.maxQuantity}
                      onClick={() => updateQuantity(item.productVariantId, item.quantity + 1)}
                    >
                      <PlusIcon className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeItem(item.productVariantId)}
                      aria-label="Quitar"
                    >
                      <Trash2Icon className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-3 border-t pt-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <Button size="lg" render={<Link href="/checkout" />}>
                Continuar
              </Button>
            </div>
          </>
        )}
      </main>
      <StoreFooter />
    </div>
  );
}
