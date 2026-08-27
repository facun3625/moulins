"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { createStockGroup, deleteStockGroup, updateStockGroup } from "./actions";

type StockGroup = { id: string; name: string; defaultStockQuantity: number | null; productCount: number };

export function StockGroupManager({ groups, defaultOpen }: { groups: StockGroup[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { containerRef } = useAdminTheme();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>Grupos de stock</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto" container={containerRef}>
        <SheetHeader>
          <SheetTitle>Grupos de stock compartido</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          <p className="text-xs text-muted-foreground">
            Productos en el mismo grupo comparten un único total por fecha (ej: &quot;Pizzas&quot;
            con 100 unidades a repartir entre todos los gustos), en vez de cargar stock a cada
            variante por separado. El valor de acá es solo el punto de partida de cada fecha
            nueva — la cantidad real de cada fecha se edita en Fechas → Stock.
          </p>
          {groups.map((g) => (
            <StockGroupRow key={g.id} group={g} />
          ))}
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no creaste ningún grupo.</p>
          )}
          <NewStockGroupForm />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function QtyField({
  unlimited,
  onUnlimitedChange,
  value,
  onValueChange,
}: {
  unlimited: boolean;
  onUnlimitedChange: (v: boolean) => void;
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={unlimited}
          onChange={(e) => onUnlimitedChange(e.target.checked)}
        />
        Sin límite
      </label>
      <Input
        type="number"
        min="0"
        step="1"
        value={unlimited ? "" : value}
        readOnly={unlimited}
        placeholder={unlimited ? "—" : "Ej: 20"}
        onChange={(e) => onValueChange(e.target.value)}
        className="flex-1 border-primary/50 bg-primary/5 read-only:border-input read-only:bg-muted read-only:text-muted-foreground"
      />
    </div>
  );
}

function StockGroupRow({ group }: { group: StockGroup }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(group.name);
  const [unlimited, setUnlimited] = useState(group.defaultStockQuantity == null);
  const [qty, setQty] = useState(group.defaultStockQuantity != null ? String(group.defaultStockQuantity) : "");

  function save() {
    if (!name.trim()) {
      toast.error("Ingresá un nombre");
      return;
    }
    if (!unlimited && !qty.trim()) {
      toast.error("Ingresá una cantidad o tildá \"Sin límite\"");
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", name.trim());
        formData.set("defaultStockQuantity", unlimited ? "" : qty);
        await updateStockGroup(group.id, formData);
        setEditing(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-md border p-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="Nombre" />
        <QtyField unlimited={unlimited} onUnlimitedChange={setUnlimited} value={qty} onValueChange={setQty} />
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            Guardar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{group.name}</span>
        <span className="text-xs text-muted-foreground">
          {group.productCount} {group.productCount === 1 ? "producto" : "productos"} ·{" "}
          {group.defaultStockQuantity != null ? `${group.defaultStockQuantity} por defecto` : "sin límite por defecto"}
        </span>
      </div>
      <div className="flex gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await deleteStockGroup(group.id);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Error al borrar");
              }
            })
          }
        >
          Borrar
        </Button>
      </div>
    </div>
  );
}

function NewStockGroupForm() {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [qty, setQty] = useState("");

  function create() {
    if (!name.trim()) {
      toast.error("Ingresá un nombre");
      return;
    }
    if (!unlimited && !qty.trim()) {
      toast.error("Ingresá una cantidad o tildá \"Sin límite\"");
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", name.trim());
        formData.set("defaultStockQuantity", unlimited ? "" : qty);
        await createStockGroup(formData);
        setName("");
        setUnlimited(false);
        setQty("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al crear");
      }
    });
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t pt-4">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo grupo (ej: Pizzas)" />
      <QtyField unlimited={unlimited} onUnlimitedChange={setUnlimited} value={qty} onValueChange={setQty} />
      <Button type="button" size="sm" onClick={create} disabled={pending} className="self-end">
        Agregar
      </Button>
    </div>
  );
}
