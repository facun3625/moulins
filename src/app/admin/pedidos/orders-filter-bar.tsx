"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, FULFILLMENT_TYPE_LABELS } from "@/lib/order-status";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export function OrdersFilterBar({
  deliveryDates,
}: {
  deliveryDates: { id: string; date: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { containerRef } = useAdminTheme();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      updateParam("q", q || null);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = ["q", "fecha", "estado", "tipo", "pago"].some((k) => searchParams.get(k));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por comprador, email o teléfono"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          items={[
            { value: "all", label: "Todas las fechas" },
            ...deliveryDates.map((d) => ({
              value: d.id,
              label: dateFormatter.format(new Date(d.date)),
            })),
          ]}
          value={searchParams.get("fecha") ?? "all"}
          onValueChange={(v) => updateParam("fecha", v === "all" ? null : String(v))}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Fecha de entrega" />
          </SelectTrigger>
          <SelectContent container={containerRef} alignItemWithTrigger={false}>
            <SelectItem value="all">Todas las fechas</SelectItem>
            {deliveryDates.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {dateFormatter.format(new Date(d.date))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={[
            { value: "all", label: "Todos los estados" },
            ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          value={searchParams.get("estado") ?? "all"}
          onValueChange={(v) => updateParam("estado", v === "all" ? null : String(v))}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent container={containerRef} alignItemWithTrigger={false}>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={[
            { value: "all", label: "Delivery y retiro" },
            ...Object.entries(FULFILLMENT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          value={searchParams.get("tipo") ?? "all"}
          onValueChange={(v) => updateParam("tipo", v === "all" ? null : String(v))}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Tipo de entrega" />
          </SelectTrigger>
          <SelectContent container={containerRef} alignItemWithTrigger={false}>
            <SelectItem value="all">Delivery y retiro</SelectItem>
            {Object.entries(FULFILLMENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={[
            { value: "all", label: "Todos los medios" },
            ...Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          value={searchParams.get("pago") ?? "all"}
          onValueChange={(v) => updateParam("pago", v === "all" ? null : String(v))}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Medio de pago" />
          </SelectTrigger>
          <SelectContent container={containerRef} alignItemWithTrigger={false}>
            <SelectItem value="all">Todos los medios</SelectItem>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              router.push(pathname);
            }}
          >
            <XIcon className="size-3.5" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}
