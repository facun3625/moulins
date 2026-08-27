"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_ORDER_EMAIL_MESSAGE,
  ORDER_EMAIL_TOKENS,
  SAMPLE_ORDER_EMAIL_DATA,
  orderConfirmationEmail,
} from "@/lib/email-templates";
import { toWhatsAppLink, toInstagramLink } from "@/lib/social-links";
import type { StoreSettings } from "@/lib/settings";
import { sendTestOrderEmail, updateOrderEmailMessage } from "./actions";

export function EmailEditor({
  message,
  smtpConfigured,
  storeSettings,
}: {
  message: string | null;
  smtpConfigured: boolean;
  storeSettings: StoreSettings;
}) {
  const [value, setValue] = useState(message ?? "");
  const [pending, startTransition] = useTransition();
  const [testPending, startTestTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const previewHtml = useMemo(
    () =>
      orderConfirmationEmail({
        ...SAMPLE_ORDER_EMAIL_DATA,
        storeName: storeSettings.storeName,
        logoUrl: storeSettings.logoUrl,
        customMessage: value,
        orderUrl: "#",
        storeAddress: storeSettings.address,
        storePhone: storeSettings.phone,
        storeEmail: storeSettings.email,
        whatsappUrl: storeSettings.whatsapp ? toWhatsAppLink(storeSettings.whatsapp) : null,
        instagramUrl: storeSettings.instagram ? toInstagramLink(storeSettings.instagram) : null,
      }),
    [value, storeSettings],
  );

  function insertToken(token: string) {
    const el = textareaRef.current;
    if (!el) {
      setValue((v) => v + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function save() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("message", value.trim());
        await updateOrderEmailMessage(formData);
        toast.success("Mensaje guardado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  function restoreDefault() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("message", "");
        await updateOrderEmailMessage(formData);
        setValue("");
        toast.success("Mensaje restaurado al predeterminado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo restaurar");
      }
    });
  }

  function sendTest() {
    startTestTransition(async () => {
      try {
        await sendTestOrderEmail(value.trim());
        toast.success("Mail de prueba enviado — revisá tu casilla");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo enviar el mail de prueba");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Mensaje del pedido</h2>
          <p className="text-xs text-muted-foreground">
            Aparece entre el saludo y el detalle del pedido. Dejalo vacío para usar el mensaje
            predeterminado. Insertá campos dinámicos y se completan solos con el dato real de
            cada pedido.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ORDER_EMAIL_TOKENS.map((t) => (
            <button
              key={t.token}
              type="button"
              onClick={() => insertToken(t.token)}
              className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="order-email-message">Mensaje</Label>
          <Textarea
            ref={textareaRef}
            id="order-email-message"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={DEFAULT_ORDER_EMAIL_MESSAGE}
            rows={6}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
          {value.trim().length > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={restoreDefault}>
              Restaurar predeterminado
            </Button>
          )}
          {smtpConfigured ? (
            <Button type="button" size="sm" variant="outline" onClick={sendTest} disabled={testPending}>
              {testPending ? "Enviando..." : "Mandarme un mail de prueba"}
            </Button>
          ) : (
            <span className="self-center text-xs text-muted-foreground">
              Configurá el SMTP (pestaña SMTP) para poder mandar una prueba.
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-4 lg:sticky lg:top-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Vista previa en vivo</h2>
          <span className="text-xs text-muted-foreground">con datos de ejemplo</span>
        </div>
        <div className="overflow-hidden rounded-md border bg-white">
          <iframe
            srcDoc={previewHtml}
            title="Vista previa del mail"
            className="h-[600px] w-full"
          />
        </div>
      </div>
    </div>
  );
}
