"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CopyIcon, PlusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveWeeklySchedule } from "../actions";

const WEEKDAY_LABELS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export type WindowInput = {
  order: number;
  orderOpenTime: string;
  orderCloseTime: string;
  fulfillmentStart: string;
  fulfillmentEnd: string;
};

export type DayInput = { weekday: number; enabled: boolean; windows: WindowInput[] };

function emptyWindow(order: number): WindowInput {
  return { order, orderOpenTime: "", orderCloseTime: "", fulfillmentStart: "", fulfillmentEnd: "" };
}

function windowComplete(w: WindowInput) {
  return Boolean(w.orderOpenTime && w.orderCloseTime && w.fulfillmentStart && w.fulfillmentEnd);
}

export function WeeklyScheduleForm({ initialDays }: { initialDays: DayInput[] }) {
  const [days, setDays] = useState<DayInput[]>(initialDays);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggleDay(weekday: number) {
    setDays((prev) =>
      prev.map((d) =>
        d.weekday === weekday
          ? { ...d, enabled: !d.enabled, windows: !d.enabled && d.windows.length === 0 ? [emptyWindow(0)] : d.windows }
          : d,
      ),
    );
  }

  function addWindow(weekday: number) {
    setDays((prev) =>
      prev.map((d) =>
        d.weekday === weekday && d.windows.length < 2 ? { ...d, windows: [...d.windows, emptyWindow(d.windows.length)] } : d,
      ),
    );
  }

  function removeWindow(weekday: number, index: number) {
    setDays((prev) =>
      prev.map((d) =>
        d.weekday === weekday
          ? { ...d, windows: d.windows.filter((_, i) => i !== index).map((w, i) => ({ ...w, order: i })) }
          : d,
      ),
    );
  }

  function patchWindow(weekday: number, index: number, changes: Partial<WindowInput>) {
    setDays((prev) =>
      prev.map((d) =>
        d.weekday === weekday ? { ...d, windows: d.windows.map((w, i) => (i === index ? { ...w, ...changes } : w)) } : d,
      ),
    );
  }

  function copyFirstToAll() {
    const source = days.find((d) => d.enabled && d.windows.some(windowComplete));
    if (!source) {
      toast.error("Completá al menos un día primero");
      return;
    }
    setDays((prev) =>
      prev.map((d) => (d.enabled && d.weekday !== source.weekday ? { ...d, windows: source.windows.map((w) => ({ ...w })) } : d)),
    );
    toast.success("Horario copiado a los demás días activos");
  }

  const activeDays = days.filter((d) => d.enabled);
  const allComplete = activeDays.length > 0 && activeDays.every((d) => d.windows.length > 0 && d.windows.every(windowComplete));

  function save() {
    if (!allComplete) {
      toast.error("Completá los horarios de todos los días activos antes de guardar");
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("days", JSON.stringify(days));
        await saveWeeklySchedule(formData);
        toast.success("Horarios guardados");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {activeDays.length > 1 && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={copyFirstToAll}>
          <CopyIcon className="size-3.5" />
          Aplicar el horario del primer día activo a los demás
        </Button>
      )}

      {DISPLAY_ORDER.map((weekday) => {
        const day = days.find((d) => d.weekday === weekday)!;
        return (
          <div key={weekday} className="flex flex-col gap-3 rounded-lg border p-3">
            <label className="flex items-center gap-2.5">
              <Switch checked={day.enabled} onCheckedChange={() => toggleDay(weekday)} />
              <span className="text-sm font-medium capitalize">{WEEKDAY_LABELS[weekday]}</span>
            </label>

            {day.enabled && (
              <div className="flex flex-col gap-3 border-t pt-3">
                {day.windows.map((w, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-md bg-muted/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {day.windows.length > 1 ? (i === 0 ? "Primera franja (ej: mediodía)" : "Segunda franja (ej: noche)") : "Horario"}
                      </span>
                      {day.windows.length > 1 && (
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeWindow(weekday, i)}>
                          <XIcon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">Tomamos pedidos desde</Label>
                        <Input
                          type="time"
                          value={w.orderOpenTime}
                          onChange={(e) => patchWindow(weekday, i, { orderOpenTime: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">hasta</Label>
                        <Input
                          type="time"
                          value={w.orderCloseTime}
                          onChange={(e) => patchWindow(weekday, i, { orderCloseTime: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">Entrega/retiro desde</Label>
                        <Input
                          type="time"
                          value={w.fulfillmentStart}
                          onChange={(e) => patchWindow(weekday, i, { fulfillmentStart: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">hasta</Label>
                        <Input
                          type="time"
                          value={w.fulfillmentEnd}
                          onChange={(e) => patchWindow(weekday, i, { fulfillmentEnd: e.target.value })}
                        />
                      </div>
                    </div>
                    {windowComplete(w) && (
                      <p className="rounded-md bg-background px-3 py-2 text-xs text-foreground">
                        Se toman pedidos de <strong>{w.orderOpenTime}</strong> a <strong>{w.orderCloseTime}</strong>, para
                        entregar/retirar de <strong>{w.fulfillmentStart}</strong> a <strong>{w.fulfillmentEnd}</strong>.
                      </p>
                    )}
                  </div>
                ))}
                {day.windows.length < 2 && (
                  <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => addWindow(weekday)}>
                    <PlusIcon className="size-3.5" />
                    Agregar otra franja (ej: mediodía y noche)
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Button type="button" onClick={save} disabled={pending || !allComplete} className="self-start">
        {pending ? "Guardando..." : "Guardar horarios"}
      </Button>
      {activeDays.length === 0 && <p className="text-xs text-muted-foreground">Activá al menos un día.</p>}
      {activeDays.length > 0 && !allComplete && (
        <p className="text-xs text-muted-foreground">
          Faltan completar horarios en:{" "}
          {activeDays
            .filter((d) => d.windows.length === 0 || !d.windows.every(windowComplete))
            .map((d) => WEEKDAY_LABELS[d.weekday])
            .join(", ")}
          .
        </p>
      )}
    </div>
  );
}
