"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePointsRate } from "./actions";

export function RateForm({ currentRate }: { currentRate: number }) {
  const [value, setValue] = useState(String(currentRate));
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
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
        <Label htmlFor="pointsPerAmount">Puntos por cada $1 gastado</Label>
        <Input
          id="pointsPerAmount"
          name="pointsPerAmount"
          type="number"
          min="0"
          step="0.01"
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
