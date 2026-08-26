"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import type { Role } from "@/generated/prisma/client";

export async function setUserRole(id: string, role: Role) {
  const { session } = await requireAdmin();
  if (session.user.id === id) {
    throw new Error("No podés cambiar tu propio rol");
  }

  if (role === "CUSTOMER") {
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) throw new Error("Tiene que quedar al menos un admin");
    }
  }

  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
}

export async function deleteUser(id: string) {
  const { session } = await requireAdmin();
  if (session.user.id === id) {
    throw new Error("No podés borrar tu propia cuenta");
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new Error("Usuario no encontrado");

  const [orderCount, pointsCount, redemptionCount] = await Promise.all([
    prisma.order.count({ where: { userId: id } }),
    prisma.pointsLedger.count({ where: { userId: id } }),
    prisma.couponRedemption.count({ where: { userId: id } }),
  ]);
  if (orderCount + pointsCount + redemptionCount > 0) {
    throw new Error("No se puede borrar un usuario con pedidos o actividad asociada — perderías ese historial.");
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) throw new Error("Tiene que quedar al menos un admin");
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
}
