"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ImagePlusIcon, PlusIcon, StarIcon, Trash2Icon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createProduct } from "../actions";
import { CategorySelect } from "./category-select";
import { StockGroupPicker } from "../stock-group-picker";

type NewImage = { key: string; file: File; previewUrl: string };
type VariantRow = { key: string; gusto: string; tamano: string; price: string };

let keySeed = 0;
function nextKey() {
  keySeed += 1;
  return `k${keySeed}`;
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function NewProductForm({
  categories,
  stockGroups,
}: {
  categories: { id: string; name: string }[];
  stockGroups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<NewImage[]>([]);
  const [variantsMode, setVariantsMode] = useState(false);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [contactToBuy, setContactToBuy] = useState(false);
  const [pending, startTransition] = useTransition();

  function enableVariantsMode() {
    setVariantsMode(true);
    if (variantRows.length === 0) {
      setVariantRows([
        { key: nextKey(), gusto: "", tamano: "", price: "" },
        { key: nextKey(), gusto: "", tamano: "", price: "" },
      ]);
    }
  }

  function addVariantRow() {
    setVariantRows((prev) => [...prev, { key: nextKey(), gusto: "", tamano: "", price: "" }]);
  }

  function updateVariantRow(key: string, patch: Partial<VariantRow>) {
    setVariantRows((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }

  function removeVariantRow(key: string) {
    setVariantRows((prev) => {
      const next = prev.filter((v) => v.key !== key);
      if (next.length === 0) setVariantsMode(false);
      return next;
    });
  }

  const MAX_IMAGES = 5;

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      toast.error("Elegí archivos de imagen");
      return;
    }
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Máximo ${MAX_IMAGES} fotos`);
      return;
    }
    if (files.length > remaining) {
      toast.error(`Máximo ${MAX_IMAGES} fotos — se agregaron ${remaining}`);
    }
    const newImages: NewImage[] = files
      .slice(0, remaining)
      .map((file) => ({ key: nextKey(), file, previewUrl: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...newImages]);
  }

  function removeImage(img: NewImage) {
    URL.revokeObjectURL(img.previewUrl);
    setImages((prev) => prev.filter((x) => x.key !== img.key));
  }

  function markAsCover(key: string) {
    setImages((prev) => {
      const i = prev.findIndex((x) => x.key === key);
      return move(prev, i, 0);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);

    let variantsPayload: { gusto: string; tamano: string; price: string }[];
    if (variantsMode) {
      if (!contactToBuy) {
        for (const v of variantRows) {
          const price = Number(v.price);
          if (!price || price <= 0) {
            toast.error("Todas las variantes necesitan un precio mayor a 0");
            return;
          }
        }
      }
      variantsPayload = variantRows.map((v) => ({
        gusto: v.gusto.trim(),
        tamano: v.tamano.trim(),
        price: contactToBuy && !(Number(v.price) > 0) ? "1" : v.price,
      }));
    } else {
      const price = formData.get("price");
      if (!contactToBuy && (!price || Number(price) <= 0)) {
        toast.error("Ingresá un precio");
        return;
      }
      variantsPayload = [{ gusto: "", tamano: "", price: price && Number(price) > 0 ? String(price) : "1" }];
    }
    formData.set("variants", JSON.stringify(variantsPayload));
    formData.set("active", String(active));
    formData.set("featured", String(featured));
    formData.set("contactToBuy", String(contactToBuy));

    const imagesPayload = images.map((img, i) => ({ newKey: img.key, order: i }));
    formData.set("images", JSON.stringify(imagesPayload));
    for (const img of images) {
      formData.set(`newImageFile_${img.key}`, img.file);
    }

    startTransition(async () => {
      try {
        const { id } = await createProduct(formData);
        router.push(`/admin/productos/${id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo crear el producto");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required />
          </div>

          <CategorySelect categories={categories} />

          <StockGroupPicker groups={stockGroups} />

          {variantsMode ? (
            <div className="flex flex-col gap-2">
              <Label>Variantes</Label>
              <p className="text-xs text-muted-foreground">
                {contactToBuy
                  ? "Con \"Consultar por WhatsApp\" activado el precio no se muestra — solo importan los nombres."
                  : "Un precio por cada gusto o tamaño. Podés agregar más después desde el editor."}
              </p>
              <div className="flex flex-col gap-2">
                {variantRows.map((v) => (
                  <div key={v.key} className="flex items-center gap-2">
                    <Input
                      value={v.gusto}
                      onChange={(e) => updateVariantRow(v.key, { gusto: e.target.value })}
                      placeholder="Gusto (opcional)"
                      className="min-w-0 flex-1"
                    />
                    <Input
                      value={v.tamano}
                      onChange={(e) => updateVariantRow(v.key, { tamano: e.target.value })}
                      placeholder="Tamaño (opcional)"
                      className="min-w-0 flex-1"
                    />
                    {!contactToBuy && (
                      <Input
                        value={v.price}
                        onChange={(e) => updateVariantRow(v.key, { price: e.target.value })}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Precio"
                        className="w-24 shrink-0"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeVariantRow(v.key)}
                      className="shrink-0 rounded p-1.5 text-muted-foreground hover:text-destructive"
                      aria-label="Quitar variante"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addVariantRow} className="self-start">
                <PlusIcon className="size-4" />
                Agregar otra variante
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Precio</Label>
              {!contactToBuy && (
                <Input id="price" name="price" type="number" min="0.01" step="0.01" placeholder="0" />
              )}
              <p className="text-xs text-muted-foreground">
                {contactToBuy
                  ? "Con \"Consultar por WhatsApp\" activado el precio no se muestra."
                  : "Precio único para este producto. ¿Viene en varios gustos o tamaños, cada uno con su propio precio?"}
              </p>
              {!contactToBuy && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={enableVariantsMode}
                  className="self-start"
                >
                  <PlusIcon className="size-4" />
                  Agregar variantes
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Fotos</Label>
            <p className="text-xs text-muted-foreground">
              Sea simple o con variantes, el producto lleva foto (hasta {MAX_IMAGES}). Marcá cuál es
              la portada.
            </p>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={img.key} className="relative size-20 overflow-hidden rounded-md bg-muted">
                  <Image src={img.previewUrl} alt="" fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => markAsCover(img.key)}
                    disabled={i === 0}
                    aria-label={i === 0 ? "Portada" : "Marcar como portada"}
                    className={
                      i === 0
                        ? "absolute top-1 left-1 flex items-center justify-center rounded-full bg-primary p-0.5 text-primary-foreground"
                        : "absolute top-1 left-1 flex items-center justify-center rounded-full bg-black/50 p-0.5 text-white/70 hover:text-white"
                    }
                  >
                    <StarIcon className={i === 0 ? "size-3 fill-current" : "size-3"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(img)}
                    className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <XIcon className="size-2.5" />
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-foreground hover:text-foreground"
                >
                  <ImagePlusIcon className="size-4" />
                  <span className="text-[0.65rem]">Agregar</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t pt-4 sm:grid sm:grid-cols-3 sm:gap-6">
        <label className="flex items-center gap-2.5 text-sm">
          <Switch checked={active} onCheckedChange={setActive} />
          <div className="flex flex-col">
            <span className="font-medium">Visible en la tienda</span>
            <span className="text-xs text-muted-foreground">
              Si lo apagás, los clientes no lo ven aunque tenga stock.
            </span>
          </div>
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <Switch checked={featured} onCheckedChange={setFeatured} />
          <div className="flex flex-col">
            <span className="font-medium">Destacado</span>
            <span className="text-xs text-muted-foreground">Se muestra primero en el catálogo.</span>
          </div>
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <Switch checked={contactToBuy} onCheckedChange={setContactToBuy} />
          <div className="flex flex-col">
            <span className="font-medium">Consultar por WhatsApp</span>
            <span className="text-xs text-muted-foreground">
              Sin precio ni carrito — el cliente te escribe para cotizarlo (ideal para catering o
              encargos grandes).
            </span>
          </div>
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Creando..." : "Crear producto"}
        </Button>
        <Button type="button" variant="outline" render={<Link href="/admin/productos" />}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
