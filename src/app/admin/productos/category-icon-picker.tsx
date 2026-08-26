"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/catalog/category-icon";
import { cn } from "@/lib/utils";
import { CATEGORY_ICON_NAMES } from "@/lib/category-icons";
import { useAdminTheme } from "@/components/admin/admin-theme-root";

export function CategoryIconPicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const [icon, setIcon] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const { containerRef } = useAdminTheme();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={icon} />
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
          />
        }
      >
        <CategoryIcon name={icon} />
      </DialogTrigger>
      <DialogContent className="max-w-xs gap-3" container={containerRef}>
        <DialogHeader>
          <DialogTitle>Elegí un ícono</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-6 gap-1.5">
          {CATEGORY_ICON_NAMES.map((iconName) => (
            <button
              key={iconName}
              type="button"
              onClick={() => {
                setIcon(iconName);
                setOpen(false);
              }}
              className={cn(
                "flex size-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent",
                icon === iconName && "bg-primary text-primary-foreground",
              )}
            >
              <CategoryIcon name={iconName} />
            </button>
          ))}
        </div>
        {icon && (
          <button
            type="button"
            onClick={() => {
              setIcon("");
              setOpen(false);
            }}
            className="rounded-md border border-dashed py-1.5 text-xs text-muted-foreground"
          >
            Quitar ícono
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
