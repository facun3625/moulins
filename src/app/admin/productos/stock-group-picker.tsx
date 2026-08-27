"use client";

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
import { cn } from "@/lib/utils";

export type StockGroupSelection = { mode: "individual" | "shared"; sharedGroupId: string };

/**
 * Cada variante (o el producto simple, que en el fondo tiene una sola
 * variante implícita) tiene su propio pozo de stock: individual, o
 * compartido con otras. El grupo dedicado de "Individual" se crea/reusa
 * solo, en silencio — acá solo se elige con cuál grupo YA EXISTENTE
 * compartir, si corresponde. Solo se listan grupos con 2+ miembros: los
 * individuales de otras variantes no sirven para compartir y no ensucian
 * la lista.
 */
export function StockGroupPicker({
  groups,
  value,
  onChange,
  idPrefix = "stock-group",
  label = "Stock",
}: {
  groups: { id: string; name: string }[];
  value: StockGroupSelection;
  onChange: (value: StockGroupSelection) => void;
  idPrefix?: string;
  label?: string;
}) {
  const { containerRef } = useAdminTheme();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${idPrefix}-select`}>{label}</Label>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ mode: "individual", sharedGroupId: value.sharedGroupId })}
          className={cn(
            "flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors",
            value.mode === "individual"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground",
          )}
        >
          Individual
        </button>
        <button
          type="button"
          onClick={() => onChange({ mode: "shared", sharedGroupId: value.sharedGroupId || groups[0]?.id || "" })}
          disabled={groups.length === 0}
          className={cn(
            "flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors disabled:opacity-40",
            value.mode === "shared"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground",
          )}
        >
          Compartir stock
        </button>
      </div>

      {value.mode === "shared" &&
        (groups.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Todavía no hay ningún grupo compartido armado. Se crean cuando dos o más variantes
            eligen compartir stock entre sí.
          </p>
        ) : (
          <Select
            value={value.sharedGroupId}
            onValueChange={(v) => onChange({ mode: "shared", sharedGroupId: String(v) })}
          >
            <SelectTrigger id={`${idPrefix}-select`} className="w-full">
              <SelectValue placeholder="Elegí con qué grupo compartir">
                {groups.find((g) => g.id === value.sharedGroupId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent container={containerRef}>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

      <p className="text-xs text-muted-foreground">
        {value.mode === "individual"
          ? "Tiene su propio pozo de stock, sin compartir con nada más."
          : "Comparte un único total por fecha con todo lo que esté en ese grupo."} La cantidad
        se carga por fecha, no acá —{" "}
        <Link href="/admin/fechas" className="font-medium text-foreground hover:underline">
          Fechas y stock
        </Link>
        , pestaña &quot;Stock&quot;.
      </p>
    </div>
  );
}
