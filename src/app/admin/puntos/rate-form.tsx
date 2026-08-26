"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePointsRate } from "./actions";

// pointsPerAmount se guarda como "puntos por cada $1" — un número como
// 0.001 es incómodo para cargar a mano, así que acá arriba se muestra y
// edita en la unidad que tiene sentido para un admin: puntos cada $1000.
const PER = 1000;

export function RateForm({ currentRate }: { currentRate: number }) {
  const [value, setValue] = useState(String(currentRate * PER));
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const perThousand = Number(formData.get("pointsPerThousand"));
    formData.set("pointsPerAmount", String(perThousand / PER));
    startTransition(async () => {
      try {
        await updatePointsRate(formData);
        toast.success("Tasa actualizada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="pointsPerThousand">Puntos por cada $1000 gastados</Label>
        <Input
          id="pointsPerThousand"
          name="pointsPerThousand"
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Guardar
      </Button>
    </form>
  );
}
