"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { PackageIcon, SparklesIcon, TicketIcon, TrendingUpIcon, UsersIcon, WalletIcon } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { formatPrice } from "@/lib/format";
import { FULFILLMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/order-status";
import type { CustomerStatsRow, DeliveryDateOption, OrderStatsRow } from "@/lib/stats";
import { SalesBarChart } from "./sales-bar-chart";
import { CustomersPanel } from "./customers-panel";
import { DeliveryDateResultPanel } from "./delivery-date-result-panel";

type Preset = "7d" | "30d" | "90d" | "thisMonth" | "lastMonth" | "all";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "thisMonth", label: "Este mes" },
  { value: "lastMonth", label: "Mes pasado" },
  { value: "all", label: "Todo" },
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function presetRange(preset: Preset): { from: Date | null; to: Date | null } {
  const now = new Date();
  switch (preset) {
    case "7d": {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 6);
      return { from, to: null };
    }
    case "30d": {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 29);
      return { from, to: null };
    }
    case "90d": {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 89);
      return { from, to: null };
    }
    case "thisMonth":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: null };
    case "lastMonth": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from, to };
    }
    case "all":
      return { from: null, to: null };
  }
}

type Granularity = "day" | "week" | "month";

function bucketGranularity(from: Date | null, to: Date | null): Granularity {
  if (!from) return "month";
  const end = to ?? new Date();
  const days = Math.max(1, Math.round((end.getTime() - from.getTime()) / 86400000));
  if (days <= 40) return "day";
  if (days <= 180) return "week";
  return "month";
}

