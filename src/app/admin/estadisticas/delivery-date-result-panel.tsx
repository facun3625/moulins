"use client";

import { useMemo, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeliveryDateOption, OrderStatsRow } from "@/lib/stats";

export function DeliveryDateResultPanel({
  orders,
  deliveryDateOptions,
}: {
  orders: OrderStatsRow[];
  deliveryDateOptions: DeliveryDateOption[];
}) {
  const { containerRef } = useAdminTheme();
  const [selectedId, setSelectedId] = useState<string>(deliveryDateOptions[0]?.id ?? "");

  const selected = deliveryDateOptions.find((d) => d.id === selectedId) ?? null;

  const ordersForDate = useMemo(
    () => (selected ? orders.filter((o) => o.deliveryDateId === selected.id) : []),
    [orders, selected],
  );
  const sales = ordersForDate.reduce((s, o) => s + o.total, 0);
  const costsTotal = selected ? selected.costs.reduce((s, c) => s + c.amount, 0) : 0;
  const result = sales - costsTotal;

  if (deliveryDateOptions.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <h2 className="mb-1 text-sm font-semibold">Resultado por fecha de entrega</h2>
        <p className="text-sm text-muted-foreground">Todavía no hay ventas ni costos cargados en ninguna fecha.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Resultado por fecha de entrega</h2>
        <Select value={selectedId} onValueChange={(v) => setSelectedId(String(v))}>
          <SelectTrigger size="sm" className="w-48">
            <SelectValue>{selected?.label ?? "Elegí una fecha"}</SelectValue>
          </SelectTrigger>
          <SelectContent container={containerRef}>
            {deliveryDateOptions.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5 rounded-lg bg-muted p-3">
              <span className="text-xs text-muted-foreground">
                Ventas ({ordersForDate.length} {ordersForDate.length === 1 ? "pedido" : "pedidos"})
              </span>
              <span className="text-lg font-semibold">{formatPrice(sales)}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg bg-muted p-3">
              <span className="text-xs text-muted-foreground">
                Costos ({selected.costs.length})
              </span>
              <span className="text-lg font-semibold">{formatPrice(costsTotal)}</span>
            </div>
            <div
              className={cn(
                "flex flex-col gap-0.5 rounded-lg p-3",
                result >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
              )}
            >
              <span className="text-xs text-muted-foreground">Resultado</span>
              <span
                className={cn(
                  "text-lg font-semibold",
                  result >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                )}
              >
                {formatPrice(result)}
              </span>
            </div>
          </div>

          {selected.costs.length > 0 && (
            <div className="mt-3 flex flex-col divide-y rounded-lg border">
              {selected.costs.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="font-medium">{formatPrice(c.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
