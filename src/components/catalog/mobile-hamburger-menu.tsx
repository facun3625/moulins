"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MapPinIcon, PhoneIcon, MailIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useStoreSettings } from "@/lib/store-settings-context";
import { toWhatsAppLink, toInstagramLink } from "@/lib/social-links";
import { WhatsAppIcon, InstagramIcon } from "./social-icons";

export function MobileHamburgerMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { address, phone, email, whatsapp, instagram, hasServices } = useStoreSettings();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <button className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25">
          <Menu className="size-5" />
          <span className="sr-only">Abrir menú</span>
        </button>
      } />
      <SheetContent side="left" className="w-[300px] bg-foreground text-white border-white/10 sm:w-[350px]">
        <SheetHeader className="text-left mb-2 px-6 pt-6 pb-2">
          <SheetTitle className="text-white text-base">Menú</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-6 pb-6">
          <nav className="flex flex-col gap-2">
            <Link 
              href="/" 
              onClick={() => setOpen(false)} 
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                pathname === "/" ? "bg-primary text-primary-foreground" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              Tienda
            </Link>
            {hasServices && (
              <Link
                href="/servicios"
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  pathname.startsWith("/servicios") ? "bg-primary text-primary-foreground" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                Servicios
              </Link>
            )}
            <Link 
              href="/sobre-nosotros" 
              onClick={() => setOpen(false)} 
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                pathname === "/sobre-nosotros" ? "bg-primary text-primary-foreground" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              Sobre nosotros
            </Link>
          </nav>
          
          <div className="flex flex-col gap-3 border-t border-white/20 pt-5">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Contacto</h3>
            <div className="flex flex-col gap-2 text-sm text-white/80">
              {address && (
                <div className="flex items-start gap-3">
                  <MapPinIcon className="size-5 shrink-0 text-white/50" />
                  <span>{address}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-3">
                  <PhoneIcon className="size-5 shrink-0 text-white/50" />
                  <span>{phone}</span>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-3">
                  <MailIcon className="size-5 shrink-0 text-white/50" />
                  <span>{email}</span>
                </div>
              )}
            </div>
            
            {(whatsapp || instagram) && (
              <div className="flex items-center gap-3 mt-2">
                {whatsapp && (
                  <a
                    href={toWhatsAppLink(whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex size-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  >
                    <WhatsAppIcon className="size-5" />
                  </a>
                )}
                {instagram && (
                  <a
                    href={toInstagramLink(instagram)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex size-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  >
                    <InstagramIcon className="size-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
