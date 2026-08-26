"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminTheme } from "@/components/admin/admin-theme-root";

const NEW_GROUP = "__new__";

export type StockGroupSelection = { stockGroupId: string; newStockGroupName: string };

/**
 * Todo producto pertenece a un grupo de stock (propio o compartido). Este
 * selector deja elegir uno existente o crear uno nuevo al toque, sin tener
 * que ir primero a "Grupos de stock". Sirve tanto en un <form action=...>
 * nativo (usa los name= de los campos) como controlado desde un componente
 * cliente vía onChange.
 */
export function StockGroupPicker({
  groups,
  defaultGroupId,
  newGroupNamePlaceholder,
  onChange,
}: {
  groups: { id: string; name: string }[];
  defaultGroupId?: string;
  newGroupNamePlaceholder?: string;
  onChange?: (value: StockGroupSelection) => void;
}) {
  const { containerRef } = useAdminTheme();
  const [selection, setSelection] = useState(defaultGroupId || NEW_GROUP);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    onChange?.({
      stockGroupId: selection === NEW_GROUP ? "" : selection,
      newStockGroupName: selection === NEW_GROUP ? newName : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, newName]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="p-stock-group">Stock</Label>
      <Select
        value={selection}
        onValueChange={(v) => setSelection(String(v))}
        name={selection === NEW_GROUP ? undefined : "stockGroupId"}
        items={[
          { value: NEW_GROUP, label: "+ Crear grupo nuevo" },
          ...groups.map((g) => ({ value: g.id, label: g.name })),
        ]}
      >
        <SelectTrigger id="p-stock-group" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent container={containerRef}>
          <SelectItem value={NEW_GROUP}>+ Crear grupo nuevo</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selection === NEW_GROUP ? (
        <Input
          name="newStockGroupName"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={newGroupNamePlaceholder ?? "Nombre del grupo (vacío = usa el nombre del producto)"}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          Este producto va a compartir stock con todo lo que esté en este grupo. Si es la
          primera vez que lo usás para este producto, cargá la cantidad en Fechas y stock.
        </p>
      )}
    </div>
  );
}
