"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronRightIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import type { FulfillmentType, PaymentMethodType } from "@/generated/prisma/client";
import type { TransferConfig } from "@/app/admin/pagos/page";
import { FULFILLMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/order-status";
import { getPickupSlotsForCheckout, placeOrder, validateCoupon } from "./actions";

type Profile = {
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
};

type AvailableCoupon = {
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
};

function formatCouponDiscount(coupon: AvailableCoupon) {
  return coupon.discountType === "PERCENT" ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue);
}

type PickupSlot = { id: string; label: string };

function StepCard({
  stepNumber,
  title,
  active,
  reached,
  summary,
  onEdit,
  children,
}: {
  stepNumber: number;
  title: string;
  active: boolean;
  reached: boolean;
  summary?: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const clickable = reached && !active;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active && cardRef.current) {
      // Pequeño delay para dejar que el paso se expanda y calcule su alto
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [active]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "rounded-2xl border p-4 transition-colors scroll-mt-4",
        active ? "border-primary" : "border-border",
        clickable && "cursor-pointer hover:border-primary/50 hover:bg-accent/40",
      )}
      onClick={clickable ? onEdit : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => (e.key === "Enter" || e.key === " ") && onEdit()
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              clickable || active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
            )}
          >
            {clickable ? <CheckIcon className="size-3.5" /> : stepNumber}
          </span>
          <span className="font-medium">{title}</span>
        </div>
        {clickable && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />}
      </div>

      {clickable && summary && (
        <p className="mt-1 pl-9 text-sm text-muted-foreground">{summary}</p>
      )}

      <div className={cn("flex-col gap-4", active ? "mt-4 flex" : "hidden")}>{children}</div>
    </div>
  );
}

type PaymentMethodOption = {
  type: PaymentMethodType;
  label: string | null;
  minPreviousOrders: number | null;
};

