"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateCashRestriction } from "./actions";

// Filtro opcional: exigir cierta cantidad de pedidos previos para poder
// pagar en efectivo (para no ofrecérselo a alguien que nunca compró antes,
// invitados incluidos — un invitado nunca cumple porque no tiene cuenta).
export function CashRestrictionForm({ minPreviousOrders }: { minPreviousOrders: number | null }) {
  const [enabled, setEnabled] = useState(minPreviousOrders != null);
  const [value, setValue] = useState(String(minPreviousOrders ?? 1));
  const [togglePending, startToggleTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    startToggleTransition(async () => {
      try {
        await updateCashRestriction(checked ? Math.max(1, Number(value) || 1) : null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  }

  function handleSave() {
    startSaveTransition(async () => {
      try {
        await updateCashRestriction(Math.max(1, Number(value) || 1));
        toast.success("Guardado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Restringir a clientes recurrentes</span>
          <span className="text-xs text-muted-foreground">
            Solo lo van a poder elegir compradores con cuenta que ya hicieron pedidos antes
            (los invitados nunca lo van a ver).
          </span>
        </div>
        <Switch checked={enabled} disabled={togglePending} onCheckedChange={handleToggle} />
      </div>
      {enabled && (
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="minPreviousOrders">Pedidos previos mínimos</Label>
            <Input
              id="minPreviousOrders"
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-28"
            />
          </div>
          <Button type="button" size="sm" onClick={handleSave} disabled={savePending}>
            Guardar
          </Button>
        </div>
      )}
    </div>
  );
}
