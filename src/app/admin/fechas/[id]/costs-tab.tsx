"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/admin/confirm-provider";
import { formatPrice } from "@/lib/format";
import { addDeliveryDateCost, deleteDeliveryDateCost } from "../actions";

export type CostRow = { id: string; label: string; amount: number; createdAt: string };

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export function CostsTab({ deliveryDateId, costs }: { deliveryDateId: string; costs: CostRow[] }) {
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);

  const total = costs.reduce((sum, c) => sum + c.amount, 0);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      try {
        await addDeliveryDateCost(deliveryDateId, formData);
        formRef.current?.reset();
        toast.success("Costo agregado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo agregar el costo");
      }
    });
  }

  async function handleDelete(id: string, label: string) {
    const ok = await confirm({
      title: "Borrar costo",
      description: `¿Borrar "${label}"?`,
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteDeliveryDateCost(id);
      toast.success("Costo borrado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo borrar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Opcional — cargá acá lo que te costó esta fecha (ingredientes, delivery, lo que sea). Se
        usa en Estadísticas para calcular el resultado neto (ventas menos costos) de esta fecha.
      </p>

      {costs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Todavía no cargaste ningún costo para esta fecha.
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {costs.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="flex flex-col">
                <span className="font-medium">{c.label}</span>
                <span className="text-xs text-muted-foreground">{dateFormatter.format(new Date(c.createdAt))}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{formatPrice(c.amount)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={deletingId === c.id}
                  onClick={() => handleDelete(c.id, c.label)}
                  aria-label={`Borrar ${c.label}`}
                >
                  <Trash2Icon className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      )}

      <form ref={formRef} action={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="cost-label">Costo</Label>
          <Input id="cost-label" name="label" placeholder="Ej: Ingredientes" required />
        </div>
        <div className="flex w-36 flex-col gap-1.5">
          <Label htmlFor="cost-amount">Monto</Label>
          <Input id="cost-amount" name="amount" type="number" min="0.01" step="0.01" placeholder="0" required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Agregando..." : "Agregar"}
        </Button>
      </form>
    </div>
  );
}
