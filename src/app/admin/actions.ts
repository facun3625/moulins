"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function setStoreOpen(open: boolean) {
  await requireAdmin();
  await prisma.storeConfig.update({ where: { id: 1 }, data: { storeOpen: open } });
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
}
