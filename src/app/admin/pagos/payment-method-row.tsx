"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { PaymentMethodType } from "@/generated/prisma/client";
import { setPaymentMethodEnabled, updatePaymentMethodLabel } from "./actions";

export function PaymentMethodRow({
  type,
  title,
  defaultTitle,
  description,
  enabled,
  disabled,
}: {
  type: PaymentMethodType;
  title: string;
  defaultTitle: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [togglePending, startToggleTransition] = useTransition();
  const [labelPending, startLabelTransition] = useTransition();

  if (editing) {
    return (
      <form
        action={(formData) =>
          startLabelTransition(async () => {
            try {
              await updatePaymentMethodLabel(type, String(formData.get("label") ?? ""));
              setEditing(false);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error al guardar");
            }
          })
        }
        className="flex items-center gap-2"
      >
        <Input
          name="label"
          defaultValue={title === defaultTitle ? "" : title}
          placeholder={defaultTitle}
          autoFocus
          className="h-8 flex-1"
        />
        <Button type="submit" size="sm" disabled={labelPending}>
          Guardar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">{title}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Editar nombre"
            onClick={() => setEditing(true)}
          >
            <PencilIcon className="size-3" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <Switch
        checked={enabled}
        disabled={disabled || togglePending}
        onCheckedChange={(checked) =>
          startToggleTransition(async () => {
            try {
              await setPaymentMethodEnabled(type, checked);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            }
          })
        }
      />
    </div>
  );
}
