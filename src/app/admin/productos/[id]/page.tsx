import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { ProductEditor } from "./product-editor";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const [product, categories, stockGroups] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { order: "asc" } },
        images: { orderBy: { order: "asc" } },
      },
    }),
    prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.stockGroup.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  return (
    <ProductEditor
      key={product.updatedAt.toISOString()}
      product={{
        id: product.id,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        stockGroupId: product.stockGroupId,
        active: product.active,
        featured: product.featured,
        contactToBuy: product.contactToBuy,
        tags: product.tags,
        variants: product.variants.map((v) => ({
          id: v.id,
          gusto: v.gusto,
          tamano: v.tamano,
          sku: v.sku,
          price: v.price.toString(),
          active: v.active,
        })),
        images: product.images.map((i) => ({ id: i.id, url: i.url })),
      }}
      categories={categories}
      stockGroups={stockGroups.map((g) => ({ id: g.id, name: g.name }))}
    />
  );
}
