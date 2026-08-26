"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  ImagePlusIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { useConfirm } from "@/components/admin/confirm-provider";
import { deleteProduct, duplicateProduct, saveProduct } from "../actions";
import { StockGroupPicker, type StockGroupSelection } from "../stock-group-picker";

const TAG_SUGGESTIONS = [
  "Nuevo",
  "Más vendido",
  "Vegano",
  "Sin TACC",
  "Sin gluten",
  "Picante",
  "Edición limitada",
];

type Variant = {
  key: string;
  id?: string;
  gusto: string;
  tamano: string;
  sku: string;
  price: string;
  active: boolean;
};

type EditorImage =
  | { key: string; kind: "existing"; id: string; url: string }
  | { key: string; kind: "new"; file: File; previewUrl: string };

type Product = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  stockGroupId: string;
  active: boolean;
  featured: boolean;
  contactToBuy: boolean;
  tags: string[];
  variants: {
    id: string;
    gusto: string | null;
    tamano: string | null;
    sku: string | null;
    price: string;
    active: boolean;
  }[];
  images: { id: string; url: string }[];
};

let keySeed = 0;
function nextKey() {
  keySeed += 1;
  return `k${keySeed}`;
}

function variantsFromProduct(product: Product): Variant[] {
  return product.variants.map((v) => ({
    key: nextKey(),
    id: v.id,
    gusto: v.gusto ?? "",
    tamano: v.tamano ?? "",
    sku: v.sku ?? "",
    price: v.price,
    active: v.active,
  }));
}

function imagesFromProduct(product: Product): EditorImage[] {
  return product.images.map((img) => ({ key: nextKey(), kind: "existing", id: img.id, url: img.url }));
}

