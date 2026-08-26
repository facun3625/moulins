"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLoginDialog } from "@/lib/login-dialog-context";

export function AccountMenu({ overlay = false }: { overlay?: boolean }) {
  const { data: session, status } = useSession();
  const { openLogin } = useLoginDialog();

  if (status === "loading") return null;

  if (status !== "authenticated") {
    return (
      <Button
        type="button"
        size="sm"
        variant={overlay ? "secondary" : "default"}
        className={overlay ? "border border-white/30 bg-white/15 text-white hover:bg-white/25" : undefined}
        onClick={openLogin}
      >
        Ingresar
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Menú"
            className={cn(
              overlay && "border-white/30 bg-white/15 text-white hover:bg-white/25",
            )}
          />
        }
      >
        <MenuIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 p-1.5">
        {session.user.role === "ADMIN" && (
          <DropdownMenuItem render={<Link href="/admin" />} className="gap-2 py-1.5 text-sm">
            <span className="size-1 shrink-0 rounded-full bg-current" />
            Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuItem render={<Link href="/pedidos" />} className="gap-2 py-1.5 text-sm">
          <span className="size-1 shrink-0 rounded-full bg-current" />
          Mis pedidos
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/puntos" />} className="gap-2 py-1.5 text-sm">
          <span className="size-1 shrink-0 rounded-full bg-current" />
          Mis puntos
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 py-1.5 text-sm text-muted-foreground"
          onClick={() => signOut()}
        >
          <span className="size-1 shrink-0 rounded-full bg-current" />
          Salir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
