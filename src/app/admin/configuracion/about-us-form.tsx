"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { PlayIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/admin/confirm-provider";
import type { AboutContent } from "@/lib/about";
import { addAboutMedia, deleteAboutMedia, updateAboutText } from "./actions";
import { AboutEditor } from "./about-editor";

export function AboutUsForm({ content }: { content: AboutContent }) {
  const router = useRouter();
  const [html, setHtml] = useState(content.text ?? "");
  const [columns, setColumns] = useState(content.columns);
  const [textPending, startTextTransition] = useTransition();
  const [uploadPending, startUploadTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  function saveText() {
    startTextTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("text", html);
        formData.set("columns", String(columns));
        await updateAboutText(formData);
        toast.success("Guardado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  function handleFile(file: File | null) {
    if (!file) return;
    startUploadTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("file", file);
        await addAboutMedia(formData);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir");
      }
    });
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Borrar",
      description: "¿Borrar este archivo de la sección Sobre nosotros?",
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteAboutMedia(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo borrar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border p-4">
      <div className="flex flex-col gap-2">
        <Label>Contanos sobre tu negocio</Label>
        <AboutEditor html={html} columns={columns} onChangeHtml={setHtml} onChangeColumns={setColumns} />
        <Button type="button" size="sm" onClick={saveText} disabled={textPending} className="self-start">
          {textPending ? "Guardando..." : "Guardar texto"}
        </Button>
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <Label>Fotos y videos</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {content.media.map((m) => (
            <div key={m.id} className="relative aspect-square overflow-hidden rounded-md bg-muted">
              {m.type === "IMAGE" ? (
                <Image src={m.url} alt="" fill className="object-cover" />
              ) : (
                <>
                  <video src={m.url} className="size-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <PlayIcon className="size-6 fill-white text-white" />
                  </div>
                </>
              )}
              <button
                type="button"
                disabled={deletingId === m.id}
                onClick={() => handleDelete(m.id)}
                className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))}

          <button
            type="button"
            disabled={uploadPending}
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-60"
          >
            <span className="text-xs">{uploadPending ? "Subiendo…" : "+ Agregar"}</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