function variantSnapshot(v: Variant) {
  return {
    id: v.id,
    gusto: v.gusto,
    tamano: v.tamano,
    sku: v.sku,
    price: v.price,
    active: v.active,
  };
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function ProductEditor({
  product,
  categories,
  stockGroups,
}: {
  product: Product;
  categories: { id: string; name: string }[];
  stockGroups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { containerRef } = useAdminTheme();
  const [pending, startTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [duplicatePending, startDuplicateTransition] = useTransition();
  const confirm = useConfirm();

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [stockGroupSelection, setStockGroupSelection] = useState<StockGroupSelection>({
    stockGroupId: product.stockGroupId,
    newStockGroupName: "",
  });
  const [active, setActive] = useState(product.active);
  const [featured, setFeatured] = useState(product.featured);
  const [contactToBuy, setContactToBuy] = useState(product.contactToBuy);
  const [tags, setTags] = useState<string[]>(product.tags);
  const [tagInput, setTagInput] = useState("");

  const [variants, setVariants] = useState<Variant[]>(() => variantsFromProduct(product));
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  const [images, setImages] = useState<EditorImage[]>(() => imagesFromProduct(product));
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stockGroupResetKey, setStockGroupResetKey] = useState(0);

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: product.name,
        description: product.description ?? "",
        categoryId: product.categoryId,
        stockGroupId: product.stockGroupId,
        newStockGroupName: "",
        active: product.active,
        featured: product.featured,
        contactToBuy: product.contactToBuy,
        tags: product.tags,
        variants: variantsFromProduct(product).map(variantSnapshot),
        images: product.images.map((i) => i.id),
      }),
    [product],
  );

  const currentSnapshot = JSON.stringify({
    name,
    description,
    categoryId,
    stockGroupId: stockGroupSelection.stockGroupId,
    newStockGroupName: stockGroupSelection.newStockGroupName,
    active,
    featured,
    contactToBuy,
    tags,
    variants: variants.map(variantSnapshot),
    images: images.map((i) => (i.kind === "existing" ? i.id : i.key)),
  });

  const dirty = initialSnapshot !== currentSnapshot;

  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    return () => {
      for (const img of images) {
        if (img.kind === "new") URL.revokeObjectURL(img.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    if (!name.trim()) {
      toast.error("Ingresá un nombre para el producto");
      return;
    }
    if (!categoryId) {
      toast.error("Elegí una categoría");
      return;
    }
    // Con "consultar por WhatsApp" el precio no se le muestra a nadie —
    // no tiene sentido pedirle al admin que cargue uno igual.
    if (!contactToBuy) {
      for (const v of variants) {
        const price = Number(v.price);
        if (!price || price <= 0) {
          toast.error("Todas las variantes necesitan un precio mayor a 0");
          setExpandedVariant(v.key);
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", name.trim());
        formData.set("description", description.trim());
        formData.set("categoryId", categoryId);
        formData.set("stockGroupId", stockGroupSelection.stockGroupId);
        formData.set("newStockGroupName", stockGroupSelection.newStockGroupName);
        formData.set("active", String(active));
        formData.set("featured", String(featured));
        formData.set("contactToBuy", String(contactToBuy));
        formData.set("tags", JSON.stringify(tags));
        formData.set(
          "variants",
          JSON.stringify(
            variants.map((v, i) => ({
              id: v.id,
              gusto: v.gusto.trim(),
              tamano: v.tamano.trim(),
              sku: v.sku.trim(),
              price: contactToBuy && !(Number(v.price) > 0) ? "1" : v.price,
              active: v.active,
              order: i,
            })),
          ),
        );
        formData.set("deletedVariantIds", JSON.stringify(deletedVariantIds));

        const imagesPayload = images.map((img, i) =>
          img.kind === "existing"
            ? { id: img.id, order: i }
            : { newKey: img.key, order: i },
        );
        formData.set("images", JSON.stringify(imagesPayload));
        formData.set("deletedImageIds", JSON.stringify(deletedImageIds));

        for (const img of images) {
          if (img.kind === "new") formData.set(`newImageFile_${img.key}`, img.file);
        }

        await saveProduct(product.id, formData);
        toast.success("Producto guardado");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar el producto");
      }
    });
  }

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !pending) handleSave();
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, pending, name, description, categoryId, stockGroupSelection, active, featured, contactToBuy, tags, variants, images, deletedVariantIds, deletedImageIds]);

  function discard() {
    setName(product.name);
    setDescription(product.description ?? "");
    setCategoryId(product.categoryId);
    setStockGroupSelection({ stockGroupId: product.stockGroupId, newStockGroupName: "" });
    setStockGroupResetKey((k) => k + 1);
    setActive(product.active);
    setFeatured(product.featured);
    setContactToBuy(product.contactToBuy);
    setTags(product.tags);
    setVariants(variantsFromProduct(product));
    setDeletedVariantIds([]);
    setImages(imagesFromProduct(product));
    setDeletedImageIds([]);
    toast("Cambios descartados");
  }

  function addTag(raw: string) {
    const t = raw.trim();
    if (!t || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
  }

  function addVariant() {
    const key = nextKey();
    setVariants((prev) => [
      ...prev,
      { key, gusto: "", tamano: "", sku: "", price: "", active: true },
    ]);
    setExpandedVariant(key);
  }

  function removeVariant(v: Variant) {
    if (v.id) setDeletedVariantIds((prev) => [...prev, v.id!]);
    setVariants((prev) => prev.filter((x) => x.key !== v.key));
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const newImages: EditorImage[] = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ key: nextKey(), kind: "new" as const, file, previewUrl: URL.createObjectURL(file) }));
    if (newImages.length === 0) {
      toast.error("Elegí archivos de imagen");
      return;
    }
    setImages((prev) => [...prev, ...newImages]);
  }

  function removeImage(img: EditorImage) {
    if (img.kind === "existing") setDeletedImageIds((prev) => [...prev, img.id]);
    else URL.revokeObjectURL(img.previewUrl);
    setImages((prev) => prev.filter((x) => x.key !== img.key));
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            render={<Link href="/admin/productos" aria-label="Volver a productos" />}
          >
            <ArrowLeftIcon />
          </Button>
          <h1 className="text-xl font-semibold">{product.name}</h1>
          {!active && <Badge variant="secondary">Oculto</Badge>}
          {featured && <Badge>Destacado</Badge>}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={duplicatePending}
            onClick={() =>
              startDuplicateTransition(async () => {
                try {
                  await duplicateProduct(product.id);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo duplicar");
                }
              })
            }
          >
            <CopyIcon className="size-4" />
            Duplicar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deletePending}
            onClick={async () => {
              const ok = await confirm({
                title: "Borrar producto",
                description: `¿Borrar "${product.name}"? Esta acción no se puede deshacer.`,
                confirmLabel: "Borrar",
                destructive: true,
              });
              if (!ok) return;
              startDeleteTransition(async () => {
                try {
                  await deleteProduct(product.id);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo borrar");
                }
              });
            }}
          >
            <Trash2Icon className="size-4" />
            Borrar
          </Button>
        </div>
      </div>

      {/* Información básica */}
      <section className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="font-medium">Información básica</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="p-name">Nombre</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="p-category">Categoría</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(String(v))}
              items={categories.map((c) => ({ value: c.id, label: c.name }))}
            >
              <SelectTrigger id="p-category" className="w-full">
                <SelectValue placeholder="Elegí un tipo" />
              </SelectTrigger>
              <SelectContent container={containerRef}>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <StockGroupPicker
          key={stockGroupResetKey}
          groups={stockGroups}
          defaultGroupId={product.stockGroupId}
          newGroupNamePlaceholder={`Nombre del grupo (vacío = "${product.name}")`}
          onChange={setStockGroupSelection}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="p-description">Descripción (opcional)</Label>
          <Textarea
            id="p-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
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

        <div className="flex flex-col gap-2 border-t pt-3">
          <Label>Etiquetas (opcional)</Label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
              >
                {t}
                <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))}>
                  <XIcon className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                  setTagInput("");
                }
              }}
              placeholder="Escribí y presioná Enter"
              className="flex-1"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TAG_SUGGESTIONS.filter((s) => !tags.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Fotos */}
      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-medium">Fotos</h2>
          <p className="text-xs text-muted-foreground">
            La primera foto es la portada, la que se ve en el catálogo.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {images.map((img, i) => (
            <div key={img.key} className="flex flex-col gap-1">
              <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                <Image
                  src={img.kind === "existing" ? img.url : img.previewUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized={img.kind === "new"}
                />
                {i === 0 && (
                  <span className="absolute top-1 left-1 flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-medium text-primary-foreground">
                    <StarIcon className="size-2.5 fill-current" />
                    Portada
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
              <div className="flex justify-center gap-1">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => setImages((prev) => move(prev, i, i - 1))}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Mover antes"
                >
                  <ChevronUpIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={i === images.length - 1}
                  onClick={() => setImages((prev) => move(prev, i, i + 1))}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Mover después"
                >
                  <ChevronDownIcon className="size-3.5" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            <ImagePlusIcon className="size-5" />
            <span className="text-xs">Agregar</span>
          </button>
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
      </section>

      {/* Variantes */}
      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-medium">Gustos y tamaños</h2>
          <p className="text-xs text-muted-foreground">
            {contactToBuy
              ? "Con \"Consultar por WhatsApp\" activado el precio no se muestra — solo importan los nombres."
              : "Cada combinación tiene su propio precio. El stock por fecha se carga en \"Fechas y stock\"."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {variants.map((v, i) => (
            <VariantRow
              key={v.key}
              variant={v}
              index={i}
              count={variants.length}
              hidePrice={contactToBuy}
              expanded={expandedVariant === v.key}
              onToggleExpand={() => setExpandedVariant((cur) => (cur === v.key ? null : v.key))}
              onChange={(patch) =>
                setVariants((prev) => prev.map((x) => (x.key === v.key ? { ...x, ...patch } : x)))
              }
              onMove={(dir) =>
                setVariants((prev) => move(prev, i, dir === "up" ? i - 1 : i + 1))
              }
              onRemove={() => removeVariant(v)}
            />
          ))}
          {variants.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Sin variantes todavía — el producto no va a aparecer en la tienda hasta que
              agregues al menos una.
            </p>
          )}
        </div>

        <Button type="button" variant="outline" onClick={addVariant} className="self-start">
          <PlusIcon className="size-4" />
          Agregar variante
        </Button>
      </section>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur transition-transform lg:pl-64",
          dirty ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Tenés cambios sin guardar</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={discard} disabled={pending}>
              Descartar
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={pending}>
              {pending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariantRow({
  variant,
  index,
  count,
  hidePrice = false,
  expanded,
  onToggleExpand,
  onChange,
  onMove,
  onRemove,
}: {
  variant: Variant;
  index: number;
  count: number;
  hidePrice?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<Variant>) => void;
  onMove: (dir: "up" | "down") => void;
  onRemove: () => void;
}) {
  const label = [variant.gusto, variant.tamano].filter(Boolean).join(" · ") || "Sin nombre";

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-2 p-3">
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove("up")}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Mover arriba"
          >
            <ChevronUpIcon className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={index === count - 1}
            onClick={() => onMove("down")}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Mover abajo"
          >
            <ChevronDownIcon className="size-3.5" />
          </button>
        </div>

        <Input
          value={variant.gusto}
          onChange={(e) => onChange({ gusto: e.target.value })}
          placeholder="Gusto (opcional)"
          className="min-w-0 flex-1"
        />
        <Input
          value={variant.tamano}
          onChange={(e) => onChange({ tamano: e.target.value })}
          placeholder="Tamaño (opcional)"
          className="min-w-0 flex-1"
        />
        {!hidePrice && (
          <Input
            type="number"
            step="0.01"
            min="0"
            value={variant.price}
            onChange={(e) => onChange({ price: e.target.value })}
            placeholder="Precio"
            className="w-24 shrink-0"
          />
        )}
        <Switch
          checked={variant.active}
          onCheckedChange={(active) => onChange({ active })}
          aria-label="Activa"
        />
        <button
          type="button"
          onClick={onToggleExpand}
          className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Más opciones"
        >
          {expanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Borrar variante"
        >
          <Trash2Icon className="size-4" />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 border-t bg-muted/30 p-3">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">SKU / código interno (opcional)</Label>
            <Input value={variant.sku} onChange={(e) => onChange({ sku: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}
