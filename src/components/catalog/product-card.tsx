"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRightIcon, MinusIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { formatPrice } from "@/lib/format";
import { roomToAdd, useCart } from "@/lib/cart-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import { toWhatsAppLink } from "@/lib/social-links";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "./catalog";
import { WhatsAppIcon } from "./social-icons";
import { useQuickAdd } from "./use-quick-add";
import { checkRemainingStock } from "./stock-actions";

export function ProductCard({
  product,
  deliveryDateId,
  onSelect,
  cardRef,
  highlighted,
  readOnly = false,
}: {
  product: CatalogProduct;
  deliveryDateId: string;
  onSelect: () => void;
  cardRef?: (el: HTMLDivElement | null) => void;
  highlighted?: boolean;
  readOnly?: boolean;
}) {
  const { cart, updateQuantity } = useCart();
  const quickAdd = useQuickAdd(deliveryDateId);
  const { addToCartLabel, whatsapp } = useStoreSettings();
  const [checking, setChecking] = useState(false);

  const whatsappHref = whatsapp
    ? `${toWhatsAppLink(whatsapp)}?text=${encodeURIComponent(`Hola! Quería consultar por "${product.name}"`)}`
    : null;

  // El precio y la variante "única" se calculan sobre TODAS las variantes,
  // no solo las que tienen stock — un producto agotado sigue mostrándose,
  // solo que sin poder agregarlo.
  const singleVariant = product.variants.length === 1 ? product.variants[0] : null;
  const cartItem = singleVariant
    ? cart.items.find((i) => i.productVariantId === singleVariant.id)
    : null;
  const quantity = cartItem?.quantity ?? 0;
  // Si el producto comparte pozo de stock con otros, esto ya descuenta lo
  // que esos otros productos tengan en el carrito.
  const addRoom = singleVariant
    ? roomToAdd(cart.items, singleVariant.stockGroupId, singleVariant.remaining, singleVariant.id)
    : 0;
  const outOfStock = singleVariant != null && addRoom <= 0;

  const availablePrices = product.variants.map((v) => v.price);
  const minPrice = Math.min(...availablePrices);
  const maxPrice = Math.max(...availablePrices);

  // Antes de sumar al carrito, revalidamos el stock real contra el server:
  // lo que trae la página puede haber quedado viejo (otra compra, un ajuste
  // del admin), y no queremos dejar agregar algo que ya no hay.
  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (!singleVariant) {
      onSelect();
      return;
    }
    setChecking(true);
    const fresh = await checkRemainingStock(deliveryDateId, singleVariant.id);
    setChecking(false);
    const room = roomToAdd(cart.items, singleVariant.stockGroupId, fresh, singleVariant.id);
    if (room <= 0) {
      toast.error(`Se agotó el stock de "${product.name}".`);
      return;
    }
    quickAdd(
      {
        productVariantId: singleVariant.id,
        productId: product.id,
        productName: product.name,
        variantLabel: singleVariant.label,
        unitPrice: singleVariant.price,
        imageUrl: product.imageUrl,
        maxQuantity: fresh,
        stockGroupId: singleVariant.stockGroupId,
      },
      1,
    );
  }

  async function handleIncrement(e: React.MouseEvent) {
    e.stopPropagation();
    if (!singleVariant) return;
    setChecking(true);
    const fresh = await checkRemainingStock(deliveryDateId, singleVariant.id);
    setChecking(false);
    const room = roomToAdd(cart.items, singleVariant.stockGroupId, fresh, singleVariant.id);
    if (room <= 0) {
      toast.error(`No queda más stock disponible de "${product.name}".`);
      return;
    }
    updateQuantity(singleVariant.id, quantity + 1, fresh);
  }

  function handleDecrement(e: React.MouseEvent) {
    e.stopPropagation();
    if (!singleVariant) return;
    updateQuantity(singleVariant.id, quantity - 1);
  }

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className={cn(
        "flex cursor-pointer items-stretch gap-2.5 rounded-xl border p-2.5 text-left transition-shadow active:bg-accent",
        highlighted && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{product.name}</span>
          {product.description && (
            <span className="line-clamp-2 text-xs text-muted-foreground">
              {product.description}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-primary">
            {product.contactToBuy
              ? "Consultar precio"
              : minPrice === maxPrice
                ? formatPrice(quantity > 0 ? minPrice * quantity : minPrice)
                : `Desde ${formatPrice(minPrice)}`}
          </span>
          <button
            type="button"
            onClick={onSelect}
            className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground"
          >
            Ver más
            <ChevronRightIcon className="size-3" />
          </button>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center justify-start gap-1.5">
        <div className="size-[88px] overflow-hidden rounded-xl bg-muted">
          {product.imageUrl && (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={88}
              height={88}
              className="size-[88px] object-cover"
            />
          )}
        </div>

        {product.contactToBuy ? (
          whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-[88px] items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-xs font-semibold text-white shadow-sm"
            >
              <WhatsAppIcon className="size-3.5" />
              Consultar
            </a>
          )
        ) : readOnly ? null : quantity > 0 ? (
          <div className="flex h-8 w-[88px] items-center justify-between gap-1 rounded-xl border bg-background px-1 shadow-sm">
            <button
              type="button"
              onClick={handleDecrement}
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"
            >
              <MinusIcon className="size-3.5" />
            </button>
            <span className="w-5 text-center text-xs font-semibold">{quantity}</span>
            <button
              type="button"
              disabled={addRoom <= 0 || checking}
              onClick={handleIncrement}
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock || checking}
            className={cn(
              "flex h-8 w-auto min-w-[88px] max-w-[140px] items-center justify-center truncate rounded-xl px-3 text-xs font-semibold shadow-sm",
              outOfStock
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground disabled:opacity-40",
            )}
          >
            {outOfStock ? "Sin stock" : addToCartLabel}
          </button>
        )}
      </div>
    </div>
  );
}
