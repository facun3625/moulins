import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";
import { getSmtpSettings } from "@/lib/settings";

export type EmailType = "ORDER_CONFIRMATION" | "PASSWORD_RESET" | "TEST_SMTP" | "TEST_ORDER" | "SERVICE_INQUIRY";

let warned = false;

// No hace nada (sin tirar) si falta configurar SMTP. Si SMTP está
// configurado pero el envío falla, sí propaga el error — el caller debe
// envolver esta llamada en try/catch para no romper el flujo que la dispara.
// Cada intento (haya salido bien o mal) queda registrado en EmailLog para
// poder verlo desde Configuración → Mail sin depender del proveedor SMTP.
export async function sendMail({
  to,
  subject,
  html,
  type,
}: {
  to: string;
  subject: string;
  html: string;
  type: EmailType;
}) {
  const smtp = await getSmtpSettings();
  if (!smtp.configured) {
    if (!warned) {
      console.warn("SMTP no está configurado (Configuración → Mail) — no se van a enviar mails.");
      warned = true;
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host!,
    port: smtp.port ?? 587,
    secure: smtp.secure || smtp.port === 465,
    auth: { user: smtp.user!, pass: smtp.pass! },
  });

  try {
    await transporter.sendMail({
      from: smtp.from || smtp.user!,
      to,
      subject,
      html,
    });
    await prisma.emailLog.create({ data: { to, subject, type, success: true } }).catch(() => {});
  } catch (err) {
    await prisma.emailLog
      .create({
        data: { to, subject, type, success: false, error: err instanceof Error ? err.message : String(err) },
      })
      .catch(() => {});
    throw err;
  }
}
