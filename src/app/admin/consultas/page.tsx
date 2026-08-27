import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { formatPrice } from "@/lib/format";
import { INQUIRY_STATUS_COLORS, INQUIRY_STATUS_LABELS } from "@/lib/inquiry-status";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });
type Answer = { label: string; value: string };
export default async function InquiriesPage() {
  await requireAdmin();
  const inquiries = await prisma.serviceInquiry.findMany({ orderBy: { createdAt: "desc" } });
  return <div className="flex flex-col gap-4"><div><h1 className="text-xl font-semibold">Consultas</h1><p className="text-sm text-muted-foreground">Seguimiento de solicitudes de presupuesto.</p></div><div className="flex flex-col gap-3">{inquiries.map(inquiry => { const answers = inquiry.answers as unknown as Answer[]; const contact = answers.slice(0,2).map(answer => answer.value).join(" · "); return <Link key={inquiry.id} href={`/admin/consultas/${inquiry.id}`} className="flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate font-semibold">{inquiry.serviceTitle}</h2><Badge className={INQUIRY_STATUS_COLORS[inquiry.status]}>{INQUIRY_STATUS_LABELS[inquiry.status]}</Badge></div><p className="mt-1 truncate text-sm text-muted-foreground">{contact}</p><p className="mt-1 text-xs text-muted-foreground">{dateFormatter.format(inquiry.createdAt)}</p></div>{inquiry.quotedAmount && <span className="shrink-0 font-semibold">{formatPrice(Number(inquiry.quotedAmount))}</span>}</Link>; })}{!inquiries.length && <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Todavía no recibiste consultas.</p>}</div></div>;
}
