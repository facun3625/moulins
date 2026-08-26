import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

export async function createPasswordResetToken(email: string) {
  const token = randomBytes(32).toString("hex");
  // Un solo link válido a la vez — pedir uno nuevo invalida el anterior.
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return token;
}

export async function consumePasswordResetToken(email: string, token: string) {
  const row = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
  });
  if (!row) return false;
  await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } });
  return row.expires >= new Date();
}
