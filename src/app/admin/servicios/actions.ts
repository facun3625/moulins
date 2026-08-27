"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { saveUploadedFile } from "@/lib/storage";

const fieldSchema = z.object({
  label: z.string().trim().min(1),
  type: z.enum(["TEXT", "TEXTAREA", "EMAIL", "PHONE", "NUMBER", "DATE", "SELECT"]),
  required: z.boolean(),
  options: z.array(z.string()),
});
const serviceSchema = z.object({
  title: z.string().trim().min(1, "Ingresá un título"),
  description: z.string().trim().min(1, "Ingresá una descripción"),
  descriptionColumns: z.boolean(),
  formTitle: z.string().trim().min(1, "Ingresá el título del formulario"),
  submitLabel: z.string().trim().min(1, "Ingresá el texto del botón"),
  active: z.boolean(),
  fields: z.array(fieldSchema).min(1, "Agregá al menos un campo"),
  existingImages: z.array(z.object({ id: z.string(), order: z.number() })),
  newImages: z.array(z.object({ key: z.string(), order: z.number() })),
});

async function parseAndUpload(formData: FormData) {
  const parsed = serviceSchema.parse({
    title: formData.get("title"), description: formData.get("description"),
    descriptionColumns: formData.get("descriptionColumns") === "true",
    formTitle: formData.get("formTitle"), submitLabel: formData.get("submitLabel"),
    active: formData.get("active") === "true",
    fields: JSON.parse(String(formData.get("fields") || "[]")),
    existingImages: JSON.parse(String(formData.get("existingImages") || "[]")),
    newImages: JSON.parse(String(formData.get("newImages") || "[]")),
  });
  const uploaded: { url: string; order: number }[] = [];
  for (const image of parsed.newImages) {
    const file = formData.get(`image_${image.key}`);
    if (file instanceof File && file.size) uploaded.push({ url: await saveUploadedFile(file, "services"), order: image.order });
  }
  return { parsed, uploaded };
}

export async function saveService(id: string | null, formData: FormData) {
  await requireAdmin();
  const { parsed, uploaded } = await parseAndUpload(formData);
  const data = {
    title: parsed.title, description: parsed.description, descriptionColumns: parsed.descriptionColumns, formTitle: parsed.formTitle,
    submitLabel: parsed.submitLabel, active: parsed.active,
  };
  const service = await prisma.$transaction(async (tx) => {
    if (!id) return tx.service.create({ data: { ...data,
      fields: { create: parsed.fields.map((f, order) => ({ ...f, options: f.type === "SELECT" ? f.options.filter(Boolean) : [], order })) },
      images: { create: uploaded },
    }});
    const exists = await tx.service.findUnique({ where: { id } });
    if (!exists) throw new Error("Servicio no encontrado");
    await tx.serviceField.deleteMany({ where: { serviceId: id } });
    await tx.serviceImage.deleteMany({ where: { serviceId: id, id: { notIn: parsed.existingImages.map((x) => x.id) } } });
    for (const image of parsed.existingImages) await tx.serviceImage.update({ where: { id: image.id }, data: { order: image.order } });
    return tx.service.update({ where: { id }, data: { ...data,
      fields: { create: parsed.fields.map((f, order) => ({ ...f, options: f.type === "SELECT" ? f.options.filter(Boolean) : [], order })) },
      images: { create: uploaded },
    }});
  });
  revalidatePath("/"); revalidatePath("/servicios"); revalidatePath("/admin/servicios");
  return { id: service.id };
}

export async function deleteService(id: string) {
  await requireAdmin();
  await prisma.service.delete({ where: { id } });
  revalidatePath("/"); revalidatePath("/servicios"); revalidatePath("/admin/servicios");
}

export async function uploadServiceTextImage(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("Elegí una imagen");
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen");
  return saveUploadedFile(file, "content");
}
