import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { expireStaleDates } from "@/lib/schedule";
import { resolveWeeklyAvailability } from "@/lib/availability";
import { FechasSubnav } from "./fechas-subnav";
import { ModeSwitcher } from "./mode-switcher";
import { ManualCloseToggle } from "./manual-close-toggle";
import { WeeklyScheduleForm, type DayInput } from "./horarios/weekly-schedule-form";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long" });
const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function DeliveryDatesPage() {
  await requireAdmin();
  await expireStaleDates();

  const storeConfig = await prisma.storeConfig.findUniqueOrThrow({ where: { id: 1 } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Fechas y stock</h1>
        {storeConfig.orderingMode === "SCHEDULED_SALES" && (
          <Button render={<Link href="/admin/fechas/nueva" />} size="sm">
            Nueva venta
          </Button>
        )}
      </div>

      <FechasSubnav />

      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <span className="text-sm font-medium">Modalidad</span>
        <ModeSwitcher current={storeConfig.orderingMode} />
      </div>

      {storeConfig.orderingMode === "WEEKLY_HOURS" ? (
        <WeeklyHoursPanel manuallyClosed={storeConfig.ordersManuallyClosed} />
      ) : (
        <ScheduledSalesPanel />
      )}
    </div>
  );
}

async function WeeklyHoursPanel({ manuallyClosed }: { manuallyClosed: boolean }) {
  const [rules, availability] = await Promise.all([
    prisma.weeklyScheduleRule.findMany({
      include: { windows: { orderBy: { order: "asc" } } },
    }),
    resolveWeeklyAvailability(),
  ]);

  const byWeekday = new Map(rules.map((r) => [r.weekday, r]));
  const initialDays: DayInput[] = Array.from({ length: 7 }, (_, weekday) => {
    const r = byWeekday.get(weekday);
    return {
      weekday,
      // Un día habilitado sin franjas es un resto de una configuración vieja
      // (o incompleta) — lo tratamos como apagado en vez de bloquear el guardado.
      enabled: Boolean(r?.enabled) && (r?.windows.length ?? 0) > 0,
      windows: (r?.windows ?? []).map((w) => ({
        order: w.order,
        orderOpenTime: w.orderOpenTime,
        orderCloseTime: w.orderCloseTime,
        fulfillmentStart: w.fulfillmentStart,
        fulfillmentEnd: w.fulfillmentEnd,
      })),
    };
  });

  const statusLabel = availability.open
    ? `Abierto ahora — cierra a las ${availability.closesAt}`
    : availability.nextOpenLabel
      ? `Cerrado — abrimos ${availability.nextOpenLabel}`
      : "Cerrado — todavía no configuraste horarios";

  return (
    <div className="flex flex-col gap-4">
      <ManualCloseToggle manuallyClosed={manuallyClosed} liveOpen={availability.open} statusLabel={statusLabel} />

      <div className="rounded-lg border p-4">
        <WeeklyScheduleForm initialDays={initialDays} />
      </div>
    </div>
  );
}

async function ScheduledSalesPanel() {
  const deliveryDates = await prisma.deliveryDate.findMany({
    orderBy: { date: "asc" },
    include: {
      _count: { select: { stockGroupStock: true, orders: { where: { status: { not: "CANCELLED" } } } } },
    },
  });

  return (
    <div className="flex flex-col gap-3">
      {deliveryDates.map((d) => {
        const full = d.capacity != null && d._count.orders >= d.capacity;
        return (
          <Link
            key={d.id}
            href={`/admin/fechas/${d.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border p-3 active:bg-accent"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium capitalize">{dateFormatter.format(d.date)}</span>
              <span className="text-xs text-muted-foreground">
                {d._count.stockGroupStock} {d._count.stockGroupStock === 1 ? "grupo" : "grupos"} con stock ·{" "}
                {d._count.orders} {d._count.orders === 1 ? "pedido" : "pedidos"}
                {d.capacity != null && ` / ${d.capacity}`}
                {d.orderOpenAt && ` · abre ${dateTimeFormatter.format(d.orderOpenAt)}`}
                {d.cutoffAt && ` · corte ${dateTimeFormatter.format(d.cutoffAt)}`}
              </span>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {full && <Badge variant="secondary">Completa</Badge>}
              <Badge variant={d.status === "OPEN" ? "default" : d.status === "EXPIRED" ? "outline" : "secondary"}>
                {d.status === "OPEN" ? "Abierta" : d.status === "EXPIRED" ? "Vencida" : "Cerrada"}
              </Badge>
            </div>
          </Link>
        );
      })}

      {deliveryDates.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Todavía no creaste ninguna venta programada.
        </p>
      )}
    </div>
  );
}
