"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Tienda" },
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
];

export function StoreNav({ variant = "card" }: { variant?: "card" | "overlay" }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              variant === "overlay"
                ? active
                  ? "bg-white text-foreground"
                  : "text-white/90 hover:bg-white/10"
                : active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
