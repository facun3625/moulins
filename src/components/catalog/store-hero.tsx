"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPinIcon, PhoneIcon } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { CartButton } from "@/components/cart-button";
import { useStoreSettings } from "@/lib/store-settings-context";
import { toWhatsAppLink, toInstagramLink } from "@/lib/social-links";
import { WhatsAppIcon, InstagramIcon } from "./social-icons";
import { StoreNav } from "./store-nav";
import { MobileHamburgerMenu } from "./mobile-hamburger-menu";

function LogoBadge({
  logoUrl,
  storeName,
  className,
  imageSize,
}: {
  logoUrl: string | null;
  storeName: string;
  className?: string;
  imageSize: number;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white/60 ${className}`}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={storeName}
          width={imageSize}
          height={imageSize}
          className="size-full object-contain"
        />
      ) : (
        <span className="font-bold text-foreground">{storeName.charAt(0)}</span>
      )}
    </div>
  );
}

export function StoreHero() {
  const { storeName, logoUrl, coverUrl, address, phone, whatsapp, instagram } =
    useStoreSettings();
  const hasContactInfo = Boolean(address || phone);
  const hasSocial = Boolean(whatsapp || instagram);

  return (
    <div className="relative flex h-48 shrink-0 flex-col overflow-hidden bg-foreground lg:h-72">
      {coverUrl ? (
        <>
          <Image src={coverUrl} alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/55" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-foreground" />
      )}

      {/* Desktop contact bar */}
      <div className="relative z-10 hidden items-center gap-6 px-8 lg:mx-auto lg:flex lg:h-40 lg:w-full lg:max-w-[1440px]">
        <Link href="/" className="flex min-w-0 items-center gap-4">
          <LogoBadge logoUrl={logoUrl} storeName={storeName} imageSize={80} className="size-20 text-2xl" />
          <span className="truncate text-2xl font-bold tracking-tight text-white">{storeName}</span>
        </Link>

        {hasContactInfo && (
          <div className="flex flex-col gap-1.5 border-l border-white/25 pl-6 text-sm font-medium text-white/90">
            {address && (
              <span className="flex items-center gap-2">
                <MapPinIcon className="size-4 shrink-0" />
                {address}
              </span>
            )}
            {phone && (
              <span className="flex items-center gap-2">
                <PhoneIcon className="size-4 shrink-0" />
                {phone}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-1 justify-center">
          <StoreNav variant="overlay" />
        </div>

        <div className="flex items-center gap-3">
          {hasSocial && (
            <div className="flex items-center gap-2.5 border-r border-white/25 pr-3">
              <span className="text-xs font-semibold text-white">Nuestros canales de contacto</span>
              {whatsapp && (
                <a
                  href={toWhatsAppLink(whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-8 items-center justify-center rounded-full bg-white text-primary transition-transform hover:scale-105"
                >
                  <WhatsAppIcon className="size-4" />
                </a>
              )}
              {instagram && (
                <a
                  href={toInstagramLink(instagram)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-8 items-center justify-center rounded-full bg-white text-primary transition-transform hover:scale-105"
                >
                  <InstagramIcon className="size-4" />
                </a>
              )}
            </div>
          )}
          <CartButton overlay />
          <AccountMenu overlay />
        </div>
      </div>

      {/* Mobile top navigation — el carrito acá no hace falta, queda el
          flotante fijo (FloatingCartButton) siempre visible en esa misma
          esquina. */}
      <div className="relative flex items-center justify-between px-5 pt-5 lg:hidden">
        <div className="flex items-center gap-2">
          {instagram && (
            <a
              href={toInstagramLink(instagram)}
              target="_blank"
              rel="noreferrer"
              className="flex size-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md ring-[1.5px] ring-white/40 transition-colors hover:bg-black/50"
            >
              <InstagramIcon className="size-5" />
            </a>
          )}
        </div>
      </div>

      {/* Mobile bottom logo + name */}
      <div className="relative mt-auto flex items-center justify-between gap-4 px-5 pb-12 lg:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <LogoBadge logoUrl={logoUrl} storeName={storeName} imageSize={64} className="size-16 text-2xl" />
          <span className="truncate text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            {storeName}
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <MobileHamburgerMenu />
          <AccountMenu overlay />
        </div>
      </div>
    </div>
  );
}
