import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { WelcomePopup } from "@/components/catalog/welcome-popup";
import { prisma } from "@/lib/prisma";
import { Catalog } from "@/components/catalog/catalog";
import { expireStaleDates } from "@/lib/schedule";
import { getPopupConfig } from "@/lib/popup";
import { resolveScheduledSalesAvailability, resolveWeeklyAvailability, type OpenSale } from "@/lib/availability";

const UNLIMITED_STOCK = 999;
const saleDateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});
const cutoffTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const cutoffFullFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function cutoffLabel(deliveryDate: Date, cutoffAt: Date) {
  return isSameCalendarDay(deliveryDate, cutoffAt)
    ? `hasta las ${cutoffTimeFormatter.format(cutoffAt)} hs del mismo día`
    : `hasta el ${cutoffFullFormatter.format(cutoffAt)} hs`;
}

type Resolved = {
  readOnly: boolean;
  readOnlyReason: "closed" | "soldout";
  nextOpenDateLabel: string | null;
  statusBanner: { icon: "open" | "calendar"; text: string } | null;
  openDates: { id: string; date: string }[];
  selectedDateId: string | null;
};

async function resolveForStorefront(): Promise<Resolved> {
  const storeConfig = await prisma.storeConfig.findUniqueOrThrow({ where: { id: 1 } });

  if (storeConfig.orderingMode === "WEEKLY_HOURS") {
    const availability = await resolveWeeklyAvailability();
    if (availability.open) {
      return {
        readOnly: false,
        readOnlyReason: "closed",
        nextOpenDateLabel: null,
        statusBanner: {
          icon: "open",
          text: `Abierto — pedí ahora. Cerramos a las ${availability.closesAt} hs. Entrega/retiro: ${availability.fulfillmentLabel}.`,
        },
        openDates: [{ id: availability.deliveryDateId, date: new Date().toISOString() }],
        selectedDateId: availability.deliveryDateId,
      };
    }
    return {
      readOnly: true,
      readOnlyReason: "closed",
      nextOpenDateLabel: availability.nextOpenLabel,
      statusBanner: null,
      openDates: [],
      selectedDateId: null,
    };
  }

  const availability = await resolveScheduledSalesAvailability();
  if (availability.open) {
    const sales: OpenSale[] = availability.sales;
    const banner =
      sales.length === 1
        ? {
            icon: "calendar" as const,
            text: `Tomamos pedidos para el ${saleDateFormatter.format(sales[0].date)}.${
              sales[0].cutoffAt ? ` Pedidos ${cutoffLabel(sales[0].date, sales[0].cutoffAt)}.` : ""
            }`,
          }
        : null;
    return {
      readOnly: false,
      readOnlyReason: "closed",
      nextOpenDateLabel: null,
      statusBanner: banner,
      openDates: sales.map((s) => ({ id: s.id, date: s.date.toISOString() })),
      selectedDateId: sales[0].id,
    };
  }

  return {
    readOnly: true,
    readOnlyReason: availability.soldOut ? "soldout" : "closed",
    nextOpenDateLabel: availability.nextSaleLabel,
    statusBanner: null,
    openDates: [],
    selectedDateId: null,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha } = await searchParams;

  await expireStaleDates();
  const storeConfig = await prisma.storeConfig.findUniqueOrThrow({ where: { id: 1 } });

  if (!storeConfig.storeOpen) {
    return (
      <div className="flex flex-1 flex-col">
        <StoreHero />
        <main className="relative z-1 -mt-6 flex flex-1 flex-col items-center justify-center gap-3 rounded-t-3xl bg-background px-6 py-16 text-center lg:-mt-32 lg:mx-auto lg:max-w-5xl lg:shadow-2xl xl:max-w-6xl 2xl:max-w-7xl">
          <h1 className="text-2xl font-semibold">Tienda cerrada</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Estamos cerrados temporalmente. Volvé a visitarnos más tarde.
          </p>
        </main>
        <StoreFooter />
      </div>
    );
  }

  const [resolved, popupConfig] = await Promise.all([
    resolveForStorefront(),
    getPopupConfig(),
  ]);
  const showPopup = popupConfig.enabled && !!popupConfig.html?.trim();

  const selectedDateId =
    (fecha && resolved.openDates.some((d) => d.id === fecha) ? fecha : resolved.selectedDateId) ?? null;

  const stockMode = selectedDateId
    ? ((await prisma.deliveryDate.findUnique({ where: { id: selectedDateId }, select: { stockMode: true } }))
        ?.stockMode ?? "BY_GROUP")
    : "BY_GROUP";

  const products = await prisma.product.findMany({
    where: { active: true, category: { active: true } },
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
      stockGroup: { include: { stock: { where: { deliveryDateId: selectedDateId ?? "__none__" } } } },
      productStock: { where: { deliveryDateId: selectedDateId ?? "__none__" } },
      variants: { where: { active: true }, orderBy: { order: "asc" } },
    },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });

  const catalogProducts = products
    .map((p) => {
      let remaining: number;
      if (stockMode === "UNLIMITED") {
        remaining = UNLIMITED_STOCK;
      } else if (stockMode === "BY_PRODUCT") {
        const s = p.productStock[0];
        remaining =
          s == null || s.quantityAvailable == null
            ? UNLIMITED_STOCK
            : Math.max(0, s.quantityAvailable - s.quantitySold);
      } else {
        const groupStock = p.stockGroup.stock[0];
        remaining =
          groupStock == null || groupStock.quantityAvailable == null
            ? UNLIMITED_STOCK
            : Math.max(0, groupStock.quantityAvailable - groupStock.quantitySold);
      }

      // Pausa manual sin fecha, solo aplica en modo horario semanal.
      if (storeConfig.orderingMode === "WEEKLY_HOURS" && p.soldOutToday) {
        remaining = 0;
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        categoryIcon: p.category.icon,
        imageUrl: p.images[0]?.url ?? null,
        images: p.images.map((i) => i.url),
        stockGroupId: stockMode === "BY_GROUP" ? p.stockGroupId : null,
        featured: p.featured,
        contactToBuy: p.contactToBuy,
        tags: p.tags,
        variants: p.variants.map((v) => ({
          id: v.id,
          label: [v.gusto, v.tamano].filter(Boolean).join(" · ") || "Único",
          price: Number(v.price),
          remaining,
        })),
      };
    });

  // Vacío de verdad (nada cargado) o realmente cerrado — no confundir con
  // "abierto pero sin stock", que sigue mostrando la tienda con lo agotado
  // marcado.
  if (resolved.readOnly || catalogProducts.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <StoreHero />
        <main className="relative z-1 -mt-6 flex flex-1 flex-col items-center justify-center gap-3 rounded-t-3xl bg-background px-6 py-16 text-center lg:-mt-32 lg:mx-auto lg:max-w-5xl lg:shadow-2xl xl:max-w-6xl 2xl:max-w-7xl">
          <h1 className="text-2xl font-semibold">
            {resolved.readOnlyReason === "soldout" ? "Se alcanzó el límite de pedidos" : "Todavía no hay pedidos abiertos"}
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {resolved.nextOpenDateLabel
              ? `Abrimos ${resolved.nextOpenDateLabel}.`
              : "En cuanto abramos vas a poder ver el catálogo y hacer tu pedido acá."}
          </p>
        </main>
        <StoreFooter />
        {showPopup && (
          <WelcomePopup html={popupConfig.html!} frequency={popupConfig.frequency} version={popupConfig.version} />
        )}
      </div>
    );
  }

  const categories = Array.from(
    new Map(
      catalogProducts.map((p) => [p.categoryId, { name: p.categoryName, icon: p.categoryIcon }]),
    ).entries(),
  ).map(([id, { name, icon }]) => ({ id, name, icon }));

  return (
    <div className="flex flex-1 flex-col">
      <StoreHero />
      <Catalog
        deliveryDates={resolved.openDates}
        selectedDeliveryDateId={selectedDateId ?? ""}
        categories={categories}
        products={catalogProducts}
        readOnly={resolved.readOnly}
        readOnlyReason={resolved.readOnlyReason}
        nextOpenDateLabel={resolved.nextOpenDateLabel}
        statusBanner={resolved.statusBanner}
      />
      <StoreFooter />
      {showPopup && (
        <WelcomePopup html={popupConfig.html!} frequency={popupConfig.frequency} version={popupConfig.version} />
      )}
    </div>
  );
}
