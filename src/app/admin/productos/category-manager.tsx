"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createCategory, deleteCategory, renameCategory, toggleCategoryActive } from "./actions";
import { CategoryIconPicker } from "./category-icon-picker";
import { CategoryIcon } from "@/components/catalog/category-icon";
import { useAdminTheme } from "@/components/admin/admin-theme-root";

type Category = { id: string; name: string; icon: string | null; active: boolean };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const { containerRef } = useAdminTheme();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        Categorías
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto" container={containerRef}>
        <SheetHeader>
          <SheetTitle>Tipos de producto</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Todavía no cargaste ningún tipo de producto.
            </p>
          )}
          <NewCategoryForm />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [togglePending, startToggleTransition] = useTransition();

  if (editing) {
    return (
      <form
        action={(formData) =>
          startTransition(async () => {
            try {
              await renameCategory(category.id, formData);
              setEditing(false);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error al renombrar");
            }
          })
        }
        className="flex items-center gap-2"
      >
        <CategoryIconPicker name="icon" defaultValue={category.icon} />
        <Input name="name" defaultValue={category.name} required autoFocus className="flex-1" />
        <Button type="submit" size="sm" disabled={pending}>
          Guardar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <span className="flex items-center gap-2 text-sm">
        {category.icon && <CategoryIcon name={category.icon} className="size-4 text-muted-foreground" />}
        {category.name}
        {!category.active && (
          <Badge variant="secondary" className="shrink-0">
            Oculta
          </Badge>
        )}
      </span>
      <div className="flex items-center gap-1">
        <Switch
          checked={category.active}
          disabled={togglePending}
          onCheckedChange={(active) =>
            startToggleTransition(async () => {
              try {
                await toggleCategoryActive(category.id, active);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Error");
              }
            })
          }
        />
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
                await deleteCategory(category.id);
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

function NewCategoryForm() {
  const [pending, startTransition] = useTransition();
  const [iconKey, setIconKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          try {
            await createCategory(formData);
            formRef.current?.reset();
            setIconKey((k) => k + 1);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error al crear");
          }
        })
      }
      className="mt-2 flex items-center gap-2 border-t pt-4"
    >
      <CategoryIconPicker key={iconKey} name="icon" />
      <Input name="name" placeholder="Nuevo tipo de producto" required className="flex-1" />
      <Button type="submit" size="sm" disabled={pending}>
        Agregar
      </Button>
    </form>
  );
}
