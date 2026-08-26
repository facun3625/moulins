"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { AccountMenu } from "@/components/account-menu";
import { CartButton } from "@/components/cart-button";
import { useStoreSettings } from "@/lib/store-settings-context";

export function SiteHeader() {
  const { storeName, logoUrl } = useStoreSettings();
  const pathname = usePathname();
  const showCart = !pathname.startsWith("/admin") && pathname !== "/carrito";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-2.5 backdrop-blur">
      <Link href="/" className="flex min-w-0 items-center gap-2 py-2">
        {logoUrl && (
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            <Image
              src={logoUrl}
              alt={storeName}
              width={32}
              height={32}
              className="size-full object-contain p-0.5"
            />
          </span>
        )}
        <span className="truncate text-lg font-semibold">{storeName}</span>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        {showCart && <CartButton />}
        <AccountMenu />
      </div>
    </header>
  );
}
