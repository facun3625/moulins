"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTransferConfig } from "./actions";
import type { TransferConfig } from "./page";

export function TransferConfigForm({ config }: { config: TransferConfig }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          try {
            await updateTransferConfig(formData);
            toast.success("Datos de transferencia guardados");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error al guardar");
          }
        })
      }
      className="flex flex-col gap-3 border-t pt-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="bankName">Banco</Label>
          <Input id="bankName" name="bankName" defaultValue={config.bankName ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="accountHolder">Titular</Label>
          <Input id="accountHolder" name="accountHolder" defaultValue={config.accountHolder ?? ""} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cbuOrAlias">CBU / Alias</Label>
        <Input id="cbuOrAlias" name="cbuOrAlias" defaultValue={config.cbuOrAlias ?? ""} />
      </div>
      <Button type="submit" size="sm" disabled={pending} className="self-start">
        Guardar datos bancarios
      </Button>
    </form>
  );
}
