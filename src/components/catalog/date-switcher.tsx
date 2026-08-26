"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

export function DateSwitcher({
  deliveryDates,
  selectedId,
}: {
  deliveryDates: { id: string; date: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  if (deliveryDates.length <= 1) return null;

  return (
    <div className="flex gap-1 overflow-x-auto rounded-full bg-muted p-1">
      {deliveryDates.map((d) => {
        const active = d.id === selectedId;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => router.push(`/?fecha=${d.id}`)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {dateFormatter.format(new Date(d.date))}
          </button>
        );
      })}
    </div>
  );
}
