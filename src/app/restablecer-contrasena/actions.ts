"use server";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/password-reset";

export async function resetPassword(rawEmail: string, token: string, newPassword: string) {
  const email = rawEmail.trim().toLowerCase();
  if (newPassword.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres");
  }
  if (!email || !token) {
    throw new Error("Link inválido");
  }

  const valid = await consumePasswordResetToken(email, token);
  if (!valid) {
    throw new Error("El link venció o ya se usó — pedí uno nuevo");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email }, data: { passwordHash } });
}