function bucketKey(date: Date, granularity: Granularity) {
  if (granularity === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  if (granularity === "week") {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function bucketLabel(key: string, granularity: Granularity) {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
  }
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function StatsDashboard({
  orders,
  customers,
  deliveryDateOptions,
}: {
  orders: OrderStatsRow[];
  customers: CustomerStatsRow[];
  deliveryDateOptions: DeliveryDateOption[];
}) {
  const { containerRef } = useAdminTheme();
  const [preset, setPreset] = useState<Preset>("30d");
  const [fulfillment, setFulfillment] = useState<string>("all");
  const [payment, setPayment] = useState<string>("all");

  const { from, to } = useMemo(() => presetRange(preset), [preset]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const createdAt = new Date(o.createdAt);
      if (from && createdAt < from) return false;
      if (to && createdAt > to) return false;
      if (fulfillment !== "all" && o.fulfillmentType !== fulfillment) return false;
      if (payment !== "all" && o.paymentMethod !== payment) return false;
      return true;
    });
  }, [orders, from, to, fulfillment, payment]);

  const summary = useMemo(() => {
    const totalSales = filtered.reduce((s, o) => s + o.total, 0);
    const orderCount = filtered.length;
    const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
    const pointsAwarded = filtered.reduce((s, o) => s + o.pointsEarned, 0);
    const distinctCustomers = new Set(filtered.filter((o) => o.userId).map((o) => o.userId)).size;
    const guestOrders = filtered.filter((o) => !o.userId).length;

    const byPayment = new Map<string, number>();
    const byFulfillment = new Map<string, number>();
    for (const o of filtered) {
      byPayment.set(o.paymentMethod, (byPayment.get(o.paymentMethod) ?? 0) + o.total);
      byFulfillment.set(o.fulfillmentType, (byFulfillment.get(o.fulfillmentType) ?? 0) + o.total);
    }

    return {
      totalSales,
      orderCount,
      avgOrderValue,
      pointsAwarded,
      distinctCustomers,
      guestOrders,
      byPayment,
      byFulfillment,
    };
  }, [filtered]);

  const chartData = useMemo(() => {
    const granularity = bucketGranularity(from, to);
    const map = new Map<string, number>();
    for (const o of filtered) {
      const key = bucketKey(new Date(o.createdAt), granularity);
      map.set(key, (map.get(key) ?? 0) + o.total);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, label: bucketLabel(key, granularity), value, valueLabel: formatPrice(value) }));
  }, [filtered, from, to]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; category: string; quantity: number; revenue: number }>();
    for (const o of filtered) {
      for (const item of o.items) {
        const entry = map.get(item.productId) ?? {
          name: item.productName,
          category: item.categoryName,
          quantity: 0,
          revenue: 0,
        };
        entry.quantity += item.quantity;
        entry.revenue += item.unitPrice * item.quantity;
        map.set(item.productId, entry);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const topCategories = useMemo(() => {
    const map = new Map<string, { quantity: number; revenue: number }>();
    for (const o of filtered) {
      for (const item of o.items) {
        const entry = map.get(item.categoryName) ?? { quantity: 0, revenue: 0 };
        entry.quantity += item.quantity;
        entry.revenue += item.unitPrice * item.quantity;
        map.set(item.categoryName, entry);
      }
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  return (
    <Tabs defaultValue="ventas">
      <TabsList className="w-full max-w-md">
        <TabsTrigger value="ventas" className="flex-1">
          Ventas
        </TabsTrigger>
        <TabsTrigger value="productos" className="flex-1">
          Productos
        </TabsTrigger>
        <TabsTrigger value="clientes" className="flex-1">
          Clientes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ventas" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-lg border p-1">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPreset(p.value)}
                className={
                  "cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
                  (preset === p.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          <Select value={fulfillment} onValueChange={(v) => setFulfillment(String(v))}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue>
                {fulfillment === "all" ? "Delivery y retiro" : FULFILLMENT_TYPE_LABELS[fulfillment as keyof typeof FULFILLMENT_TYPE_LABELS]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent container={containerRef}>
              <SelectItem value="all">Delivery y retiro</SelectItem>
              {Object.entries(FULFILLMENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={payment} onValueChange={(v) => setPayment(String(v))}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue>
                {payment === "all" ? "Todos los medios" : PAYMENT_METHOD_LABELS[payment]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent container={containerRef}>
              <SelectItem value="all">Todos los medios</SelectItem>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={WalletIcon} label="Ventas totales" value={formatPrice(summary.totalSales)} />
          <KpiCard icon={TrendingUpIcon} label="Pedidos" value={String(summary.orderCount)} />
          <KpiCard icon={TicketIcon} label="Ticket promedio" value={formatPrice(summary.avgOrderValue)} />
          <KpiCard icon={SparklesIcon} label="Puntos otorgados" value={String(summary.pointsAwarded)} />
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold">Ventas en el tiempo</h2>
          <SalesBarChart data={chartData} />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <BreakdownCard title="Por medio de pago" data={summary.byPayment} labels={PAYMENT_METHOD_LABELS} total={summary.totalSales} />
          <BreakdownCard
            title="Por tipo de entrega"
            data={summary.byFulfillment}
            labels={FULFILLMENT_TYPE_LABELS}
            total={summary.totalSales}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={UsersIcon} label="Clientes con cuenta" value={String(summary.distinctCustomers)} />
          <KpiCard icon={PackageIcon} label="Pedidos de invitados" value={String(summary.guestOrders)} />
        </div>

        <DeliveryDateResultPanel orders={orders} deliveryDateOptions={deliveryDateOptions} />
      </TabsContent>

      <TabsContent value="productos" className="flex flex-col gap-4">
        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-sm font-semibold">Productos más vendidos</h2>
            <span className="text-xs text-muted-foreground">mismo período que Ventas</span>
          </div>
          <div className="flex flex-col divide-y">
            {topProducts.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Sin ventas en este período.</p>
            )}
            {topProducts.slice(0, 15).map((p, i) => (
              <div key={p.name + i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 shrink-0 text-center text-xs font-medium text-muted-foreground">{i + 1}</span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.category}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-right">
                  <span className="text-muted-foreground">{p.quantity} vendidos</span>
                  <span className="w-24 font-semibold">{formatPrice(p.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold">Categorías más vendidas</h2>
          </div>
          <div className="flex flex-col divide-y">
            {topCategories.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Sin ventas en este período.</p>
            )}
            {topCategories.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="font-medium">{c.name}</span>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-muted-foreground">{c.quantity} vendidos</span>
                  <span className="w-24 font-semibold">{formatPrice(c.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="clientes">
        <CustomersPanel customers={customers} />
      </TabsContent>
    </Tabs>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-lg font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  data,
  labels,
  total,
}: {
  title: string;
  data: Map<string, number>;
  labels: Record<string, string>;
  total: number;
}) {
  const rows = Array.from(data.entries()).sort(([, a], [, b]) => b - a);
  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map(([key, value]) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{labels[key] ?? key}</span>
                  <span className="text-muted-foreground">
                    {formatPrice(value)} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
