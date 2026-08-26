"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { saveUploadedFile } from "@/lib/storage";

const settingsSchema = z.object({
  storeName: z.string().min(1, "Ingresá el nombre del negocio"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  addToCartLabel: z.string().optional(),
});

async function saveTextSetting(value: string | undefined, key: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    await prisma.settings.deleteMany({ where: { key } });
    return;
  }
  await prisma.settings.upsert({
    where: { key },
    update: { value: trimmed },
    create: { key, value: trimmed },
  });
}

async function saveImageSetting(file: File | null, key: string) {
  if (!file || file.size === 0) return;
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen");
  }
  const url = await saveUploadedFile(file, "branding");
  await prisma.settings.upsert({
    where: { key },
    update: { value: url },
    create: { key, value: url },
  });
}

export async function updateStoreSettings(formData: FormData) {
  await requireAdmin();

  const parsed = settingsSchema.parse({
    storeName: formData.get("storeName"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    instagram: formData.get("instagram") || undefined,
    addToCartLabel: formData.get("addToCartLabel") || undefined,
  });

  await prisma.settings.upsert({
    where: { key: "store_name" },
    update: { value: parsed.storeName },
    create: { key: "store_name", value: parsed.storeName },
  });

  await Promise.all([
    saveTextSetting(parsed.address, "store_address"),
    saveTextSetting(parsed.phone, "store_phone"),
    saveTextSetting(parsed.email, "store_email"),
    saveTextSetting(parsed.whatsapp, "store_whatsapp"),
    saveTextSetting(parsed.instagram, "store_instagram"),
    saveTextSetting(parsed.addToCartLabel, "store_add_to_cart_label"),
  ]);

  await saveImageSetting(formData.get("logo") as File | null, "store_logo_url");
  await saveImageSetting(formData.get("cover") as File | null, "store_cover_url");

  revalidatePath("/", "layout");
}

export async function removeStoreImage(key: "store_logo_url" | "store_cover_url") {
  await requireAdmin();
  await prisma.settings.deleteMany({ where: { key } });
  revalidatePath("/", "layout");
}

// ---------- Editor de texto enriquecido (compartido) ----------

export async function uploadRichTextImage(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Elegí una imagen");
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen");
  return saveUploadedFile(file, "content");
}

// ---------- Sobre nosotros ----------

export async function updateAboutText(formData: FormData) {
  await requireAdmin();
  await saveTextSetting(String(formData.get("text") ?? ""), "about_text");
  await saveTextSetting(
    formData.get("columns") === "true" ? "true" : undefined,
    "about_text_columns",
  );
  revalidatePath("/sobre-nosotros");
  revalidatePath("/admin/configuracion");
}

export async function updatePopupConfig(formData: FormData) {
  await requireAdmin();
  const enabled = formData.get("enabled") === "true";
  const frequency = String(formData.get("frequency") ?? "ONCE");
  const html = String(formData.get("html") ?? "");

  await Promise.all([
    saveTextSetting(String(enabled), "popup_enabled"),
    saveTextSetting(frequency, "popup_frequency"),
    saveTextSetting(html, "popup_html"),
    saveTextSetting(String(Date.now()), "popup_version"),
  ]);
  revalidatePath("/");
  revalidatePath("/admin/configuracion");
}

export async function addAboutMedia(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Elegí un archivo");

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) throw new Error("El archivo debe ser una imagen o un video");

  const url = await saveUploadedFile(file, "about");
  const last = await prisma.aboutMedia.findFirst({
    orderBy: { order: "desc" },
  });
  await prisma.aboutMedia.create({
    data: {
      type: isImage ? "IMAGE" : "VIDEO",
      url,
      order: (last?.order ?? -1) + 1,
    },
  });
  revalidatePath("/sobre-nosotros");
  revalidatePath("/admin/configuracion");
}

export async function deleteAboutMedia(id: string) {
  await requireAdmin();
  await prisma.aboutMedia.delete({ where: { id } });
  revalidatePath("/sobre-nosotros");
  revalidatePath("/admin/configuracion");
}
