import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProduct } from "../actions";
import { CategorySelect } from "./category-select";
import { StockGroupPicker } from "../stock-group-picker";

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
          <Link href="/admin/productos" className="underline">
            Volver
          </Link>
        </p>
      ) : (
        <form action={createProduct} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required />
          </div>

          <CategorySelect categories={categories} />

          <StockGroupPicker groups={stockGroups} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Crear y agregar variantes
            </Button>
            <Button type="button" variant="outline" render={<Link href="/admin/productos" />}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
