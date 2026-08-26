import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let warned = false;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    if (!warned) {
      console.warn(
        "SMTP no está configurado (faltan SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS) — no se van a enviar mails.",
      );
      warned = true;
    }
    return null;
  }
  if (!transporter) {
    const port = Number(SMTP_PORT);
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

// No hace nada (sin tirar) si falta configurar SMTP. Si SMTP está
// configurado pero el envío falla, sí propaga el error — el caller debe
// envolver esta llamada en try/catch para no romper el flujo que la dispara.
export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const client = getTransporter();
  if (!client) return;

  await client.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}
