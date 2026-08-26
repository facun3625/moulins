"use client";

import { Fragment } from "react";

import { useStoreSettings } from "@/lib/store-settings-context";
import { toWhatsAppLink, toInstagramLink } from "@/lib/social-links";
import { WhatsAppIcon, InstagramIcon } from "./social-icons";

export function StoreFooter() {
  const { storeName, address, phone, email, whatsapp, instagram } = useStoreSettings();
  const hasSocial = Boolean(whatsapp || instagram);

  const contactItems = [storeName, address, phone, email].filter(
    (item): item is string => Boolean(item),
  );

  return (
    <footer className="bg-foreground px-5 py-6 text-white lg:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-2 text-center text-sm">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-white/80">
          {contactItems.map((item, i) => (
            <Fragment key={item}>
              {i > 0 && <span className="text-white/30">|</span>}
              <span className={i === 0 ? "font-semibold text-white" : undefined}>{item}</span>
            </Fragment>
          ))}
          {hasSocial && (
            <>
              <span className="text-white/30">|</span>
              <div className="flex items-center gap-2">
                {whatsapp && (
                  <a
                    href={toWhatsAppLink(whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex size-6 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  >
                    <WhatsAppIcon className="size-3.5" />
                  </a>
                )}
                {instagram && (
                  <a
                    href={toInstagramLink(instagram)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex size-6 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  >
                    <InstagramIcon className="size-3.5" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-white/80">
          <span>¿Tenés un negocio? Armá tu propia tienda online como esta.</span>
          <a
            href="https://yaa.com.ar"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-white hover:opacity-80"
          >
            Conocé yaa.com.ar
          </a>
        </div>
      </div>
    </footer>
  );
}
