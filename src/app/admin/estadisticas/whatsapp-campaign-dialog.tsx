"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ExternalLinkIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { toWhatsAppMessageLink } from "@/lib/social-links";
import { cn } from "@/lib/utils";
import { logWhatsappSent } from "./actions";

const DEFAULT_MESSAGE = "¡Hola {{nombre}}! Hace un tiempo que no te vemos por acá — tenemos novedades que te van a gustar 😊";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

export function WhatsappCampaignDialog({
  open,
  onOpenChange,
  recipients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: { id: string; name: string | null; phone: string; lastWhatsappAt: string | null }[];
}) {
  const { containerRef } = useAdminTheme();
  const router = useRouter();
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [sentAt, setSentAt] = useState<Map<string, string>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertToken() {
    const el = textareaRef.current;
    const token = "{{nombre}}";
    if (!el) {
      setMessage((m) => m + token);
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = message.slice(0, start) + token + message.slice(end);
    setMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function personalize(name: string | null) {
    return message.replaceAll("{{nombre}}", name?.trim() || "");
  }

  function markSent(r: { id: string; phone: string; name: string | null }) {
    const now = new Date().toISOString();
    setSentAt((prev) => new Map(prev).set(r.id, now));
    logWhatsappSent({ userId: r.id, phone: r.phone, message: personalize(r.name) })
      .then(() => router.refresh())
      .catch(() => {});
  }

  function handleClose(next: boolean) {
    if (!next) setSentAt(new Map());
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent container={containerRef} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar WhatsApp a {recipients.length} {recipients.length === 1 ? "cliente" : "clientes"}</DialogTitle>
          <DialogDescription>
            Cada envío abre WhatsApp Web con el mensaje ya escrito — vos apretás enviar ahí, uno por uno. Queda
            registrado con la fecha apenas lo abrís.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="wa-message">Mensaje</Label>
            <button
              type="button"
              onClick={insertToken}
              className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Nombre del cliente
            </button>
          </div>
          <Textarea id="wa-message" ref={textareaRef} value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
        </div>

        <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
          {recipients.map((r) => {
            const justSentAt = sentAt.get(r.id);
            const lastSent = justSentAt ?? r.lastWhatsappAt;
            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
                  justSentAt && "border-primary/30 bg-primary/5",
                )}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{r.name || "Sin nombre"}</span>
                  <span className="text-xs text-muted-foreground">{r.phone}</span>
                  {lastSent && (
                    <span className="text-xs text-muted-foreground">
                      {justSentAt ? "Enviado" : "Último envío"}: {dateFormatter.format(new Date(lastSent))}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={justSentAt ? "outline" : "default"}
                  className="shrink-0"
                  render={
                    <a
                      href={toWhatsAppMessageLink(r.phone, personalize(r.name))}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => markSent(r)}
                    />
                  }
                >
                  {justSentAt ? (
                    <>
                      <CheckIcon className="size-3.5" />
                      Enviado
                    </>
                  ) : (
                    <>
                      Enviar
                      <ExternalLinkIcon className="size-3.5" />
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
