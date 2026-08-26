"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart-context";
import { CartSheet } from "@/components/catalog/cart-sheet";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        {children}
        <CartSheet />
        <Toaster />
      </CartProvider>
    </SessionProvider>
  );
}
