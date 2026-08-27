"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
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
  BarChart3Icon,
  ChevronDownIcon,
  ConciergeBellIcon,
  MessageSquareTextIcon,
} from "lucide-react";

import { useStoreSettings } from "@/lib/store-settings-context";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboardIcon },
  {
    href: "/admin/productos",
    label: "Productos",
    icon: PackageIcon,
    subitems: [
      { href: "/admin/productos", label: "Productos", panel: null },
      { href: "/admin/productos?panel=categorias", label: "Categorías", panel: "categorias" },
      { href: "/admin/productos?panel=grupos", label: "Grupos de stock", panel: "grupos" },
    ],
  },
  { href: "/admin/servicios", label: "Servicios", icon: ConciergeBellIcon },
  { href: "/admin/consultas", label: "Consultas", icon: MessageSquareTextIcon },
  { href: "/admin/fechas", label: "Fechas y stock", icon: CalendarDaysIcon },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardListIcon },
  { href: "/admin/pagos", label: "Medios de pago", icon: CreditCardIcon },
  { href: "/admin/entrega", label: "Entrega", icon: TruckIcon },
  { href: "/admin/cupones", label: "Cupones", icon: TicketIcon },
  { href: "/admin/puntos", label: "Puntos", icon: SparklesIcon },
  { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3Icon },
  { href: "/admin/usuarios", label: "Usuarios", icon: UsersIcon },
  { href: "/admin/configuracion", label: "Configuración", icon: SettingsIcon },
];

export function AdminSidebar({ onNavigate, newInquiryCount = 0, newOrderCount = 0 }: { onNavigate?: () => void; newInquiryCount?: number; newOrderCount?: number }) {
  const { storeName, logoUrl } = useStoreSettings();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panel = searchParams.get("panel");

  // La sección con sub-ítems se abre sola al entrar — pero una vez ahí, el
  // admin puede plegarla a mano sin que se reabra en cada click. Solo se
  // guarda como "override" mientras siga siendo la sección activa; al
  // navegar a otra, se vuelve a calcular desde cero.
  const activeParentHref = sections.find((s) => s.subitems && pathname.startsWith(s.href))?.href ?? null;
  const [override, setOverride] = useState<{ href: string; expanded: boolean } | null>(null);
  const expandedHref =
    override && override.href === activeParentHref ? (override.expanded ? activeParentHref : null) : activeParentHref;

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
          const expanded = expandedHref === s.href;
          const Icon = s.icon;
          return (
            <div key={s.href} className="flex flex-col">
              <Link
                href={s.href}
                onClick={() => {
                  onNavigate?.();
                  if (s.subitems) setOverride({ href: s.href, expanded: !expanded });
                }}
                aria-expanded={s.subitems ? expanded : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{s.label}</span>
                {s.href === "/admin/consultas" && newInquiryCount > 0 && <span className={cn("flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold", active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground")}>{newInquiryCount > 99 ? "99+" : newInquiryCount}</span>}
                {s.href === "/admin/pedidos" && newOrderCount > 0 && <span className={cn("flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold", active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground")}>{newOrderCount > 99 ? "99+" : newOrderCount}</span>}
                {s.subitems && (
                  <ChevronDownIcon
                    className={cn(
                      "size-3.5 shrink-0 opacity-70 transition-transform duration-200 ease-out",
                      expanded ? "rotate-0" : "-rotate-90",
                    )}
                  />
                )}
              </Link>
              {s.subitems && (
                <div
                  className={cn(
                    "grid transition-all duration-200 ease-out",
                    expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="ml-[1.15rem] flex flex-col gap-0.5 border-l border-sidebar-border py-1 pl-3.5">
                      {s.subitems.map((sub) => {
                        const subActive = panel === sub.panel;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={onNavigate}
                            className={cn(
                              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                              subActive
                                ? "text-primary"
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
                            )}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
