"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CalendarClockIcon, CircleCheckIcon, ClockIcon, SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import { DateSwitcher } from "./date-switcher";
import { CategoryPills } from "./category-pills";
import { ProductCard } from "./product-card";
import { AddToCartSheet } from "./add-to-cart-sheet";
import { CartBar } from "./cart-bar";
import { CartSidebar } from "./cart-sidebar";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  images: string[];
  contactToBuy: boolean;
  variants: { id: string; label: string; price: number; remaining: number; stockGroupId: string | null }[];
};

export function Catalog({
  deliveryDates,
  selectedDeliveryDateId,
  categories,
  products,
  readOnly = false,
  readOnlyReason = "closed",
  nextOpenDateLabel,
  statusBanner,
}: {
  deliveryDates: { id: string; date: string }[];
  selectedDeliveryDateId: string;
  categories: { id: string; name: string; icon?: string | null }[];
  products: CatalogProduct[];
  readOnly?: boolean;
  readOnlyReason?: "closed" | "soldout";
  nextOpenDateLabel?: string | null;
  statusBanner?: { icon: "open" | "calendar"; text: string } | null;
}) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const lastScrolledIdRef = useRef<string | null>(null);

  const filtered = useMemo(() => {
    return products.filter((p) => !categoryId || p.categoryId === categoryId);
  }, [products, categoryId]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [products, search]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!scrollTargetId || lastScrolledIdRef.current === scrollTargetId) return;
    const el = cardRefs.current.get(scrollTargetId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    lastScrolledIdRef.current = scrollTargetId;
  }, [scrollTargetId, filtered]);

  useEffect(() => {
    if (!highlightedId) return;
    const timeout = setTimeout(() => setHighlightedId(null), 1600);
    return () => clearTimeout(timeout);
  }, [highlightedId]);

  function goToProduct(product: CatalogProduct) {
    setSearch("");
    setSuggestionsOpen(false);
    if (categoryId && categoryId !== product.categoryId) {
      setCategoryId(null);
    }
    setHighlightedId(product.id);
    setScrollTargetId(product.id);
  }

  return (
    <div className="relative z-1 -mt-6 mx-5 flex flex-1 flex-col rounded-t-3xl bg-background lg:-mt-32 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:shadow-2xl">
      <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-t-3xl bg-background px-4 pt-4 pb-3 lg:px-8">
        {readOnly ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-muted px-4 py-3 text-sm">
            <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
            <span>
              {readOnlyReason === "soldout"
                ? "Se alcanzó el límite de pedidos. Mientras tanto podés mirar el menú."
                : nextOpenDateLabel
                  ? `Cerrado por ahora. Abrimos ${nextOpenDateLabel}. Mientras tanto podés mirar el menú.`
                  : "Cerrado por ahora. Mientras tanto podés mirar el menú."}
            </span>
          </div>
        ) : statusBanner ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-muted px-4 py-3 text-sm">
            {statusBanner.icon === "open" ? (
              <CircleCheckIcon className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <CalendarClockIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span>{statusBanner.text}</span>
          </div>
        ) : (
          <DateSwitcher deliveryDates={deliveryDates} selectedId={selectedDeliveryDateId} />
        )}

        <div ref={searchWrapRef} className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por productos"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => search && setSuggestionsOpen(true)}
            className="rounded-xl pl-9"
          />

          {suggestionsOpen && search && (
            <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border bg-background shadow-lg">
              {suggestions.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  No encontramos productos con ese nombre.
                </p>
              ) : (
                <ul className="max-h-72 overflow-y-auto py-1">
                  {suggestions.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          goToProduct(product);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                      >
                        <div className="size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {product.imageUrl && (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              width={36}
                              height={36}
                              className="size-9 object-cover"
                            />
                          )}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {product.name}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-primary">
                          {product.contactToBuy ? "Consultar" : formatPrice(product.variants[0]?.price ?? 0)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <CategoryPills categories={categories} selected={categoryId} onSelect={setCategoryId} />
      </div>

      <div className="flex flex-1 flex-col gap-6 px-4 pb-4 lg:flex-row lg:items-start lg:px-8">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] lg:content-start">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              deliveryDateId={selectedDeliveryDateId}
              onSelect={() => setSelectedProduct(product)}
              cardRef={(el) => {
                if (el) cardRefs.current.set(product.id, el);
                else cardRefs.current.delete(product.id);
              }}
              highlighted={highlightedId === product.id}
              readOnly={readOnly}
            />
          ))}

          {filtered.length === 0 && (
            <p className="col-span-full rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No encontramos productos con ese filtro.
            </p>
          )}
        </div>

        <CartSidebar className="hidden lg:sticky lg:top-[194px] lg:block lg:w-[28rem] lg:shrink-0" />
      </div>

      <AddToCartSheet
        product={selectedProduct}
        deliveryDateId={selectedDeliveryDateId}
        onClose={() => setSelectedProduct(null)}
        readOnly={readOnly}
      />

      {!readOnly && <CartBar className="lg:hidden" />}
    </div>
  );
}
