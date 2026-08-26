import Link from "next/link";
import Image from "next/image";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryManager } from "./category-manager";
import { StockGroupManager } from "./stock-group-manager";
import { SoldOutTodayToggle } from "./sold-out-today-toggle";
import { ProductActiveToggle } from "./product-active-toggle";
import { ProductsFilterBar } from "./products-filter-bar";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const where = {
    ...(params.category ? { categoryId: params.category } : {}),
    ...(params.q ? { name: { contains: params.q, mode: "insensitive" as const } } : {}),
  };

  const [products, categories, stockGroups, storeConfig] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        stockGroup: { include: { _count: { select: { products: true } } } },
        images: { orderBy: { order: "asc" }, take: 1 },
        variants: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.stockGroup.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.storeConfig.findUniqueOrThrow({ where: { id: 1 } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Productos</h1>
        <div className="flex gap-2">
          <StockGroupManager
            groups={stockGroups.map((g) => ({
              id: g.id,
              name: g.name,
              defaultStockQuantity: g.defaultStockQuantity,
              productCount: g._count.products,
            }))}
          />
          <CategoryManager categories={categories} />
          <Button render={<Link href="/admin/productos/nuevo" />} size="sm">
            Nuevo
          </Button>
        </div>
      </div>

      {categories.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Primero cargá al menos un tipo de producto (categoría) desde el botón
          &quot;Categorías&quot;.
        </p>
      )}

      {categories.length > 0 && (
        <ProductsFilterBar categories={categories.map(c => ({ id: c.id, name: c.name }))} />
      )}

      <div className="flex flex-col gap-3">
        {products.map((product) => {
          const prices = product.variants.map((v) => Number(v.price));
          const minPrice = prices.length ? Math.min(...prices) : null;
          const maxPrice = prices.length ? Math.max(...prices) : null;
          const image = product.images[0];

          return (
            <Link
              key={product.id}
              href={`/admin/productos/${product.id}`}
              className="flex items-center gap-3 rounded-lg border p-3 active:bg-accent"
            >
              <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {image ? (
                  <Image
                    src={image.url}
                    alt={product.name}
                    width={56}
                    height={56}
                    className="size-14 object-cover"
                  />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{product.name}</span>
                  {product.featured && <Badge className="shrink-0">Destacado</Badge>}
                  {!product.active && (
                    <Badge variant="secondary" className="shrink-0">
                      Oculto
                    </Badge>
                  )}
                  {storeConfig.orderingMode === "WEEKLY_HOURS" && product.soldOutToday && (
                    <Badge variant="secondary" className="shrink-0">
                      Agotado hoy
                    </Badge>
                  )}
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {product.category.name} · {product.variants.length}{" "}
                  {product.variants.length === 1 ? "variante" : "variantes"}
                  {product.stockGroup._count.products > 1 && ` · grupo: ${product.stockGroup.name}`}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <ProductActiveToggle productId={product.id} active={product.active} />
                {storeConfig.orderingMode === "WEEKLY_HOURS" && (
                  <SoldOutTodayToggle productId={product.id} soldOutToday={product.soldOutToday} />
                )}
              </div>
              <div className="shrink-0 text-right text-sm font-medium">
                {minPrice !== null
                  ? minPrice === maxPrice
                    ? `$${minPrice}`
                    : `$${minPrice} - $${maxPrice}`
                  : "Sin precio"}
              </div>
            </Link>
          );
        })}

        {products.length === 0 && categories.length > 0 && (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
            {params.q || params.category ? "No hay productos que coincidan con la búsqueda." : "Todavía no cargaste productos."}
          </p>
        )}
      </div>
    </div>
  );
}
