"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RichText } from "./rich-text";
import type { PopupFrequency } from "@/lib/popup";

// Mostrar/ocultar según la frecuencia elegida en el admin: "siempre" no
// guarda nada (aparece en cada carga), "sesión"/"una vez" marcan que ya
// se vio en session/localStorage — la clave incluye la versión, así una
// edición del texto vuelve a mostrarlo aunque ya lo hayan cerrado antes.
export function WelcomePopup({
  html,
  frequency,
  version,
}: {
  html: string;
  frequency: PopupFrequency;
  version: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (frequency === "ALWAYS") {
        setOpen(true);
        return;
      }
      const storage = frequency === "SESSION" ? window.sessionStorage : window.localStorage;
      const key = `popup-seen-${version}`;
      try {
        if (!storage.getItem(key)) setOpen(true);
      } catch {
        setOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [frequency, version]);

  function handleClose() {
    setOpen(false);
    if (frequency === "ALWAYS") return;
    const storage = frequency === "SESSION" ? window.sessionStorage : window.localStorage;
    try {
      storage.setItem(`popup-seen-${version}`, "1");
    } catch {
      // localStorage/sessionStorage no disponible (modo privado, etc.) — no pasa nada.
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm gap-0 overflow-hidden rounded-3xl border-none p-0 shadow-2xl sm:max-w-md"
      >
        <DialogTitle className="sr-only">Anuncio</DialogTitle>
        <div className="h-1.5 w-full bg-primary" />
        <div className="flex flex-col items-center gap-5 px-6 py-9 text-center sm:px-9">
          <RichText html={html} className="text-sm leading-relaxed text-foreground sm:text-base" />
          <Button type="button" size="lg" onClick={handleClose} className="w-full rounded-full">
            Entendido
          </Button>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-background hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
