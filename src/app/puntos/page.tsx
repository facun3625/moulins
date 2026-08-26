import { redirect } from "next/navigation";
import { SparklesIcon, TicketIcon } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserPointsBalance } from "@/lib/points";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { formatPrice } from "@/lib/format";
import { RedeemCouponButton } from "./redeem-coupon-button";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

function formatDiscount(type: "PERCENT" | "FIXED", value: number) {
  return type === "PERCENT" ? `${value}%` : formatPrice(value);
}

export default async function PuntosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/puntos");
  const userId = session.user.id;

  const [balance, coupons, pendingRedemptions] = await Promise.all([
    getUserPointsBalance(userId),
    prisma.coupon.findMany({
      where: {
        pointsCost: { gt: 0 },
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { pointsCost: "asc" },
      include: { _count: { select: { redemptions: true } } },
    }),
    prisma.couponRedemption.findMany({
      where: { userId, orderId: null },
      include: { coupon: true },
    }),
  ]);

  const pendingCouponIds = new Set(pendingRedemptions.map((r) => r.couponId));
  const redeemable = coupons.filter(
    (c) => !pendingCouponIds.has(c.id) && (!c.usageLimit || c._count.redemptions < c.usageLimit),
  );

  return (
    <div className="flex flex-1 flex-col">
      <StoreHero />
      <main className="relative z-1 -mt-6 mx-5 flex flex-1 flex-col gap-6 rounded-t-3xl bg-background px-4 py-6 lg:-mt-32 lg:mx-auto lg:w-full lg:max-w-4xl lg:shadow-2xl">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/40 p-6 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                <SparklesIcon className="size-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Tus puntos</span>
              <span className="text-3xl font-bold">{balance}</span>
            </div>

            {pendingRedemptions.length > 0 && (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">Listos para usar</h2>
                <div className="flex flex-col gap-2">
                  {pendingRedemptions.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-primary bg-muted px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{r.coupon.code}</span>
                      <span className="text-muted-foreground">
                        {formatDiscount(r.coupon.discountType, Number(r.coupon.discountValue))} — usalo en el
                        checkout
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Canjear por cupones</h2>
            {redeemable.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-6 text-center">
                <TicketIcon className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Todavía no hay cupones para canjear con puntos.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {redeemable.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border p-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{c.code}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDiscount(c.discountType, Number(c.discountValue))}
                        {c.expiresAt && ` · vence ${dateFormatter.format(c.expiresAt)}`}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold">{c.pointsCost} pts</span>
                      <RedeemCouponButton couponId={c.id} disabled={balance < c.pointsCost} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
