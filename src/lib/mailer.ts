import nodemailer from "nodemailer";

import { getSmtpSettings } from "@/lib/settings";

let warned = false;

// No hace nada (sin tirar) si falta configurar SMTP. Si SMTP está
// configurado pero el envío falla, sí propaga el error — el caller debe
// envolver esta llamada en try/catch para no romper el flujo que la dispara.
export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
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

  await transporter.sendMail({
    from: smtp.from || smtp.user!,
    to,
    subject,
    html,
  });
}
