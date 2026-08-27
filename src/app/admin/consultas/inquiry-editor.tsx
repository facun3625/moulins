"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ServiceInquiryStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INQUIRY_STATUS_LABELS } from "@/lib/inquiry-status";
import { updateInquiry } from "./actions";

const statuses = Object.keys(INQUIRY_STATUS_LABELS) as ServiceInquiryStatus[];
export function InquiryEditor({ id, status: initialStatus, quotedAmount, internalNotes }: { id: string; status: ServiceInquiryStatus; quotedAmount: string; internalNotes: string }) {
  const [status, setStatus] = useState(initialStatus); const [pending, start] = useTransition();
  function submit(formData: FormData) { formData.set("status", status); start(async () => { try { await updateInquiry(id, formData); toast.success("Consulta actualizada"); } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar"); } }); }
  return <form action={submit} className="flex flex-col gap-4 rounded-xl border p-5"><h2 className="font-semibold">Seguimiento</h2><div className="grid gap-4 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label>Estado</Label><Select value={status} onValueChange={value => value && setStatus(value as ServiceInquiryStatus)} items={statuses.map(value => ({ value, label: INQUIRY_STATUS_LABELS[value] }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent align="start" alignItemWithTrigger={false}>{statuses.map(value => <SelectItem key={value} value={value}>{INQUIRY_STATUS_LABELS[value]}</SelectItem>)}</SelectContent></Select></div><div className="flex flex-col gap-2"><Label htmlFor="quotedAmount">Importe presupuestado</Label><Input id="quotedAmount" name="quotedAmount" type="number" min="0" step="0.01" defaultValue={quotedAmount} placeholder="$ 0" /></div></div><div className="flex flex-col gap-2"><Label htmlFor="internalNotes">Notas internas</Label><Textarea id="internalNotes" name="internalNotes" rows={6} defaultValue={internalNotes} placeholder="Conversaciones, detalles del presupuesto, próximos pasos…" /></div><Button type="submit" disabled={pending} className="self-start">{pending ? "Guardando…" : "Guardar seguimiento"}</Button></form>;
}
