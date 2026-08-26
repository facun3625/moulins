import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { CheckoutForm } from "./checkout-form";
import type { TransferConfig } from "@/app/admin/pagos/page";
import type { DeliveryFeeConfig } from "@/app/admin/entrega/page";

export default async function CheckoutPage() {
  const session = await auth();

  const [paymentMethods, fulfillmentMethods, user, storeSettings, previousOrderCount, pendingRedemptions] =
    await Promise.all([
      prisma.paymentMethodConfig.findMany({ where: { enabled: true } }),
      prisma.fulfillmentMethodConfig.findMany({ where: { enabled: true } }),
      session?.user ? prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }) : null,
      getStoreSettings(),
      session?.user
        ? prisma.order.count({
            where: { userId: session.user.id, status: { not: "CANCELLED" } },
          })
        : 0,
      session?.user
        ? prisma.couponRedemption.findMany({
            where: { userId: session.user.id, orderId: null },
            include: { coupon: true },
          })
        : [],
    ]);

  const now = new Date();
  const availableCoupons = pendingRedemptions
    .filter((r) => r.coupon.active && (!r.coupon.expiresAt || r.coupon.expiresAt > now))
    .map((r) => ({
      code: r.coupon.code,
      discountType: r.coupon.discountType,
      discountValue: Number(r.coupon.discountValue),
    }));

  const transferConfig =
    (paymentMethods.find((m) => m.type === "TRANSFER")?.config as TransferConfig | null) ?? null;
  const deliveryFee =
    (fulfillmentMethods.find((m) => m.type === "DELIVERY")?.config as DeliveryFeeConfig | null)
      ?.fee ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <StoreHero />
      <div className="relative z-1 -mt-6 mx-5 flex flex-1 flex-col rounded-t-3xl bg-background lg:-mt-32 lg:mx-auto lg:w-full lg:max-w-5xl lg:shadow-2xl">
        <CheckoutForm
          paymentMethods={paymentMethods.map((m) => ({
            type: m.type,
            label: m.label,
            minPreviousOrders: m.minPreviousOrders,
          }))}
          previousOrderCount={previousOrderCount}
          transferConfig={transferConfig}
          availableFulfillmentTypes={fulfillmentMethods.map((m) => m.type)}
          deliveryFee={deliveryFee}
          storeAddress={storeSettings.address}
          profile={user ? { name: user.name, email: user.email, phone: user.phone, address: user.address } : null}
          availableCoupons={availableCoupons}
        />
      </div>
      <StoreFooter />
    </div>
  );
}
