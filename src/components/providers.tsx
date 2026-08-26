"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart-context";
import { CartSheet } from "@/components/catalog/cart-sheet";
import { LoginDialogProvider } from "@/lib/login-dialog-context";
import { LoginDialog } from "@/components/login-dialog";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LoginDialogProvider>
        <CartProvider>
          {children}
          <CartSheet />
          <LoginDialog />
          <Toaster />
        </CartProvider>
      </LoginDialogProvider>
    </SessionProvider>
  );
}
