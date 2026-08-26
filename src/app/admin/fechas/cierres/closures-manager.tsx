"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStoreClosure, deleteStoreClosure } from "../actions";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

type Closure = { id: string; startDate: string; endDate: string; reason: string | null };

export function ClosuresManager({ closures }: { closures: Closure[] }) {
  const [pending, startTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-medium">Cierres, feriados y vacaciones</h2>
        <p className="text-xs text-muted-foreground">
          Ningún día dentro de un cierre se va a generar como fecha nueva, aunque esté
          activado en Horarios recurrentes.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {closures.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-medium">
                {dateFormatter.format(new Date(c.startDate))} — {dateFormatter.format(new Date(c.endDate))}
              </span>
              {c.reason && <span className="truncate text-xs text-muted-foreground">{c.reason}</span>}
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={deletePending}
              onClick={() =>
                startDeleteTransition(async () => {
                  try {
                    await deleteStoreClosure(c.id);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Error al borrar");
                  }
                })
              }
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
        {closures.length === 0 && (
          <p className="text-sm text-muted-foreground">No cargaste ningún cierre todavía.</p>
        )}
      </div>

      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            try {
              await createStoreClosure(formData);
              formRef.current?.reset();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error al crear el cierre");
            }
          })
        }
        className="flex flex-col gap-3 border-t pt-3"
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Desde</Label>
            <Input name="startDate" type="date" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Hasta</Label>
            <Input name="endDate" type="date" required />
          </div>
        </div>
        <Input name="reason" placeholder="Motivo (opcional): vacaciones, feriado..." />
        <Button type="submit" disabled={pending} className="self-start">
          Agregar cierre
        </Button>
      </form>
    </div>
  );
}
