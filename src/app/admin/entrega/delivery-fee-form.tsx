"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDeliveryFee } from "./actions";

export function DeliveryFeeForm({ fee }: { fee: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          try {
            await updateDeliveryFee(formData);
            toast.success("Costo de envío guardado");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error al guardar");
          }
        })
      }
      className="flex items-end gap-2 border-t pt-3"
    >
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="fee">Costo de envío</Label>
        <Input id="fee" name="fee" type="number" min="0" step="0.01" defaultValue={fee} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Guardar
      </Button>
    </form>
  );
}
