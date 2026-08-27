"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// Se llama justo antes de abrir el link de wa.me — no hay forma de saber si
// el admin efectivamente apretó "enviar" en WhatsApp Web, así que esto
// registra "se abrió el mensaje para este cliente", que es la mejor señal
// disponible sin integrar la API de WhatsApp Business.
export async function logWhatsappSent({
  userId,
  phone,
  message,
}: {
  userId: string;
  phone: string;
  message: string;
}) {
  await requireAdmin();
  await prisma.whatsappLog.create({ data: { userId, phone, message } });
  revalidatePath("/admin/estadisticas");
}
