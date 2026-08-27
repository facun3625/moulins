"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { saveUploadedFile } from "@/lib/storage";

// ---------- Categorías ----------

const categorySchema = z.object({
  name: z.string().min(1, "Ingresá un nombre"),
  icon: z.string().optional(),
});

export async function createCategory(formData: FormData) {
  await requireAdmin();
  const parsed = categorySchema.parse({
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
  });
  await prisma.productCategory.create({
    data: { name: parsed.name, icon: parsed.icon ?? null },
  });
  revalidatePath("/admin/productos");
}

export async function renameCategory(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = categorySchema.parse({
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
  });
  await prisma.productCategory.update({
    where: { id },
    data: { name: parsed.name, icon: parsed.icon ?? null },
  });
  revalidatePath("/admin/productos");
}

export async function toggleCategoryActive(id: string, active: boolean) {
  await requireAdmin();
  await prisma.productCategory.update({ where: { id }, data: { active } });
  revalidatePath("/admin/productos");
  revalidatePath("/");
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    throw new Error("No se puede borrar una categoría con productos. Movelos o borralos primero.");
  }
  await prisma.productCategory.delete({ where: { id } });
  revalidatePath("/admin/productos");
}

// ---------- Grupos de stock ----------

const stockGroupSchema = z.object({
  name: z.string().min(1, "Ingresá un nombre"),
  defaultStockQuantity: z.coerce.number().int().nonnegative().nullable().optional(),
});

export async function createStockGroup(formData: FormData) {
  await requireAdmin();
  const parsed = stockGroupSchema.parse({
    name: formData.get("name"),
    defaultStockQuantity: formData.get("defaultStockQuantity") || undefined,
  });
  await prisma.stockGroup.create({
    data: {
      name: parsed.name,
      defaultStockQuantity: parsed.defaultStockQuantity ?? null,
    },
  });
  revalidatePath("/admin/productos");
}

export async function updateStockGroup(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = stockGroupSchema.parse({
    name: formData.get("name"),
    defaultStockQuantity: formData.get("defaultStockQuantity") || undefined,
  });
  await prisma.stockGroup.update({
    where: { id },
    data: { name: parsed.name, defaultStockQuantity: parsed.defaultStockQuantity ?? null },
  });
  revalidatePath("/admin/productos");
}

export async function deleteStockGroup(id: string) {
  await requireAdmin();
  const productCount = await prisma.product.count({ where: { stockGroupId: id } });
  if (productCount > 0) {
    throw new Error("No se puede borrar un grupo con productos asignados. Sacalos del grupo primero.");
  }
  await prisma.stockGroup.delete({ where: { id } });
  revalidatePath("/admin/productos");
}

// Usado solo al duplicar un producto: la copia nace con su propio grupo de
// stock (nombre derivado del producto), desambiguando si ya existe uno con
// ese nombre. La creación manual de productos exige elegir un grupo ya
// existente (ver StockGroupPicker) — no pasa por acá.
async function createStockGroupForCopy(tx: Pick<PrismaClient, "stockGroup">, fallbackName: string) {
  let name = fallbackName;
  let attempt = 1;
  for (;;) {
    try {
      const group = await tx.stockGroup.create({ data: { name } });
      return group.id;
    } catch {
      attempt += 1;
      name = `${fallbackName} (${attempt})`;
      if (attempt > 20) throw new Error("No se pudo crear el grupo de stock");
    }
  }
}

// ---------- Productos ----------

const newProductImageSchema = z.object({
  newKey: z.string(),
  order: z.number(),
});

const newProductVariantSchema = z.object({
  gusto: z.string().optional(),
  tamano: z.string().optional(),
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
});

const newProductSchema = z.object({
  name: z.string().min(1, "Ingresá un nombre"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Elegí una categoría"),
  stockGroupId: z.string().min(1, "Elegí un grupo de stock"),
  variants: z.array(newProductVariantSchema).min(1, "Cargá un precio o agregá al menos una variante"),
  images: z.array(newProductImageSchema),
  active: z.boolean(),
  featured: z.boolean(),
  contactToBuy: z.boolean(),
});

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const parsed = newProductSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId"),
    stockGroupId: formData.get("stockGroupId"),
    variants: JSON.parse(String(formData.get("variants") || "[]")),
    images: JSON.parse(String(formData.get("images") || "[]")),
    active: formData.get("active") === "true",
    featured: formData.get("featured") === "true",
    contactToBuy: formData.get("contactToBuy") === "true",
  });

  const group = await prisma.stockGroup.findUnique({ where: { id: parsed.stockGroupId } });
  if (!group) throw new Error("Grupo de stock no encontrado");

  const imageCreates: { url: string; order: number }[] = [];
  for (const img of parsed.images) {
    const file = formData.get(`newImageFile_${img.newKey}`);
    if (file instanceof File && file.size > 0) {
      const url = await saveUploadedFile(file, "products");
      imageCreates.push({ url, order: img.order });
    }
  }

  // Modo simple: una sola variante sin gusto/tamaño con el precio cargado.
  // Modo variantes: una fila por gusto/tamaño, cada una con su propio precio.
  const product = await prisma.product.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      categoryId: parsed.categoryId,
      stockGroupId: parsed.stockGroupId,
      active: parsed.active,
      featured: parsed.featured,
      contactToBuy: parsed.contactToBuy,
      variants: {
        create: parsed.variants.map((v, i) => ({
          gusto: v.gusto || null,
          tamano: v.tamano || null,
          price: v.price,
          order: i,
        })),
      },
      images: imageCreates.length > 0 ? { create: imageCreates } : undefined,
    },
  });
  revalidatePath("/admin/productos");
  return { id: product.id };
}

