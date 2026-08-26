"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StoreSettings } from "@/lib/settings";
import { removeStoreImage, updateStoreSettings } from "./actions";

export function StoreSettingsForm({ settings }: { settings: StoreSettings }) {
  const [pending, startTransition] = useTransition();
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl);
  const [coverPreview, setCoverPreview] = useState<string | null>(settings.coverUrl);

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          try {
            await updateStoreSettings(formData);
            toast.success("Configuración guardada");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error al guardar");
          }
        })
      }
      className="flex flex-col gap-5 rounded-lg border p-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="storeName">Nombre del negocio</Label>
        <Input id="storeName" name="storeName" defaultValue={settings.storeName} required />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" name="address" defaultValue={settings.address ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" defaultValue={settings.phone ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email de contacto</Label>
          <Input id="email" name="email" type="email" defaultValue={settings.email ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            placeholder="Número o link de wa.me"
            defaultValue={settings.whatsapp ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            name="instagram"
            placeholder="@usuario o link"
            defaultValue={settings.instagram ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="addToCartLabel">Texto del botón &quot;Agregar&quot;</Label>
          <Input
            id="addToCartLabel"
            name="addToCartLabel"
            placeholder="Agregar"
            defaultValue={settings.addToCartLabel}
          />
        </div>
      </div>

      <ImageField
        label="Logo"
        name="logo"
        shape="circle"
        preview={logoPreview}
        onPreviewChange={setLogoPreview}
        onRemove={
          settings.logoUrl
            ? async () => {
                await removeStoreImage("store_logo_url");
                setLogoPreview(null);
                toast.success("Logo eliminado");
              }
            : undefined
        }
      />

      <ImageField
        label="Foto de portada"
        name="cover"
        shape="wide"
        preview={coverPreview}
        onPreviewChange={setCoverPreview}
        onRemove={
          settings.coverUrl
            ? async () => {
                await removeStoreImage("store_cover_url");
                setCoverPreview(null);
                toast.success("Portada eliminada");
              }
            : undefined
        }
      />

      <Button type="submit" disabled={pending}>
        Guardar cambios
      </Button>
    </form>
  );
}

function ImageField({
  label,
  name,
  shape,
  preview,
  onPreviewChange,
  onRemove,
}: {
  label: string;
  name: string;
  shape: "circle" | "wide";
  preview: string | null;
  onPreviewChange: (url: string) => void;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [removePending, startRemoveTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onPreviewChange(URL.createObjectURL(file));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className={shape === "circle" ? "flex items-center gap-3" : "flex flex-col gap-2"}>
        <div
          className={
            shape === "circle"
              ? "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted"
              : "flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-xl bg-muted"
          }
        >
          {preview && (
            <Image
              src={preview}
              alt={label}
              width={shape === "circle" ? 64 : 400}
              height={shape === "circle" ? 64 : 175}
              className={shape === "circle" ? "size-full object-contain p-1.5" : "size-full object-cover"}
            />
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {preview ? "Cambiar" : "Subir"}
          </Button>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={removePending}
              onClick={() => startRemoveTransition(onRemove)}
            >
              Quitar
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
