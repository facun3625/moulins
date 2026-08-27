import { prisma } from "@/lib/prisma";
import type { EmailType } from "@/lib/mailer";

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  ORDER_CONFIRMATION: "Confirmación de pedido",
  PASSWORD_RESET: "Recuperar contraseña",
  TEST_SMTP: "Prueba SMTP",
  TEST_ORDER: "Prueba de plantilla",
};

export function getRecentEmailLogs(limit = 40) {
  return prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
