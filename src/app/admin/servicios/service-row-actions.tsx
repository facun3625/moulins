"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/admin/confirm-provider";
import { deleteService } from "./actions";

export function ServiceRowActions({ id, title, showEdit = true }: { id: string; title: string; showEdit?: boolean }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  async function remove() {
    const accepted = await confirm({ title: "Eliminar servicio", description: `¿Querés eliminar “${title}”? Esta acción no se puede deshacer.`, confirmLabel: "Eliminar", destructive: true });
    if (!accepted) return;
    startTransition(async () => { try { await deleteService(id); toast.success("Servicio eliminado"); router.push("/admin/servicios"); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo eliminar"); } });
  }
  return <div className="flex shrink-0 gap-2">{showEdit && <Button render={<Link href={`/admin/servicios/${id}`} />} variant="outline" size="sm"><PencilIcon className="size-3.5" />Editar</Button>}<Button type="button" variant="destructive" size="sm" disabled={pending} onClick={remove}><Trash2Icon className="size-3.5" />Eliminar</Button></div>;
}
