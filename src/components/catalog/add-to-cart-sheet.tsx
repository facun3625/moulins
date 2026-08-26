"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, MinusIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { roomToAdd, useCart } from "@/lib/cart-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import { toWhatsAppLink } from "@/lib/social-links";
import type { CatalogProduct } from "./catalog";
import { WhatsAppIcon } from "./social-icons";
import { useQuickAdd } from "./use-quick-add";
import { checkRemainingStock } from "./stock-actions";

export function AddToCartSheet({
  product,
  deliveryDateId,
  onClose,
  readOnly = false,
}: {
  product: CatalogProduct | null;
  deliveryDateId: string;
  onClose: () => void;
  readOnly?: boolean;
}) {
  const quickAdd = useQuickAdd(deliveryDateId);
  const { cart } = useCart();
  const { addToCartLabel, whatsapp } = useStoreSettings();

  // Keep showing the last selected product while the dialog animates closed
  // (product briefly becomes null), and reset the variant/quantity pick
  // whenever a *different* product opens — both without an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [displayProduct, setDisplayProduct] = useState(product);
  const [variantId, setVariantId] = useState(() => firstAvailableVariantId(product));
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [checking, setChecking] = useState(false);

  if (product && product.id !== displayProduct?.id) {
    setDisplayProduct(product);
    setVariantId(firstAvailableVariantId(product));
    setQuantity(1);
    setImageIndex(0);
  }

  if (!displayProduct) return null;

  const whatsappHref = whatsapp
    ? `${toWhatsAppLink(whatsapp)}?text=${encodeURIComponent(`Hola! Quería consultar por "${displayProduct.name}"`)}`
    : null;

  const variant = displayProduct.variants.find((v) => v.id === variantId);
  const total = variant ? variant.price * quantity : 0;
  // Cuánto se puede sumar todavía, descontando lo que ya haya en el
  // carrito para este producto o para sus hermanos de pozo compartido.
  const addRoom = variant
    ? roomToAdd(cart.items, displayProduct.stockGroupId, variant.remaining, variant.id)
    : 0;
  const hasMultipleVariants = displayProduct.variants.length > 1;
  const images = displayProduct.images.length > 0 ? displayProduct.images : displayProduct.imageUrl ? [displayProduct.imageUrl] : [];
  const hasMultipleImages = images.length > 1;

  function showPrevImage() {
    setImageIndex((i) => (i - 1 + images.length) % images.length);
  }

  function showNextImage() {
    setImageIndex((i) => (i + 1) % images.length);
  }

  async function handleAdd() {
    if (!displayProduct || !variant) return;
    setChecking(true);
    const fresh = await checkRemainingStock(deliveryDateId, displayProduct.id);
    setChecking(false);
    const room = roomToAdd(cart.items, displayProduct.stockGroupId, fresh, variant.id);
    if (room <= 0) {
      toast.error(`Se agotó el stock de "${displayProduct.name}".`);
      return;
    }
    if (room < quantity) {
      toast.error(`Solo quedan ${room} disponibles de "${displayProduct.name}".`);
      setQuantity(room);
      return;
    }
    quickAdd(
      {
        productVariantId: variant.id,
        productId: displayProduct.id,
        productName: displayProduct.name,
        variantLabel: variant.label,
        unitPrice: variant.price,
        imageUrl: displayProduct.imageUrl,
        maxQuantity: fresh,
        stockGroupId: displayProduct.stockGroupId,
      },
      quantity,
    );
    onClose();
  }

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-sm flex-col gap-0 overflow-hidden rounded-2xl p-0"
      >
        <DialogTitle className="sr-only">{displayProduct.name}</DialogTitle>

        {images.length > 0 && (
          <div className="relative shrink-0">
            <Image
              src={images[imageIndex]}
              alt={displayProduct.name}
              width={640}
              height={480}
              className="aspect-[4/3] w-full rounded-t-2xl object-cover"
            />
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-3 right-3 rounded-full bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Cerrar</span>
            </DialogClose>

            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={showPrevImage}
                  className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background"
                >
                  <ChevronLeftIcon className="size-4" />
                  <span className="sr-only">Foto anterior</span>
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background"
                >
                  <ChevronRightIcon className="size-4" />
                  <span className="sr-only">Foto siguiente</span>
                </button>
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {images.map((img, i) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setImageIndex(i)}
                      className={cn(
                        "size-1.5 rounded-full transition-colors",
                        i === imageIndex ? "bg-white" : "bg-white/50",
                      )}
                    >
                      <span className="sr-only">Foto {i + 1}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-bold text-foreground">
              {displayProduct.name}
            </h2>
            {displayProduct.description && (
              <p className="text-sm text-muted-foreground">{displayProduct.description}</p>
            )}
          </div>

          {hasMultipleVariants && (
            <div className="flex flex-col gap-2">
              {displayProduct.variants.map((v) => {
                const disabled = roomToAdd(cart.items, displayProduct.stockGroupId, v.remaining, v.id) <= 0;
                const active = v.id === variantId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-40",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    <span className="font-medium">{v.label}</span>
                    {!displayProduct.contactToBuy && (
                      <span className="flex items-center gap-2">
                        {disabled && (
                          <span className="text-xs text-muted-foreground">Sin stock</span>
                        )}
                        <span className="font-semibold">{formatPrice(v.price)}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!readOnly && !displayProduct.contactToBuy && (
            <div className="flex w-full items-center justify-between rounded-full border bg-background px-1.5 py-1.5 shadow-sm">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground disabled:opacity-40"
              >
                <MinusIcon className="size-4" />
              </button>
              <span className="w-8 text-center text-base font-semibold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                disabled={!variant || quantity >= addRoom}
                onClick={() => setQuantity((q) => Math.min(addRoom, q + 1))}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              >
                <PlusIcon className="size-4" />
              </button>
            </div>
          )}
          {!readOnly && !displayProduct.contactToBuy && addRoom <= 0 && (
            <p className="text-center text-xs text-muted-foreground">
              No queda stock disponible para este producto.
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-4">
          {displayProduct.contactToBuy ? (
            whatsappHref ? (
              <Button
                size="lg"
                render={<a href={whatsappHref} target="_blank" rel="noreferrer" />}
                className="w-full justify-center gap-2 rounded-full bg-emerald-500 px-6 text-white hover:bg-emerald-600"
              >
                <WhatsAppIcon className="size-4" />
                Consultar por WhatsApp
              </Button>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Este producto es a consulta — escribinos para cotizarlo.
              </p>
            )
          ) : readOnly ? (
            <p className="text-center text-sm text-muted-foreground">
              Todavía no se puede pedir — volvé a mirar cuando abramos.
            </p>
          ) : (
            <Button
              size="lg"
              disabled={!variant || addRoom <= 0 || checking}
              onClick={handleAdd}
              className="w-full justify-between gap-3 rounded-full px-6"
            >
              <span className="truncate">{checking ? "Verificando..." : addToCartLabel}</span>
              <span className="shrink-0">{formatPrice(total)}</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function firstAvailableVariantId(product: CatalogProduct | null) {
  // Preferimos una con stock, pero si está todo agotado igual seleccionamos
  // la primera para poder mostrar su precio y el mensaje de "sin stock".
  return (product?.variants.find((v) => v.remaining > 0) ?? product?.variants[0])?.id ?? null;
}
