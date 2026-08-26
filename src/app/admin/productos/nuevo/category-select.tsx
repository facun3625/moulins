"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminTheme } from "@/components/admin/admin-theme-root";

export function CategorySelect({ categories }: { categories: { id: string; name: string }[] }) {
  const { containerRef } = useAdminTheme();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="categoryId">Tipo de producto</Label>
      <Select name="categoryId" items={categories.map((c) => ({ value: c.id, label: c.name }))} required>
        <SelectTrigger id="categoryId" className="w-full">
          <SelectValue placeholder="Elegí un tipo" />
        </SelectTrigger>
        <SelectContent container={containerRef}>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
