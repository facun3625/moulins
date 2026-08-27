"use client";

import { useMemo, useState } from "react";
import { MessageCircleIcon, SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/format";
import type { CustomerStatsRow } from "@/lib/stats";
import { WhatsappCampaignDialog } from "./whatsapp-campaign-dialog";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

function daysSince(iso: string | null) {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

type SortKey = "totalSpent" | "orderCount" | "lastOrderAt";

export function CustomersPanel({ customers }: { customers: CustomerStatsRow[] }) {
  const [q, setQ] = useState("");
  const [inactiveDays, setInactiveDays] = useState("");
  const [minOrders, setMinOrders] = useState("");
  const [minSpent, setMinSpent] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalSpent");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [campaignOpen, setCampaignOpen] = useState(false);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    const minInactiveDays = inactiveDays ? Number(inactiveDays) : null;
    const minOrdersN = minOrders ? Number(minOrders) : null;
    const minSpentN = minSpent ? Number(minSpent) : null;

    return customers
      .filter((c) => {
        if (qLower && !(c.name?.toLowerCase().includes(qLower) || c.email.toLowerCase().includes(qLower))) return false;
        if (minInactiveDays !== null && daysSince(c.lastOrderAt) < minInactiveDays) return false;
        if (minOrdersN !== null && c.orderCount < minOrdersN) return false;
        if (minSpentN !== null && c.totalSpent < minSpentN) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === "lastOrderAt") {
          const da = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : -Infinity;
          const db = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : -Infinity;
          return db - da;
        }
        return b[sortKey] - a[sortKey];
      });
  }, [customers, q, inactiveDays, minOrders, minSpent, sortKey]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someSelected = filtered.some((c) => selected.has(c.id)) && !allSelected;

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((c) => next.add(c.id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCustomers = customers.filter((c) => selected.has(c.id));
  const selectedWithPhone = selectedCustomers.filter((c) => c.phone);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email"
            className="w-56 pl-8"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Sin comprar hace más de (días)</Label>
          <Input
            type="number"
            min={0}
            value={inactiveDays}
            onChange={(e) => setInactiveDays(e.target.value)}
            placeholder="Ej: 30"
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Mínimo de pedidos</Label>
          <Input type="number" min={0} value={minOrders} onChange={(e) => setMinOrders(e.target.value)} className="w-24" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Mínimo gastado ($)</Label>
          <Input type="number" min={0} value={minSpent} onChange={(e) => setMinSpent(e.target.value)} className="w-28" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setInactiveDays("30");
            setMinOrders("1");
            setMinSpent("");
            setQ("");
          }}
        >
          Inactivos 30+ días
        </Button>
        {(q || inactiveDays || minOrders || minSpent) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setInactiveDays("");
              setMinOrders("");
              setMinSpent("");
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted px-3 py-2">
          <span className="text-sm font-medium">
            {selected.size} {selected.size === 1 ? "cliente seleccionado" : "clientes seleccionados"}
            {selectedWithPhone.length < selectedCustomers.length && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({selectedCustomers.length - selectedWithPhone.length} sin teléfono, no se les puede escribir)
              </span>
            )}
          </span>
          <Button type="button" size="sm" onClick={() => setCampaignOpen(true)} disabled={selectedWithPhone.length === 0}>
            <MessageCircleIcon className="size-4" />
            Enviar WhatsApp
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={toggleAll} aria-label="Seleccionar todos" />
            </TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>
              <button type="button" className="cursor-pointer hover:text-foreground" onClick={() => setSortKey("orderCount")}>
                Pedidos
              </button>
            </TableHead>
            <TableHead>
              <button type="button" className="cursor-pointer hover:text-foreground" onClick={() => setSortKey("totalSpent")}>
                Gastado
              </button>
            </TableHead>
            <TableHead>Ticket prom.</TableHead>
            <TableHead>
              <button type="button" className="cursor-pointer hover:text-foreground" onClick={() => setSortKey("lastOrderAt")}>
                Última compra
              </button>
            </TableHead>
            <TableHead>Último WhatsApp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => {
            const inactive = daysSince(c.lastOrderAt);
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} aria-label={`Seleccionar ${c.name ?? c.email}`} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{c.name || "Sin nombre"}</span>
                    <span className="text-xs text-muted-foreground">{c.email}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                <TableCell>{c.orderCount}</TableCell>
                <TableCell className="font-medium">{formatPrice(c.totalSpent)}</TableCell>
                <TableCell className="text-muted-foreground">{c.orderCount > 0 ? formatPrice(c.avgOrderValue) : "—"}</TableCell>
                <TableCell>
                  {c.lastOrderAt ? (
                    <div className="flex flex-col">
                      <span className={inactive >= 30 ? "text-amber-600 dark:text-amber-400" : ""}>
                        {dateFormatter.format(new Date(c.lastOrderAt))}
                      </span>
                      <span className="text-xs text-muted-foreground">hace {inactive} días</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Nunca compró</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.lastWhatsappAt ? dateFormatter.format(new Date(c.lastWhatsappAt)) : "—"}
                </TableCell>
              </TableRow>
            );
          })}

          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                No hay clientes que coincidan con esos filtros.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <WhatsappCampaignDialog
        open={campaignOpen}
        onOpenChange={setCampaignOpen}
        recipients={selectedWithPhone.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone as string,
          lastWhatsappAt: c.lastWhatsappAt,
        }))}
      />
    </div>
  );
}
