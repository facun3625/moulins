"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const schema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "QUOTED", "RESPONDED", "ACCEPTED", "REJECTED", "CLOSED"]),
  quotedAmount: z.coerce.number().nonnegative().nullable(),
  internalNotes: z.string().trim().optional(),
});

export async function updateInquiry(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = schema.parse({
    status: formData.get("status"),
    quotedAmount: formData.get("quotedAmount") ? formData.get("quotedAmount") : null,
    internalNotes: String(formData.get("internalNotes") ?? ""),
  });
  await prisma.$transaction(async (tx) => {
    const inquiry = await tx.serviceInquiry.update({ where: { id }, data: { status: parsed.status, quotedAmount: parsed.quotedAmount, internalNotes: parsed.internalNotes || null } });
    await tx.serviceInquiryEvent.create({ data: { inquiryId: id, status: inquiry.status, quotedAmount: inquiry.quotedAmount, notes: inquiry.internalNotes } });
  });
  revalidatePath("/admin/consultas");
  revalidatePath(`/admin/consultas/${id}`);
  revalidatePath("/admin", "layout");
}
