import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { NewProductForm } from "./new-product-form";

export default async function NewProductPage() {
  await requireAdmin();
  const [categories, stockGroups] = await Promise.all([
    prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.stockGroup.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nuevo producto</h1>

      {categories.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Necesitás cargar al menos un tipo de producto antes de crear uno.{" "}
          <Link href="/admin/productos" className="font-medium text-primary hover:opacity-80">
            Volver
          </Link>
        </p>
      ) : (
        <NewProductForm categories={categories} stockGroups={stockGroups} />
      )}
    </div>
  );
}
