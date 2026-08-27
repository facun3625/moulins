import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { ServiceEditor } from "../service-editor";
import { ServiceRowActions } from "../service-row-actions";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) { await requireAdmin(); const { id } = await params; const service = await prisma.service.findUnique({ where: { id }, include: { fields: { orderBy: { order: "asc" } }, images: { orderBy: { order: "asc" } } } }); if (!service) notFound(); return <div className="flex flex-col gap-4"><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Editar servicio</h1><ServiceRowActions id={id} title={service.title} showEdit={false} /></div><ServiceEditor service={service} /></div>; }
