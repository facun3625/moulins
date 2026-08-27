import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DOMPurify from "isomorphic-dompurify";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { ServiceRowActions } from "./service-row-actions";

export default async function ServicesAdminPage() {
  await requireAdmin();
  const services = await prisma.service.findMany({ include: { images: { orderBy: { order: "asc" }, take: 1 }, _count: { select: { fields: true } } }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  return <div className="flex flex-col gap-4"><div className="flex items-center justify-between"><div><h1 className="text-xl font-semibold">Servicios</h1><p className="text-sm text-muted-foreground">Servicios que se cotizan por presupuesto.</p></div><Button render={<Link href="/admin/servicios/nuevo" />} size="sm">Nuevo servicio</Button></div>
    <div className="flex flex-col gap-3">{services.map(service => { const summary = DOMPurify.sanitize(service.description, { ALLOWED_TAGS: [] }).replace(/\s+/g, " ").trim(); return <article key={service.id} className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center"><div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">{service.images[0] && <Image src={service.images[0].url} alt="" fill className="object-cover" />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate font-semibold">{service.title}</h2>{!service.active && <Badge variant="secondary">Oculto</Badge>}</div><p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{summary || "Sin texto explicativo"}</p><p className="mt-1 text-xs text-muted-foreground">{service._count.fields} {service._count.fields === 1 ? "campo" : "campos"} en el formulario</p></div><ServiceRowActions id={service.id} title={service.title} /></article>; })}{services.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Todavía no cargaste servicios.</p>}</div>
  </div>;
}
