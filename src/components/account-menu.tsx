"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLoginDialog } from "@/lib/login-dialog-context";

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function AccountMenu({ overlay = false }: { overlay?: boolean }) {
  const { data: session, status } = useSession();
  const { openLogin } = useLoginDialog();

  if (status === "loading") return null;

  if (status !== "authenticated") {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Ingresar"
        className={cn(overlay && "border-white/30 bg-white/15 text-white hover:bg-white/25")}
        onClick={openLogin}
      >
        <UserIcon />
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
            aria-label={`Cuenta de ${session.user.name ?? session.user.email}`}
            className={cn(
              "rounded-full p-0",
              overlay && "border-white/30 bg-white/15 text-white hover:bg-white/25",
            )}
          />
        }
      >
        <Avatar className="size-full">
          {session.user.image && <AvatarImage src={session.user.image} alt="" />}
          <AvatarFallback className="bg-primary text-xs text-primary-foreground">
            {initials(session.user.name)}
          </AvatarFallback>
        </Avatar>
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
        <DropdownMenuItem render={<Link href="/perfil" />} className="gap-2 py-1.5 text-sm">
          <span className="size-1 shrink-0 rounded-full bg-current" />
          Mi perfil
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