export async function toggleProductActive(id: string, active: boolean) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { active } });
  revalidatePath("/admin/productos");
}

// Pausa rápida sin fecha ni cantidad — solo tiene efecto en modo horario
// semanal (delivery del día); en ventas programadas manda el stock por fecha.
export async function toggleProductSoldOutToday(id: string, soldOutToday: boolean) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { soldOutToday } });
  revalidatePath("/admin/productos");
  revalidatePath("/");
}

export async function duplicateProduct(id: string) {
  await requireAdmin();
  const source = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, images: { orderBy: { order: "asc" } } },
  });
  if (!source) throw new Error("Producto no encontrado");

  const copyName = `${source.name} (copia)`;
  // La copia nace con su propio grupo de stock, no comparte el pozo del original.
  const stockGroupId = await createStockGroupForCopy(prisma, copyName);

  const copy = await prisma.product.create({
    data: {
      categoryId: source.categoryId,
      stockGroupId,
      name: copyName,
      description: source.description,
      active: false,
      featured: false,
      tags: source.tags,
      variants: {
        create: source.variants.map((v) => ({
          gusto: v.gusto,
          tamano: v.tamano,
          sku: v.sku,
          price: v.price,
          active: v.active,
          order: v.order,
        })),
      },
      images: {
        create: source.images.map((img) => ({ url: img.url, order: img.order })),
      },
    },
  });

  revalidatePath("/admin/productos");
  redirect(`/admin/productos/${copy.id}`);
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const orderItemCount = await prisma.orderItem.count({
    where: { productVariant: { productId: id } },
  });
  if (orderItemCount > 0) {
    throw new Error("No se puede borrar un producto con pedidos asociados. Desactivalo en su lugar.");
  }
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/productos");
  redirect("/admin/productos");
}

// ---------- Editor unificado (info + variantes + fotos, un solo guardado) ----------

const editorVariantSchema = z.object({
  id: z.string().optional(),
  gusto: z.string().optional(),
  tamano: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  active: z.boolean(),
  order: z.number(),
});

const editorImageSchema = z.object({
  id: z.string().optional(),
  newKey: z.string().optional(),
  order: z.number(),
});

const saveProductSchema = z.object({
  name: z.string().min(1, "Ingresá un nombre"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Elegí una categoría"),
  stockGroupId: z.string().min(1, "Elegí un grupo de stock"),
  active: z.boolean(),
  featured: z.boolean(),
  contactToBuy: z.boolean(),
  tags: z.array(z.string()),
  variants: z.array(editorVariantSchema),
  deletedVariantIds: z.array(z.string()),
  images: z.array(editorImageSchema),
  deletedImageIds: z.array(z.string()),
});

export async function saveProduct(id: string, formData: FormData) {
  await requireAdmin();

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new Error("Producto no encontrado");

  const parsed = saveProductSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId"),
    stockGroupId: formData.get("stockGroupId"),
    active: formData.get("active") === "true",
    featured: formData.get("featured") === "true",
    contactToBuy: formData.get("contactToBuy") === "true",
    tags: JSON.parse(String(formData.get("tags") || "[]")),
    variants: JSON.parse(String(formData.get("variants") || "[]")),
    deletedVariantIds: JSON.parse(String(formData.get("deletedVariantIds") || "[]")),
    images: JSON.parse(String(formData.get("images") || "[]")),
    deletedImageIds: JSON.parse(String(formData.get("deletedImageIds") || "[]")),
  });

  const group = await prisma.stockGroup.findUnique({ where: { id: parsed.stockGroupId } });
  if (!group) throw new Error("Grupo de stock no encontrado");
  const stockGroupId = parsed.stockGroupId;

  if (parsed.deletedVariantIds.length > 0) {
    const usedCount = await prisma.orderItem.count({
      where: { productVariantId: { in: parsed.deletedVariantIds } },
    });
    if (usedCount > 0) {
      throw new Error(
        "No se puede borrar una variante con pedidos asociados. Desactivala en su lugar.",
      );
    }
  }

  const newImageUrls = new Map<string, string>();
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("newImageFile_") && value instanceof File && value.size > 0) {
      if (!value.type.startsWith("image/")) throw new Error("Todos los archivos deben ser imágenes");
      const url = await saveUploadedFile(value, "products");
      newImageUrls.set(key.replace("newImageFile_", ""), url);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name: parsed.name,
        description: parsed.description ?? null,
        categoryId: parsed.categoryId,
        stockGroupId,
        active: parsed.active,
        featured: parsed.featured,
        contactToBuy: parsed.contactToBuy,
        tags: parsed.tags,
      },
    });

    if (parsed.deletedVariantIds.length > 0) {
      await tx.productVariant.deleteMany({
        where: { id: { in: parsed.deletedVariantIds }, productId: id },
      });
    }

    for (const v of parsed.variants) {
      const data = {
        gusto: v.gusto || null,
        tamano: v.tamano || null,
        sku: v.sku || null,
        price: v.price,
        active: v.active,
        order: v.order,
      };
      if (v.id) {
        await tx.productVariant.update({ where: { id: v.id, productId: id }, data });
      } else {
        await tx.productVariant.create({ data: { ...data, productId: id } });
      }
    }

    if (parsed.deletedImageIds.length > 0) {
      await tx.productImage.deleteMany({ where: { id: { in: parsed.deletedImageIds }, productId: id } });
    }

    for (const img of parsed.images) {
      if (img.id) {
        await tx.productImage.update({ where: { id: img.id, productId: id }, data: { order: img.order } });
      } else if (img.newKey) {
        const url = newImageUrls.get(img.newKey);
        if (url) await tx.productImage.create({ data: { productId: id, url, order: img.order } });
      }
    }
  });

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${id}`);
}
