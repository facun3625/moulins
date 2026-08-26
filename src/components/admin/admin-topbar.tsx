"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { MenuIcon, LogOutIcon, StoreIcon, ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { setStoreOpen } from "@/app/admin/actions";

function StoreOpenToggle({ storeOpen }: { storeOpen: boolean }) {
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
    <div className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-1">
      <span
        className={
          open
            ? "size-2 shrink-0 rounded-full bg-emerald-500"
            : "size-2 shrink-0 rounded-full bg-destructive"
        }
      />
      <Label htmlFor="store-open-toggle" className="hidden text-xs font-medium sm:inline">
        {open ? "Tienda abierta" : "Tienda cerrada"}
      </Label>
      <Switch id="store-open-toggle" size="sm" checked={open} onCheckedChange={toggle} disabled={pending} />
    </div>
  );
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function AdminTopbar({ storeOpen }: { storeOpen: boolean }) {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { containerRef } = useAdminTheme();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur print:hidden lg:px-8">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 gap-0 p-0"
          showCloseButton={false}
          container={containerRef}
        >
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
        <StoreOpenToggle storeOpen={storeOpen} />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1.5 transition-colors hover:bg-muted" />
            }
          >
            <Avatar size="sm">
              <AvatarFallback>{initials(session?.user?.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
              {session?.user?.name}
            </span>
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56 p-1.5" container={containerRef}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
                <span className="text-sm font-medium">{session?.user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{session?.user?.email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/" />} className="gap-2 py-2.5 text-[0.95rem]">
              <StoreIcon className="size-4" />
              Ver tienda
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="gap-2 py-2.5 text-[0.95rem]"
              onClick={() => signOut()}
            >
              <LogOutIcon className="size-4" />
              Salir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
