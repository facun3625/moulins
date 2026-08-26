"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  PackageIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  CreditCardIcon,
  TruckIcon,
  TicketIcon,
  SettingsIcon,
  StoreIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

import { useStoreSettings } from "@/lib/store-settings-context";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboardIcon },
  { href: "/admin/productos", label: "Productos", icon: PackageIcon },
  { href: "/admin/fechas", label: "Fechas y stock", icon: CalendarDaysIcon },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardListIcon },
  { href: "/admin/pagos", label: "Medios de pago", icon: CreditCardIcon },
  { href: "/admin/entrega", label: "Entrega", icon: TruckIcon },
  { href: "/admin/cupones", label: "Cupones", icon: TicketIcon },
  { href: "/admin/puntos", label: "Puntos", icon: SparklesIcon },
  { href: "/admin/usuarios", label: "Usuarios", icon: UsersIcon },
  { href: "/admin/configuracion", label: "Configuración", icon: SettingsIcon },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { storeName, logoUrl } = useStoreSettings();
  const pathname = usePathname();

  return (
    <div className="flex flex-1 w-full flex-col text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-accent">
          {logoUrl ? (
            <Image src={logoUrl} alt={storeName} width={36} height={36} className="size-full object-contain" />
          ) : (
            <StoreIcon className="size-4 text-sidebar-accent-foreground/70" />
          )}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{storeName}</span>
          <span className="text-xs text-sidebar-foreground/60">Panel de administración</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {sections.map((s) => {
          const active = s.href === "/admin" ? pathname === "/admin" : pathname.startsWith(s.href);
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {s.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <StoreIcon className="size-4 shrink-0" />
          Ver tienda
        </Link>
      </div>
    </div>
  );
}
