"use client";

import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

export function CategoryPills({
  categories,
  selected,
  onSelect,
}: {
  categories: { id: string; name: string; icon?: string | null }[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-1">
      <CategoryPill
        active={selected === null}
        icon="UtensilsCrossed"
        label="Todo"
        onClick={() => onSelect(null)}
      />
      {categories.map((c) => (
        <CategoryPill
          key={c.id}
          active={selected === c.id}
          icon={c.icon}
          label={c.name}
          onClick={() => onSelect(c.id)}
        />
      ))}
    </div>
  );
}

function CategoryPill({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: string | null;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-1.5"
    >
      <CategoryIcon
        name={icon}
        className={cn("size-8 transition-colors", active ? "text-primary" : "text-muted-foreground")}
      />
      <span
        className={cn(
          "max-w-16 truncate text-xs font-semibold transition-colors",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}
