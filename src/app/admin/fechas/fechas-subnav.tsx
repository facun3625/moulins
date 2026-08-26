"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/fechas", label: "Fechas" },
  { href: "/admin/fechas/cierres", label: "Cierres" },
];

export function FechasSubnav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto rounded-full bg-muted p-1">
      {tabs.map((t) => {
        const active = t.href === "/admin/fechas" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
