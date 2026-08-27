"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { saveUploadedFile } from "@/lib/storage";
import { sendMail } from "@/lib/mailer";
import { getStoreSettings, getOrderEmailMessage, getTelegramSettings } from "@/lib/settings";
import { orderConfirmationEmail, SAMPLE_ORDER_EMAIL_DATA } from "@/lib/email-templates";
import { toWhatsAppLink, toInstagramLink } from "@/lib/social-links";
import { sendTelegram } from "@/lib/telegram";

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
  await saveImageSetting(formData.get("favicon") as File | null, "store_favicon_url");

  revalidatePath("/", "layout");
}

export async function removeStoreImage(key: "store_logo_url" | "store_cover_url" | "store_favicon_url") {
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

// ---------- SMTP (mail de confirmación de pedido) ----------

const smtpSchema = z.object({
  host: z.string().min(1, "Ingresá el host"),
  port: z.coerce.number().int().positive(),
  user: z.string().min(1, "Ingresá el usuario"),
  pass: z.string().optional(),
  from: z.string().optional(),
  secure: z.boolean(),
});

export async function updateSmtpSettings(formData: FormData) {
  await requireAdmin();

  const parsed = smtpSchema.parse({
    host: formData.get("host"),
    port: formData.get("port") || "587",
    user: formData.get("user"),
    pass: formData.get("pass") || undefined,
    from: formData.get("from") || undefined,
    secure: formData.get("secure") === "true",
  });

  // La contraseña se deja vacía en el form si ya hay una guardada — un
  // campo vacío significa "no la cambies", no "borrala".
  const existingPass = (await prisma.settings.findUnique({ where: { key: "smtp_pass" } }))?.value;
  if (!parsed.pass && !existingPass) {
    throw new Error("Ingresá la contraseña");
  }

  await Promise.all([
    saveTextSetting(parsed.host, "smtp_host"),
    saveTextSetting(String(parsed.port), "smtp_port"),
    saveTextSetting(parsed.user, "smtp_user"),
    saveTextSetting(parsed.from, "smtp_from"),
    saveTextSetting(String(parsed.secure), "smtp_secure"),
    parsed.pass ? saveTextSetting(parsed.pass, "smtp_pass") : Promise.resolve(),
  ]);

  revalidatePath("/admin/configuracion");
}

export async function removeSmtpSettings() {
  await requireAdmin();
  await prisma.settings.deleteMany({
    where: { key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_secure"] } },
  });
  revalidatePath("/admin/configuracion");
}

export async function sendTestSmtpEmail() {
  const { session } = await requireAdmin();
  const to = session.user.email;
  if (!to) throw new Error("Tu usuario admin no tiene email");

  await sendMail({
    to,
    subject: "Mail de prueba",
    html: "<p>Si estás leyendo esto, el SMTP de la tienda está bien configurado.</p>",
    type: "TEST_SMTP",
  });
}

// ---------- Mensaje editable del mail de pedido ----------

export async function updateOrderEmailMessage(formData: FormData) {
  await requireAdmin();
  await saveTextSetting(String(formData.get("message") ?? ""), "order_email_message");
  revalidatePath("/admin/configuracion");
}

// `draftMessage` opcional: permite probar el texto que se está escribiendo
// en el editor antes de guardarlo. Sin eso, usa el mensaje ya guardado.
export async function sendTestOrderEmail(draftMessage?: string) {
  const { session } = await requireAdmin();
  const to = session.user.email;
  if (!to) throw new Error("Tu usuario admin no tiene email");

  const [storeSettings, savedMessage, hdrs] = await Promise.all([getStoreSettings(), getOrderEmailMessage(), headers()]);
  const message = draftMessage !== undefined ? draftMessage : savedMessage;
  const host = hdrs.get("host");
  const protocol = host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https";
  const appUrl = `${protocol}://${host}`;

  await sendMail({
    to,
    subject: `Recibimos tu pedido — ${storeSettings.storeName}`,
    html: orderConfirmationEmail({
      ...SAMPLE_ORDER_EMAIL_DATA,
      storeName: storeSettings.storeName,
      logoUrl: storeSettings.logoUrl,
      customMessage: message,
      orderUrl: "#",
      storeAddress: storeSettings.address,
      storePhone: storeSettings.phone,
      storeEmail: storeSettings.email,
      whatsappUrl: storeSettings.whatsapp ? toWhatsAppLink(storeSettings.whatsapp) : null,
      instagramUrl: storeSettings.instagram ? toInstagramLink(storeSettings.instagram) : null,
      appUrl,
    }),
    type: "TEST_ORDER",
  });
}

// ---------- Telegram (aviso de pedido nuevo al grupo del equipo) ----------

const telegramSchema = z.object({
  botToken: z.string().optional(),
  chatId: z.string().min(1, "Ingresá el chat ID"),
});

export async function updateTelegramSettings(formData: FormData) {
  await requireAdmin();

  const parsed = telegramSchema.parse({
    botToken: formData.get("botToken") || undefined,
    chatId: formData.get("chatId"),
  });

  // El token es secreto: si el campo vino vacío es porque ya estaba
  // cargado y no lo tocaron — no lo pisamos con "".
  const existingToken = (await prisma.settings.findUnique({ where: { key: "telegram_bot_token" } }))?.value;
  if (!parsed.botToken && !existingToken) {
    throw new Error("Ingresá el token del bot");
  }

  await Promise.all([
    saveTextSetting(parsed.chatId, "telegram_chat_id"),
    parsed.botToken ? saveTextSetting(parsed.botToken, "telegram_bot_token") : Promise.resolve(),
  ]);

  revalidatePath("/admin/configuracion");
}

export async function removeTelegramSettings() {
  await requireAdmin();
  await prisma.settings.deleteMany({ where: { key: { in: ["telegram_bot_token", "telegram_chat_id"] } } });
  revalidatePath("/admin/configuracion");
}

export async function sendTestTelegram(draftToken: string, draftChatId: string) {
  await requireAdmin();
  const saved = await getTelegramSettings();
  const token = draftToken.trim() || saved.botToken || "";
  const chatId = draftChatId.trim() || saved.chatId || "";
  if (!token || !chatId) throw new Error("Faltan el token o el chat ID");

  const result = await sendTelegram(token, chatId, "✅ <b>Prueba</b>\nSi ves este mensaje, los avisos de pedidos están funcionando.");
  if (!result.ok) throw new Error(result.error ?? "No se pudo enviar");
}
