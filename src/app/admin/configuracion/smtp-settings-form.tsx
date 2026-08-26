"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/admin/confirm-provider";
import type { SmtpSettings } from "@/lib/settings";
import { removeSmtpSettings, sendTestSmtpEmail, updateSmtpSettings } from "./actions";

export function SmtpSettingsForm({ settings }: { settings: SmtpSettings }) {
  const [host, setHost] = useState(settings.host ?? "");
  const [port, setPort] = useState(String(settings.port ?? 587));
  const [user, setUser] = useState(settings.user ?? "");
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState(settings.from ?? "");
  const [secure, setSecure] = useState(settings.secure);
  const [pending, startTransition] = useTransition();
  const [testPending, startTestTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();
  const confirm = useConfirm();

  function save() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("host", host.trim());
        formData.set("port", port);
        formData.set("user", user.trim());
        formData.set("pass", pass);
        formData.set("from", from.trim());
        formData.set("secure", String(secure));
        await updateSmtpSettings(formData);
        setPass("");
        toast.success("SMTP guardado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  function sendTest() {
    startTestTransition(async () => {
      try {
        await sendTestSmtpEmail();
        toast.success("Mail de prueba enviado — revisá tu casilla");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo enviar el mail de prueba");
      }
    });
  }

  async function remove() {
    const ok = await confirm({
      title: "Quitar configuración SMTP",
      description: "La tienda deja de mandar el mail de confirmación de pedido hasta que la vuelvas a cargar.",
      confirmLabel: "Quitar",
      destructive: true,
    });
    if (!ok) return;
    startRemoveTransition(async () => {
      try {
        await removeSmtpSettings();
        setHost("");
        setPort("587");
        setUser("");
        setPass("");
        setFrom("");
        setSecure(false);
        toast.success("Configuración SMTP eliminada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo quitar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">
        Usado para el mail de confirmación que recibe el cliente al hacer un pedido. Sin esto
        configurado, la tienda sigue funcionando normal, solo que no manda ese mail.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="smtp-host">Host</Label>
          <Input
            id="smtp-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.gmail.com"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="smtp-port">Puerto</Label>
          <Input
            id="smtp-port"
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="587"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="smtp-user">Usuario</Label>
          <Input
            id="smtp-user"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="tucuenta@gmail.com"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="smtp-pass">Contraseña</Label>
          <Input
            id="smtp-pass"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder={settings.configured ? "•••••••• (guardada — dejalo vacío para no cambiarla)" : ""}
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="smtp-from">Remitente (opcional)</Label>
          <Input
            id="smtp-from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder={`Mi Tienda <${user || "tucuenta@gmail.com"}>`}
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <Switch checked={secure} onCheckedChange={setSecure} />
        <div className="flex flex-col">
          <span className="font-medium">Conexión TLS directa (puerto 465)</span>
          <span className="text-xs text-muted-foreground">
            La mayoría de los proveedores usa STARTTLS en el 587 — dejalo apagado salvo que tu
            proveedor pida específicamente el puerto 465.
          </span>
        </div>
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
        {settings.configured && (
          <>
            <Button type="button" size="sm" variant="outline" onClick={sendTest} disabled={testPending}>
              {testPending ? "Enviando..." : "Mandarme un mail de prueba"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={remove}
              disabled={removePending}
              className="text-destructive hover:text-destructive"
            >
              Quitar configuración
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
