"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon, ImagePlusIcon, ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AboutEditor } from "@/app/admin/configuracion/about-editor";
import { saveService, uploadServiceTextImage } from "./actions";

type FieldType = "TEXT" | "TEXTAREA" | "EMAIL" | "PHONE" | "NUMBER" | "DATE" | "SELECT";
type Field = { key: string; label: string; type: FieldType; required: boolean; options: string };
type Picture = { key: string; id?: string; url: string; file?: File };
const TYPES: [FieldType, string][] = [["TEXT","Texto corto"],["TEXTAREA","Texto largo"],["EMAIL","Email"],["PHONE","Teléfono"],["NUMBER","Número"],["DATE","Fecha"],["SELECT","Lista de opciones"]];
const key = () => crypto.randomUUID();
const move = <T,>(items: T[], index: number, delta: number) => { const next = [...items]; const target = index + delta; if (target < 0 || target >= next.length) return items; [next[index], next[target]] = [next[target], next[index]]; return next; };
async function uploadTextImage(file: File) { const data = new FormData(); data.set("file", file); return uploadServiceTextImage(data); }
const MAX_GALLERY_IMAGES = 20;
const MAX_IMAGE_SIDE = 1600;

async function optimizeImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("No se pudo procesar la imagen"); }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("No se pudo comprimir la imagen")), "image/webp", 0.8));
  const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen";
  return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
}

