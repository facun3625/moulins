"use client";

import { usePathname } from "next/navigation";
import { useStoreSettings } from "@/lib/store-settings-context";
import { toWhatsAppLink } from "@/lib/social-links";
import { WhatsAppIcon } from "@/components/catalog/social-icons";

export function WhatsAppWidget() {
  const pathname = usePathname();
  const { whatsapp } = useStoreSettings();

  // Ocultar en rutas del panel de administración o si no hay número configurado
  if (!whatsapp || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <a
      href={toWhatsAppLink(whatsapp)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-[99] flex size-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95 sm:bottom-6 sm:right-6 sm:size-14"
      aria-label="Contactar por WhatsApp"
    >
      <WhatsAppIcon className="size-6 sm:size-7" />
    </a>
  );
}
