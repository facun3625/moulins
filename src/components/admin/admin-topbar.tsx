"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { MenuIcon, StoreIcon, ChevronDownIcon, MoonIcon, SunIcon, PackageXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { setStoreOpen } from "@/app/admin/actions";
import type { StockAlert } from "@/lib/stock-alerts";

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function AdminTopbar({ storeOpen, stockAlerts }: { storeOpen: boolean; stockAlerts: StockAlert[] }) {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { containerRef, theme, toggleTheme } = useAdminTheme();
  const isDark = theme === "dark";

  const [open, setOpen] = useState(storeOpen);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(next: boolean) {
    setOpen(next);
    startTransition(async () => {
      try {
        await setStoreOpen(next);
        toast.success(next ? "Tienda abierta" : "Tienda cerrada");
        router.refresh();
      } catch (e) {
        setOpen(!next);
        toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
      }
    });
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur print:hidden lg:px-8">
      {/* Mobile menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 gap-0 p-0" showCloseButton={false} container={containerRef}>
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <AdminSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <Button
        variant="outline"
        size="icon"
        aria-label="Abrir menú"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <MenuIcon />
      </Button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        {stockAlerts.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex h-9 items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20" />
              }
            >
              <PackageXIcon className="size-3.5" />
              <span className="hidden sm:inline">Sin stock</span>
              <span className="flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                {stockAlerts.reduce((n, a) => n + a.outOfStockNames.length, 0)}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-72 p-1.5" container={containerRef}>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                  Agotado en fechas abiertas
                </DropdownMenuLabel>
                {stockAlerts.map((alert) => (
                  <DropdownMenuItem
                    key={alert.deliveryDateId}
                    className="flex flex-col items-start gap-0.5 py-2"
                    render={<Link href={`/admin/fechas/${alert.deliveryDateId}`} />}
                  >
                    <span className="text-sm font-medium">{alert.deliveryDateLabel}</span>
                    <span className="text-xs text-muted-foreground">{alert.outOfStockNames.join(", ")}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

      {/* ── Controles unificados en un único pill ── */}
      <div className="flex items-center divide-x divide-border overflow-hidden rounded-full border bg-background shadow-sm">

        {/* Tienda abierta/cerrada */}
        <div className="flex h-9 items-center gap-2 px-3">
          <span className={open ? "size-2 shrink-0 rounded-full bg-emerald-500" : "size-2 shrink-0 rounded-full bg-red-500"} />
          <span className="hidden text-xs font-medium sm:inline">
            {open ? "Tienda abierta" : "Tienda cerrada"}
          </span>
          <Switch
            id="store-open-toggle"
            size="sm"
            checked={open}
            onCheckedChange={toggle}
            disabled={pending}
          />
        </div>

        {/* Tema */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Cambiar a modo día" : "Cambiar a modo noche"}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        </button>

        {/* Ver tienda */}
        <Link
          href="/"
          className="flex h-9 items-center gap-1.5 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <StoreIcon className="size-3.5" />
          <span className="hidden sm:inline">Ver tienda</span>
        </Link>

        {/* Usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button className="flex h-9 items-center gap-2 px-3 transition-colors hover:bg-muted" />}
          >
            <Avatar size="sm">
              <AvatarFallback>{initials(session?.user?.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-32 truncate text-xs font-medium sm:inline">
              {session?.user?.name}
            </span>
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56 p-1.5" container={containerRef}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
                <span className="text-sm font-medium">{session?.user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{session?.user?.email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 py-1.5 text-sm text-muted-foreground"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <span className="size-1 shrink-0 rounded-full bg-current" />
              Salir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
      </div>
    </header>
  );
}