export function ServiceEditor({ service }: { service?: { id: string; title: string; description: string; descriptionColumns: boolean; formTitle: string; submitLabel: string; active: boolean; fields: { label: string; type: FieldType; required: boolean; options: string[] }[]; images: { id: string; url: string }[] } }) {
  const router = useRouter(); const ref = useRef<HTMLFormElement>(null); const [pending, start] = useTransition();
  const [active, setActive] = useState(service?.active ?? true);
  const [description, setDescription] = useState(service?.description ?? "");
  const [descriptionColumns, setDescriptionColumns] = useState(service?.descriptionColumns ?? false);
  const [fields, setFields] = useState<Field[]>(service?.fields.map(f => ({ ...f, key: key(), options: f.options.join(", ") })) ?? [{ key: key(), label: "Nombre y apellido", type: "TEXT", required: true, options: "" }, { key: key(), label: "Teléfono", type: "PHONE", required: true, options: "" }]);
  const [pictures, setPictures] = useState<Picture[]>(service?.images.map(i => ({ ...i, key: key() })) ?? []);
  const [optimizing, setOptimizing] = useState(false);
  async function addPictures(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList).filter(file => file.type.startsWith("image/")).slice(0, MAX_GALLERY_IMAGES - pictures.length);
    if (!files.length) return;
    setOptimizing(true);
    try {
      const optimized = await Promise.all(files.map(optimizeImage));
      setPictures(current => [...current, ...optimized.map(file => ({ key: key(), file, url: URL.createObjectURL(file) }))]);
      const originalBytes = files.reduce((sum, file) => sum + file.size, 0);
      const optimizedBytes = optimized.reduce((sum, file) => sum + file.size, 0);
      if (optimizedBytes < originalBytes) toast.success(`Imágenes optimizadas: ${Math.round(originalBytes / 1024 / 1024)} MB → ${Math.round(optimizedBytes / 1024 / 1024)} MB`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron optimizar las imágenes");
    } finally { setOptimizing(false); }
  }
  function submit(e: React.FormEvent) { e.preventDefault(); const uploadBytes = pictures.reduce((total, picture) => total + (picture.file?.size ?? 0), 0); if (uploadBytes > 19 * 1024 * 1024) { toast.error("Las imágenes nuevas superan los 19 MB en total. Quitá alguna o elegí archivos más livianos."); return; } const data = new FormData(ref.current!); data.set("active", String(active)); data.set("description", description); data.set("descriptionColumns", String(descriptionColumns)); data.set("fields", JSON.stringify(fields.map(({label,type,required,options}) => ({ label, type, required, options: options.split(",").map(x => x.trim()).filter(Boolean) })))); data.set("existingImages", JSON.stringify(pictures.flatMap((p, order) => p.id ? [{ id: p.id, order }] : []))); data.set("newImages", JSON.stringify(pictures.flatMap((p, order) => p.file ? [{ key: p.key, order }] : []))); pictures.forEach(p => { if (p.file) data.set(`image_${p.key}`, p.file); }); start(async () => { try { await saveService(service?.id ?? null, data); toast.success("Servicio guardado"); router.push("/admin/servicios"); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar"); } }); }
  return <form ref={ref} onSubmit={submit} className="flex max-w-4xl flex-col gap-6">
    <section className="grid gap-4 rounded-xl border p-4 md:grid-cols-2">
      <div className="flex flex-col gap-2"><Label htmlFor="title">Título del servicio</Label><Input id="title" name="title" defaultValue={service?.title} required /></div>
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3"><div><p className="text-sm font-medium">Publicado</p><p className="text-xs text-muted-foreground">Visible para los clientes</p></div><Switch checked={active} onCheckedChange={setActive} /></div>
      <div className="flex flex-col gap-2 md:col-span-2"><Label>Texto explicativo</Label><AboutEditor html={description} columns={descriptionColumns} onChangeHtml={setDescription} onChangeColumns={setDescriptionColumns} onUploadImage={uploadTextImage} /></div>
    </section>
    <section className="flex flex-col gap-4 rounded-xl border p-4">
      <h2 className="font-semibold">Formulario de consulta</h2>
      <div className="grid gap-4 md:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="formTitle">Título del formulario</Label><Input id="formTitle" name="formTitle" defaultValue={service?.formTitle ?? "Solicitá tu presupuesto"} required /></div><div className="flex flex-col gap-2"><Label htmlFor="submitLabel">Texto del botón</Label><Input id="submitLabel" name="submitLabel" defaultValue={service?.submitLabel ?? "Enviar consulta"} required /></div></div>
      {fields.map((field, index) => <div key={field.key} className="grid items-center gap-2 rounded-lg bg-muted/40 p-3 md:grid-cols-[1fr_180px_auto_auto]">
        <Input aria-label="Nombre del campo" placeholder="Nombre del campo" value={field.label} onChange={e => setFields(v => v.map(x => x.key === field.key ? {...x,label:e.target.value}:x))} required />
        <Select value={field.type} onValueChange={value => value && setFields(v => v.map(x => x.key === field.key ? {...x,type:value as FieldType}:x))} items={TYPES.map(([value,label]) => ({ value, label }))}><SelectTrigger size="sm" className="w-full rounded-lg bg-background px-3 text-xs"><SelectValue /></SelectTrigger><SelectContent align="start" alignItemWithTrigger={false} sideOffset={4} className="min-w-40 p-1">{TYPES.map(([value,label]) => <SelectItem key={value} value={value} className="rounded-md py-1.5 pr-7 pl-2 text-xs">{label}</SelectItem>)}</SelectContent></Select>
        <label className="flex items-center gap-2 text-sm"><Switch checked={field.required} onCheckedChange={required => setFields(v => v.map(x => x.key === field.key ? {...x,required}:x))} />Obligatorio</label>
        <div className="flex"><Button type="button" size="icon-sm" variant="ghost" onClick={() => setFields(v => move(v,index,-1))}><ArrowLeftIcon className="size-4 rotate-90" /></Button><Button type="button" size="icon-sm" variant="ghost" onClick={() => setFields(v => move(v,index,1))}><ArrowRightIcon className="size-4 rotate-90" /></Button><Button type="button" size="icon-sm" variant="ghost" onClick={() => setFields(v => v.filter(x => x.key !== field.key))}><Trash2Icon className="size-4" /></Button></div>
        {field.type === "SELECT" && <div className="flex flex-col gap-1.5 md:col-span-4"><Input placeholder="Ejemplo: 20 personas, 50 personas, 100 personas" value={field.options} onChange={e => setFields(v => v.map(x => x.key === field.key ? {...x,options:e.target.value}:x))} /><p className="text-xs text-muted-foreground">Separá cada opción con una coma.</p></div>}
      </div>)}
      <Button type="button" variant="outline" className="self-start" onClick={() => setFields(v => [...v,{key:key(),label:"",type:"TEXT",required:false,options:""}])}><PlusIcon className="size-4" />Agregar campo</Button>
    </section>
    <section className="flex flex-col gap-4 rounded-xl border p-4"><div><h2 className="font-semibold">Carrusel de imágenes</h2><p className="text-xs text-muted-foreground">Hasta 20 imágenes. Se reducen y comprimen automáticamente; la primera será la portada.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{pictures.map((p,index) => <div key={p.key} className="relative aspect-square overflow-hidden rounded-lg bg-muted"><Image src={p.url} alt="" fill className="object-cover" unoptimized={p.url.startsWith("blob:")} /><div className="absolute inset-x-1 bottom-1 flex justify-center rounded bg-black/55"><button type="button" className="p-1 text-white" onClick={() => setPictures(v => move(v,index,-1))}>←</button><button type="button" className="p-1 text-white" onClick={() => setPictures(v => v.filter(x => x.key !== p.key))}><Trash2Icon className="size-4" /></button><button type="button" className="p-1 text-white" onClick={() => setPictures(v => move(v,index,1))}>→</button></div></div>)}</div>{pictures.length < MAX_GALLERY_IMAGES && <label className="flex cursor-pointer items-center gap-2 self-start rounded-md border px-3 py-2 text-sm"><ImagePlusIcon className="size-4" />{optimizing ? "Optimizando…" : "Agregar imágenes"}<input disabled={optimizing} hidden multiple type="file" accept="image/*" onChange={async e => { await addPictures(e.target.files); e.target.value=""; }} /></label>}</section>
    <Button type="submit" disabled={pending || optimizing} className="self-start">{optimizing ? "Optimizando imágenes…" : pending ? "Guardando…" : "Guardar servicio"}</Button>
  </form>;
}
