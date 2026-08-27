"use client";

import { useState } from "react";
import Link from "next/link";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminTheme } from "@/components/admin/admin-theme-root";

export type StockGroupSelection = { stockGroupId: string };

/**
 * Todo producto pertenece a un grupo de stock (propio o compartido). Antes
 * se podía crear uno nuevo al toque desde acá, sin darse cuenta — eso
 * generaba grupos duplicados por error. Ahora hay que elegir uno que ya
 * exista; si hace falta uno nuevo, se crea a propósito desde "Grupos de
 * stock" en la lista de productos, donde además se le carga la cantidad
 * inicial.
 */
export function StockGroupPicker({
  groups,
  defaultGroupId,
  onChange,
}: {
  groups: { id: string; name: string }[];
  defaultGroupId?: string;
  onChange?: (value: StockGroupSelection) => void;
}) {
  const { containerRef } = useAdminTheme();
  const [selection, setSelection] = useState(defaultGroupId ?? "");

  function handleChange(value: string) {
    setSelection(value);
    onChange?.({ stockGroupId: value });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="p-stock-group">Stock</Label>
      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Todavía no creaste ningún grupo de stock. Creá uno primero desde{" "}
          <Link href="/admin/productos?panel=grupos" className="font-medium text-primary hover:underline">
            Productos → Grupos de stock
          </Link>
          .
        </p>
      ) : (
        <Select value={selection} onValueChange={(v) => handleChange(String(v))} name="stockGroupId" required>
          <SelectTrigger id="p-stock-group" className="w-full">
            <SelectValue placeholder="Elegí un grupo de stock" />
          </SelectTrigger>
          <SelectContent container={containerRef}>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <p className="text-xs text-muted-foreground">
        Este producto va a compartir stock con todo lo que esté en ese grupo. ¿Necesitás uno
        nuevo? Creálo desde{" "}
        <Link href="/admin/productos?panel=grupos" className="font-medium text-foreground hover:underline">
          Productos → Grupos de stock
        </Link>
        .
      </p>
    </div>
  );
}
