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
    <div className={cn(
      "flex items-center gap-1",
      variant === "overlay" && "rounded-full bg-black/30 p-1 backdrop-blur-md ring-[1.5px] ring-white/40"
    )}>
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
                  ? "bg-white text-foreground shadow-sm"
                  : "text-white/90 hover:bg-white/20 hover:text-white"
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