export function CheckoutForm({
  paymentMethods,
  previousOrderCount,
  transferConfig,
  availableFulfillmentTypes,
  deliveryFee,
  storeAddress,
  profile,
  availableCoupons,
}: {
  paymentMethods: PaymentMethodOption[];
  previousOrderCount: number;
  transferConfig: TransferConfig | null;
  availableFulfillmentTypes: FulfillmentType[];
  deliveryFee: number;
  storeAddress: string | null;
  profile: Profile | null;
  availableCoupons: AvailableCoupon[];
}) {
  const router = useRouter();
  const { cart, itemCount, subtotal, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType | null>(null);
  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([]);
  const [pickupSlotId, setPickupSlotId] = useState<string | null>(null);

  const [method, setMethod] = useState<PaymentMethodType | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();
  // El carrito se vacía apenas el pedido se confirma, pero la navegación a
  // la página de éxito tarda un instante — sin esto, en ese instante se ve
  // "tu carrito está vacío" en vez de un estado de carga.
  const [orderPlaced, setOrderPlaced] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(
    null,
  );
  const [couponPending, startCouponTransition] = useTransition();

  useEffect(() => {
    if (fulfillmentType !== "PICKUP" || !cart.deliveryDateId) return;
    let cancelled = false;
    getPickupSlotsForCheckout(cart.deliveryDateId).then((slots) => {
      if (cancelled) return;
      setPickupSlots(slots);
      setPickupSlotId(slots.length === 1 ? slots[0].id : null);
    });
    return () => {
      cancelled = true;
    };
  }, [fulfillmentType, cart.deliveryDateId]);

  if (itemCount === 0) {
    if (orderPlaced) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Confirmando tu pedido...</p>
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <h1 className="text-xl font-semibold">Tu carrito está vacío</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Agregá productos al pedido antes de pasar por caja.
        </p>
        <Button render={<Link href="/" />} variant="outline">
          Ver catálogo
        </Button>
      </div>
    );
  }

  if (paymentMethods.length === 0 || availableFulfillmentTypes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <h1 className="text-xl font-semibold">El checkout no está disponible todavía</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Todavía no configuramos medios de pago o de entrega. Contactanos directamente para
          coordinar tu pedido.
        </p>
        <Button render={<Link href="/carrito" />} variant="outline">
          Volver al pedido
        </Button>
      </div>
    );
  }

  function goToStep2() {
    if (!fulfillmentType) {
      toast.error("Elegí un tipo de entrega");
      return;
    }
    if (fulfillmentType === "PICKUP" && pickupSlots.length > 0 && !pickupSlotId) {
      toast.error("Elegí un horario de retiro");
      return;
    }
    setStep(2);
    setMaxStepReached((m) => Math.max(m, 2));
  }

  function goToStep3() {
    if (!method) {
      toast.error("Elegí un medio de pago");
      return;
    }
    if (method === "TRANSFER" && !proofFileName) {
      toast.error("Subí el comprobante de la transferencia");
      return;
    }
    setStep(3);
    setMaxStepReached((m) => Math.max(m, 3));
  }

  const step1Summary = fulfillmentType
    ? [
        FULFILLMENT_TYPE_LABELS[fulfillmentType],
        fulfillmentType === "PICKUP" && pickupSlotId
          ? pickupSlots.find((s) => s.id === pickupSlotId)?.label
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const step2Summary = method ? PAYMENT_METHOD_LABELS[method] ?? method : "";

  const appliedDeliveryFee = fulfillmentType === "DELIVERY" ? deliveryFee : 0;
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const total = Math.max(0, subtotal + appliedDeliveryFee - couponDiscount);

  function applyCoupon(code: string = couponCode) {
    if (!code.trim()) return;
    startCouponTransition(async () => {
      try {
        const result = await validateCoupon(code, subtotal);
        setAppliedCoupon({ code: result.code, discountAmount: result.discountAmount });
        toast.success(`Cupón ${result.code} aplicado`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo aplicar el cupón");
      }
    });
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
  }

  function handleSubmit(formData: FormData) {
    if (!method || !fulfillmentType) return;
    formData.set("deliveryDateId", cart.deliveryDateId ?? "");
    formData.set("paymentMethod", method);
    formData.set("fulfillmentType", fulfillmentType);
    if (pickupSlotId) formData.set("pickupSlotId", pickupSlotId);
    if (appliedCoupon) formData.set("couponCode", appliedCoupon.code);
    formData.set(
      "items",
      JSON.stringify(
        cart.items.map((i) => ({ productVariantId: i.productVariantId, quantity: i.quantity })),
      ),
    );

    startTransition(async () => {
      try {
        const { orderId } = await placeOrder(formData);
        setOrderPlaced(true);
        clearCart();
        router.push(`/pedidos/${orderId}?success=1`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo confirmar el pedido");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
      <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:w-[320px] lg:shrink-0">
        <h1 className="text-xl font-semibold">Confirmar pedido</h1>
        <div className="flex flex-col gap-2 rounded-2xl border p-4">
          {cart.items.map((item) => (
            <div key={item.productVariantId} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {item.quantity}× {item.productName}
              </span>
              <span className="shrink-0 font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {appliedDeliveryFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Envío</span>
              <span>{formatPrice(appliedDeliveryFee)}</span>
            </div>
          )}
          {appliedCoupon && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Descuento ({appliedCoupon.code})</span>
              <span>-{formatPrice(couponDiscount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border p-4">
          <Label htmlFor="couponCode">¿Tenés un cupón?</Label>
          {appliedCoupon ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-primary bg-muted px-3 py-2 text-sm">
              <span className="font-medium">{appliedCoupon.code}</span>
              <button type="button" onClick={removeCoupon} className="text-sm text-primary hover:opacity-80">
                Quitar
              </button>
            </div>
          ) : (
            <>
              {availableCoupons.length > 0 && (
                <div className="flex flex-col gap-2">
                  {availableCoupons.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      disabled={couponPending}
                      onClick={() => applyCoupon(c.code)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-background hover:bg-muted/30 px-3 py-2.5 text-left disabled:opacity-60 transition-colors"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">{c.code}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatCouponDiscount(c)} de descuento — ya la tenés canjeada
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-primary">Aplicar</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
              <Input
                id="couponCode"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Código"
                className="uppercase"
              />
              <Button
                type="button"
                variant="outline"
                disabled={couponPending || !couponCode.trim()}
                onClick={() => applyCoupon()}
              >
                Aplicar
              </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <form action={handleSubmit} className="flex flex-1 flex-col gap-4">
        <StepCard
          stepNumber={1}
          title="Tipo de entrega"
          active={step === 1}
          reached={maxStepReached >= 1}
          summary={step1Summary}
          onEdit={() => setStep(1)}
        >
          <div className="flex flex-col gap-2">
            {availableFulfillmentTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFulfillmentType(t)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left font-medium transition-colors",
                  fulfillmentType === t ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {FULFILLMENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {fulfillmentType === "PICKUP" && (
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/50 p-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="font-medium">Retirás en</span>
                <span className="text-muted-foreground">
                  {storeAddress ?? "Consultá la dirección del local con la tienda."}
                </span>
              </div>

              {pickupSlots.length === 1 && (
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Horario de retiro</span>
                  <span className="text-muted-foreground">{pickupSlots[0].label}</span>
                </div>
              )}

              {pickupSlots.length > 1 && (
                <div className="flex flex-col gap-2">
                  <span className="font-medium">Elegí un horario de retiro</span>
                  <div className="flex flex-col gap-2">
                    {pickupSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setPickupSlotId(slot.id)}
                        className={cn(
                          "rounded-xl border px-4 py-2.5 text-left transition-colors",
                          pickupSlotId === slot.id ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button 
            type="button" 
            onClick={goToStep2} 
            disabled={!fulfillmentType || (fulfillmentType === "PICKUP" && pickupSlots.length > 0 && !pickupSlotId)}
            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Continuar
          </Button>
        </StepCard>

        <StepCard
          stepNumber={2}
          title="Medio de pago"
          active={step === 2}
          reached={maxStepReached >= 2}
          summary={step2Summary}
          onEdit={() => setStep(2)}
        >
          <div className="flex flex-col gap-2">
            {paymentMethods.map((m) => {
              const locked = m.minPreviousOrders != null && previousOrderCount < m.minPreviousOrders;
              return (
                <div key={m.type} className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setMethod(m.type)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      method === m.type ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {m.label ?? PAYMENT_METHOD_LABELS[m.type] ?? m.type}
                  </button>
                  {locked && (
                    <p className="pl-1 text-xs text-muted-foreground">
                      Disponible después de tu primera compra — probá con otro medio de pago.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {method === "TRANSFER" && (
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/50 p-4 text-sm">
              <p className="font-medium">Datos para transferir</p>
              <div className="flex flex-col gap-1 text-muted-foreground">
                {transferConfig?.bankName && <span>Banco: {transferConfig.bankName}</span>}
                {transferConfig?.accountHolder && <span>Titular: {transferConfig.accountHolder}</span>}
                {transferConfig?.cbuOrAlias && <span>CBU/Alias: {transferConfig.cbuOrAlias}</span>}
                {!transferConfig?.bankName && !transferConfig?.accountHolder && !transferConfig?.cbuOrAlias && (
                  <span>Consultá los datos bancarios con la tienda.</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Comprobante de pago</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => proofInputRef.current?.click()}
                  >
                    {proofFileName ? "Cambiar archivo" : "Elegir archivo"}
                  </Button>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {proofFileName ?? "Ningún archivo seleccionado"}
                  </span>
                </div>
                <input
                  ref={proofInputRef}
                  id="proof"
                  name="proof"
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setProofFileName(e.target.files?.[0]?.name ?? null)}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button
              type="button"
              onClick={goToStep3}
              disabled={!method || (method === "TRANSFER" && !proofFileName)}
              className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Continuar
            </Button>
          </div>
        </StepCard>

        <StepCard
          stepNumber={3}
          title="Datos de contacto"
          active={step === 3}
          reached={maxStepReached >= 3}
          onEdit={() => setStep(3)}
        >
          {!profile && (
            <p className="text-sm text-muted-foreground">
              No hace falta crear una cuenta para pedir.{" "}
              <Link
                href={`/login?callbackUrl=/checkout`}
                className="font-medium text-primary hover:opacity-80"
              >
                ¿Ya tenés cuenta? Iniciá sesión
              </Link>
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="guestName">Nombre</Label>
              <Input
                id="guestName"
                name="guestName"
                required={!profile}
                disabled={!!profile}
                defaultValue={profile?.name ?? ""}
                placeholder="Nombre y apellido"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="guestEmail">Email de contacto</Label>
              <Input
                id="guestEmail"
                name="guestEmail"
                type="email"
                required={!profile}
                disabled={!!profile}
                defaultValue={profile?.email ?? ""}
                placeholder="tu@email.com"
              />
            </div>

            <div className={cn("flex flex-col gap-2", fulfillmentType !== "DELIVERY" && "sm:col-span-2")}>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                defaultValue={profile?.phone ?? ""}
                placeholder="Ej: 3425 340000"
              />
            </div>

            {fulfillmentType === "DELIVERY" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="address">Dirección de entrega</Label>
                <Textarea
                  id="address"
                  name="address"
                  required
                  rows={2}
                  defaultValue={profile?.address ?? ""}
                  placeholder="Calle, número, piso/depto, referencias"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Atrás
            </Button>
            <Button type="submit" size="lg" disabled={pending} className="flex-1">
              {pending ? "Confirmando…" : `Confirmar pedido · ${formatPrice(total)}`}
            </Button>
          </div>
        </StepCard>
      </form>
    </div>
  );
}
