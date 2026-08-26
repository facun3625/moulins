"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { MenuIcon, LogOutIcon, ShieldIcon, ReceiptIcon, SparklesIcon } from "lucide-react";

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
          <DropdownMenuItem render={<Link href="/admin" />} className="gap-2 py-2.5 text-[0.95rem]">
            <ShieldIcon className="size-4 text-muted-foreground" />
            Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuItem render={<Link href="/pedidos" />} className="gap-2 py-2.5 text-[0.95rem]">
          <ReceiptIcon className="size-4 text-muted-foreground" />
          Mis pedidos
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/puntos" />} className="gap-2 py-2.5 text-[0.95rem]">
          <SparklesIcon className="size-4 text-muted-foreground" />
          Mis puntos
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 py-2.5 text-[0.95rem] text-muted-foreground" onClick={() => signOut()}>
          <LogOutIcon className="size-4" />
          Salir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
