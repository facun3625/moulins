"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeftIcon, SearchIcon, Trash2Icon, UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { useConfirm } from "@/components/admin/confirm-provider";
import { usePrompt } from "@/components/admin/prompt-provider";
import { cn } from "@/lib/utils";
import { deleteDeliveryDate, saveDeliveryDate } from "../actions";
import { CostsTab, type CostRow } from "./costs-tab";

type StockMode = "BY_GROUP" | "UNLIMITED";

type DeliveryDateData = {
  id: string;
  date: string;
  orderOpenAt: string | null;
  cutoffAt: string | null;
  capacity: number | null;
  notes: string | null;
  status: "OPEN" | "CLOSED" | "EXPIRED";
};

type Group = {
  id: string;
  name: string;
  productNames: string[];
  quantityAvailable: number | null;
  quantitySold: number;
};

type Product = { id: string; name: string; stockGroupId: string };
type QtyState = { unlimited: boolean; value: string };
type Slot = { id: string; label: string };
type Movement = {
  id: string;
  targetName: string;
  reason: "SALE" | "RESTOCK" | "ADJUSTMENT";
  delta: number | null;
  quantityAvailable: number | null;
  quantitySold: number;
  note: string | null;
  createdAt: string;
};

const MOVEMENT_REASON_LABELS: Record<Movement["reason"], string> = {
  SALE: "Venta",
  RESTOCK: "Reposición",
  ADJUSTMENT: "Ajuste manual",
};

const movementDateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

const SOLO = "__solo__";
const SOLO_KEY_PREFIX = "solo:";

const MODES: { value: StockMode; label: string; hint: string }[] = [
  { value: "BY_GROUP", label: "Con stock", hint: "Cada variante descuenta de su pozo — individual o compartido, según cómo esté armado el producto." },
  { value: "UNLIMITED", label: "Sin límite", hint: "No se trackea stock. Todo está siempre disponible en esta fecha." },
];

function qtyFrom(quantityAvailable: number | null): QtyState {
  return { unlimited: quantityAvailable == null, value: quantityAvailable != null ? String(quantityAvailable) : "" };
}

export function DateEditor({
  deliveryDate,
  stockMode: initialStockMode,
  groups,
  allProducts,
  pickupEnabled,
  dateSlots,
  defaultSlots,
  movements,
  costs,
}: {
  deliveryDate: DeliveryDateData;
  stockMode: StockMode;
  costs: CostRow[];
  groups: Group[];
  allProducts: Product[];
  pickupEnabled: boolean;
  dateSlots: Slot[];
  defaultSlots: Slot[];
  movements: Movement[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [pending, startTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  function fieldsFrom(d: DeliveryDateData) {
    return {
      date: d.date,
      orderOpenAt: d.orderOpenAt ?? "",
      cutoffAt: d.cutoffAt ?? "",
      capacity: d.capacity != null ? String(d.capacity) : "",
      notes: d.notes ?? "",
      open: d.status === "OPEN",
    };
  }

  const [date, setDate] = useState(deliveryDate.date);
  const [orderOpenAt, setOrderOpenAt] = useState(deliveryDate.orderOpenAt ?? "");
  const [cutoffAt, setCutoffAt] = useState(deliveryDate.cutoffAt ?? "");
  const [capacity, setCapacity] = useState(deliveryDate.capacity != null ? String(deliveryDate.capacity) : "");
  const [notes, setNotes] = useState(deliveryDate.notes ?? "");
  const [open, setOpen] = useState(deliveryDate.status === "OPEN");
  const [stockMode, setStockMode] = useState<StockMode>(initialStockMode);

  const [productGroupId, setProductGroupId] = useState<Record<string, string>>(() =>
    Object.fromEntries(allProducts.map((p) => [p.id, p.stockGroupId])),
  );
  const [groupQty, setGroupQty] = useState<Record<string, QtyState>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, qtyFrom(g.quantityAvailable)])),
  );

  const [groupSearch, setGroupSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | "shared" | "individual">("all");

  const [slots, setSlots] = useState<Slot[]>(() => dateSlots.map((s) => ({ ...s })));
  const [newSlotIds, setNewSlotIds] = useState<Set<string>>(() => new Set());
  const [removedSlotIds, setRemovedSlotIds] = useState<string[]>([]);
  const [newSlotLabel, setNewSlotLabel] = useState("");

  // "baseline" es el último estado guardado. Sirve para detectar cambios sin
  // guardar y para que "Descartar" vuelva ahí — no depende de la prop del
  // server, así que no se queda "pegado" en dirty después de guardar.
  const [baseline, setBaseline] = useState(() => ({
    ...fieldsFrom(deliveryDate),
    stockMode: initialStockMode,
    productGroupId: Object.fromEntries(allProducts.map((p) => [p.id, p.stockGroupId])),
    groupQty: Object.fromEntries(groups.map((g) => [g.id, qtyFrom(g.quantityAvailable)])),
    slots: dateSlots.map((s) => ({ ...s })),
  }));

  // Si cambió algo del lado del server (ej: otro admin tocó algo, o se
  // refrescó después de guardar), resincronizamos esa parte puntual — el
  // resto de los cambios pendientes queda intacto. Se ajusta en el cuerpo
  // del render (no en un efecto) siguiendo el patrón de React para
  // "resetear estado cuando cambia una prop".
  const groupsSignature = groups.map((g) => `${g.id}:${g.quantityAvailable}`).join(",");
  const membershipSignature = allProducts.map((p) => `${p.id}:${p.stockGroupId}`).join(",");
  const slotsSignature = dateSlots.map((s) => `${s.id}:${s.label}`).join(",");

  const [syncedGroups, setSyncedGroups] = useState(groupsSignature);
  const [syncedMembership, setSyncedMembership] = useState(membershipSignature);
  const [syncedSlots, setSyncedSlots] = useState(slotsSignature);

  if (groupsSignature !== syncedGroups) {
    setSyncedGroups(groupsSignature);
    const fresh = Object.fromEntries(groups.map((g) => [g.id, qtyFrom(g.quantityAvailable)]));
    setGroupQty(fresh);
    setBaseline((prev) => ({ ...prev, groupQty: fresh }));
  }
  if (membershipSignature !== syncedMembership) {
    setSyncedMembership(membershipSignature);
    const fresh = Object.fromEntries(allProducts.map((p) => [p.id, p.stockGroupId]));
    setProductGroupId(fresh);
    setBaseline((prev) => ({ ...prev, productGroupId: fresh }));
  }
  if (slotsSignature !== syncedSlots) {
    setSyncedSlots(slotsSignature);
    const fresh = dateSlots.map((s) => ({ ...s }));
    setSlots(fresh);
    setNewSlotIds(new Set());
    setRemovedSlotIds([]);
    setBaseline((prev) => ({ ...prev, slots: fresh }));
  }

  const currentSnapshot = JSON.stringify({
    date,
    orderOpenAt,
    cutoffAt,
    capacity,
    notes,
    open,
    stockMode,
    productGroupId,
    groupQty,
    slots,
  });
  const dirty = JSON.stringify(baseline) !== currentSnapshot;

  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function handleSave() {
    if (cutoffAt && date) {
      const endOfDeliveryDay = new Date(`${date}T23:59:59`);
      if (new Date(cutoffAt) > endOfDeliveryDay) {
        toast.error("El corte no puede ser posterior a la fecha de entrega");
        return;
      }
    }

    if (stockMode === "BY_GROUP") {
      for (const g of effectiveGroups) {
        const q = groupQty[g.id];
        if (q && !q.unlimited && Math.max(0, Number(q.value) || 0) < g.quantitySold) {
          toast.error(`"${g.name}" ya vendió ${g.quantitySold} — no puede quedar disponible por debajo de eso`);
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("date", date);
        formData.set("orderOpenAt", orderOpenAt);
        formData.set("cutoffAt", cutoffAt);
        formData.set("capacity", capacity);
        formData.set("notes", notes);
        formData.set("open", String(open));
        formData.set("stockMode", stockMode);

        if (stockMode === "BY_GROUP") {
          for (const [groupId, qty] of Object.entries(groupQty)) {
            if (groupId.startsWith(SOLO_KEY_PREFIX)) continue;
            formData.set(`stockgroup_${groupId}`, qty.unlimited ? "" : qty.value);
          }
        }

        const changedAssignments: Record<string, { target: string; quantity?: string }> = {};
        for (const [productId, target] of Object.entries(productGroupId)) {
          if (baseline.productGroupId[productId] === target) continue;
          const entry: { target: string; quantity?: string } = { target };
          if (target === SOLO) {
            const q = groupQty[`${SOLO_KEY_PREFIX}${productId}`] ?? { unlimited: true, value: "" };
            entry.quantity = q.unlimited ? "" : q.value;
          }
          changedAssignments[productId] = entry;
        }
        formData.set("groupAssignments", JSON.stringify(changedAssignments));

        const added = slots.filter((s) => newSlotIds.has(s.id)).map((s) => s.label);
        formData.set("pickupSlots", JSON.stringify({ added, removedIds: removedSlotIds }));

        await saveDeliveryDate(deliveryDate.id, formData);
        setBaseline({
          date,
          orderOpenAt,
          cutoffAt,
          capacity,
          notes,
          open,
          stockMode,
          productGroupId,
          groupQty,
          slots,
        });
        setNewSlotIds(new Set());
        setRemovedSlotIds([]);
        toast.success("Fecha guardada");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  function discard() {
    setDate(baseline.date);
    setOrderOpenAt(baseline.orderOpenAt);
    setCutoffAt(baseline.cutoffAt);
    setCapacity(baseline.capacity);
    setNotes(baseline.notes);
    setOpen(baseline.open);
    setStockMode(baseline.stockMode);
    setProductGroupId(baseline.productGroupId);
    setGroupQty(baseline.groupQty);
    setSlots(baseline.slots);
    setNewSlotIds(new Set());
    setRemovedSlotIds([]);
    toast("Cambios descartados");
  }

  // Vista efectiva de "qué grupo tiene qué productos" a partir de las
  // asignaciones pendientes (no de lo que hay guardado). Los productos que
  // pidieron pasar a individual ("__solo__") aparecen como su propio
  // renglón temporal hasta que se guarde.
  const productNamesById = new Map(allProducts.map((p) => [p.id, p.name]));
  const membersByGroupId = new Map<string, string[]>();
  const soloPendingIds: string[] = [];
  for (const p of allProducts) {
    const target = productGroupId[p.id] ?? p.stockGroupId;
    if (target === SOLO) {
      soloPendingIds.push(p.id);
    } else {
      membersByGroupId.set(target, [...(membersByGroupId.get(target) ?? []), p.name]);
    }
  }
  const effectiveGroups: Group[] = [
    ...groups
      .filter((g) => (membersByGroupId.get(g.id)?.length ?? 0) > 0)
      .map((g) => ({ ...g, productNames: membersByGroupId.get(g.id)! })),
    ...soloPendingIds.map((productId) => ({
      id: `${SOLO_KEY_PREFIX}${productId}`,
      name: productNamesById.get(productId) ?? "",
      productNames: [productNamesById.get(productId) ?? ""],
      quantityAvailable: null,
      quantitySold: 0,
    })),
  ];

  function applyGroupAssignment(groupId: string, selectedProductIds: Set<string>) {
    setProductGroupId((prev) => {
      const next = { ...prev };
      for (const productId of Object.keys(next)) {
        if (selectedProductIds.has(productId)) next[productId] = groupId;
        else if (next[productId] === groupId) next[productId] = SOLO;
      }
      return next;
    });
  }

  const sharedGroups = effectiveGroups.filter((g) => g.productNames.length > 1);
  const individualGroups = effectiveGroups.filter((g) => g.productNames.length <= 1);

  async function applyToAllGroups() {
    const value = await prompt({
      title: "Aplicar a todos los grupos",
      label: "Cantidad a aplicar a todos los grupos compartidos",
      type: "number",
      placeholder: "Ej: 20",
    });
    if (value == null || value.trim() === "") return;
    const n = String(Math.max(0, Number(value) || 0));
    setGroupQty((prev) => {
      const next = { ...prev };
      for (const g of sharedGroups) next[g.id] = { unlimited: false, value: n };
      return next;
    });
  }

  async function applyToAllIndividual() {
    const value = await prompt({
      title: "Aplicar a todos los individuales",
      label: "Cantidad a aplicar a todos los productos con stock individual",
      type: "number",
      placeholder: "Ej: 20",
    });
    if (value == null || value.trim() === "") return;
    const n = String(Math.max(0, Number(value) || 0));
    setGroupQty((prev) => {
      const next = { ...prev };
      for (const g of individualGroups) next[g.id] = { unlimited: false, value: n };
      return next;
    });
  }

  const groupSearchLower = groupSearch.trim().toLowerCase();
  const visibleGroups = effectiveGroups.filter((g) => {
    if (groupFilter === "shared" && g.productNames.length <= 1) return false;
    if (groupFilter === "individual" && g.productNames.length > 1) return false;
    if (!groupSearchLower) return true;
    return (
      g.name.toLowerCase().includes(groupSearchLower) ||
      g.productNames.some((n) => n.toLowerCase().includes(groupSearchLower))
    );
  });
  function addSlot(label: string) {
    const id = `temp:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    setSlots((prev) => [...prev, { id, label }]);
    setNewSlotIds((prev) => new Set(prev).add(id));
  }
  function removeSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    setNewSlotIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (!newSlotIds.has(id)) setRemovedSlotIds((prev) => [...prev, id]);
  }
  function enableCustomSlots() {
    defaultSlots.forEach((s) => addSlot(s.label));
  }
  function disableCustomSlots() {
    slots.forEach((s) => removeSlot(s.id));
  }

  const activeHint = MODES.find((m) => m.value === stockMode)?.hint;

  const tabs = [
    { value: "datos", label: "Datos" },
    { value: "stock", label: "Stock" },
    ...(pickupEnabled ? [{ value: "franjas", label: "Franjas" }] : []),
    { value: "costos", label: "Costos" },
    { value: "historial", label: "Historial" },
  ];

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            render={<Link href="/admin/fechas" aria-label="Volver a fechas" />}
          >
            <ArrowLeftIcon />
          </Button>
          <h1 className="text-xl font-semibold">Fecha de entrega</h1>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={deletePending}
          onClick={async () => {
            const ok = await confirm({
              title: "Borrar fecha",
              description: "¿Borrar esta fecha de entrega?",
              confirmLabel: "Borrar",
              destructive: true,
            });
            if (!ok) return;
            startDeleteTransition(async () => {
              try {
                await deleteDeliveryDate(deliveryDate.id);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Error al borrar");
              }
            });
          }}
        >
          <Trash2Icon className="size-4" />
          Borrar fecha
        </Button>
      </div>

      <Tabs defaultValue="datos">
        <TabsList className="w-full">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="flex-1 font-semibold data-active:border-primary data-active:bg-primary data-active:shadow-md data-active:!text-primary-foreground"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="datos" className="flex flex-col gap-4 rounded-lg border p-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Abierta para pedidos</span>
              <span className="text-xs text-muted-foreground">
                Si la cerrás, los compradores no la van a ver más.
              </span>
            </div>
            <Switch checked={open} onCheckedChange={setOpen} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Fecha de entrega</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="capacity">Capacidad máxima de pedidos</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                step="1"
                placeholder="Sin límite"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="orderOpenAt">Empezamos a tomar pedidos</Label>
              <Input
                id="orderOpenAt"
                type="datetime-local"
                value={orderOpenAt}
                onChange={(e) => setOrderOpenAt(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cutoffAt">Dejamos de tomar pedidos</Label>
              <Input
                id="cutoffAt"
                type="datetime-local"
                value={cutoffAt}
                max={date ? `${date}T23:59` : undefined}
                onChange={(e) => setCutoffAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">No puede ser posterior a la fecha de entrega.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </TabsContent>

        <TabsContent value="stock" className="flex flex-col gap-4 rounded-lg border p-4">
          <div className="flex gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setStockMode(m.value)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors",
                  stockMode === m.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          {activeHint && <p className="text-xs text-muted-foreground">{activeHint}</p>}

          {stockMode === "BY_GROUP" && (
            <div className="flex flex-col gap-4 border-t pt-4">
              {effectiveGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay productos activos. Cargalos primero en Productos.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[160px] flex-1">
                      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        placeholder="Buscar producto o grupo..."
                        className="pl-8"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      {(
                        [
                          { value: "all", label: "Todos" },
                          { value: "shared", label: "Grupos" },
                          { value: "individual", label: "Individuales" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setGroupFilter(f.value)}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-center text-xs font-medium whitespace-nowrap transition-colors",
                            groupFilter === f.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 self-end">
                    {sharedGroups.length > 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={applyToAllGroups}>
                        Aplicar a todos los grupos
                      </Button>
                    )}
                    {individualGroups.length > 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={applyToAllIndividual}>
                        Aplicar a todos los individuales
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {visibleGroups.map((g) => (
                      <GroupStockRow
                        key={g.id}
                        group={g}
                        allProducts={allProducts}
                        selected={
                          new Set(Object.entries(productGroupId).filter(([, gid]) => gid === g.id).map(([pid]) => pid))
                        }
                        onApplyMembers={(ids) => applyGroupAssignment(g.id, ids)}
                        qty={groupQty[g.id] ?? { unlimited: true, value: "" }}
                        onChange={(qty) => setGroupQty((prev) => ({ ...prev, [g.id]: qty }))}
                      />
                    ))}
                    {visibleGroups.length === 0 && (
                      <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                        Nada coincide con la búsqueda o el filtro.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </TabsContent>

        {pickupEnabled && (
          <TabsContent value="franjas" className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Personalizar franjas para esta fecha</span>
                <span className="text-xs text-muted-foreground">
                  Apagado: se usan las predeterminadas de &quot;Entrega&quot;. Encendido: definís
                  franjas propias solo para esta fecha, sin relación con las predeterminadas.
                </span>
              </div>
              <Switch
                checked={slots.length > 0}
                onCheckedChange={(checked) => (checked ? enableCustomSlots() : disableCustomSlots())}
              />
            </div>

            {slots.length === 0 ? (
              <div className="flex flex-col gap-2">
                {defaultSlots.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-muted-foreground"
                  >
                    <span className="text-sm">{s.label}</span>
                  </div>
                ))}
                {defaultSlots.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay franjas predeterminadas cargadas en &quot;Entrega&quot;.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {slots.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                    <span className="text-sm">{s.label}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeSlot(s.id)}>
                      Borrar
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newSlotLabel}
                    onChange={(e) => setNewSlotLabel(e.target.value)}
                    placeholder="Ej: 12:00 - 13:00"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!newSlotLabel.trim()) return;
                      addSlot(newSlotLabel.trim());
                      setNewSlotLabel("");
                    }}
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="costos">
          <CostsTab deliveryDateId={deliveryDate.id} costs={costs} />
        </TabsContent>

        <TabsContent value="historial" className="flex flex-col gap-2 rounded-lg border p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Historial de stock</span>
            <span className="text-xs text-muted-foreground">
              Cada venta, cancelación y ajuste manual sobre el stock de esta fecha, más reciente
              primero.
            </span>
          </div>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay movimientos de stock.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {movements.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{m.targetName}</span>
                    <span className="text-xs text-muted-foreground">
                      {MOVEMENT_REASON_LABELS[m.reason]} · {movementDateFormatter.format(new Date(m.createdAt))}
                      {m.note ? ` · ${m.note}` : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    {m.delta != null && (
                      <span className={cn("font-semibold", m.delta > 0 ? "text-primary" : "text-destructive")}>
                        {m.delta > 0 ? `+${m.delta}` : m.delta}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {m.quantityAvailable == null
                        ? `${m.quantitySold} vendidas · sin límite`
                        : `${m.quantitySold} / ${m.quantityAvailable}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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

function GroupStockRow({
  group,
  allProducts,
  selected,
  onApplyMembers,
  qty,
  onChange,
}: {
  group: Group;
  allProducts: Product[];
  selected: Set<string>;
  onApplyMembers: (ids: Set<string>) => void;
  qty: QtyState;
  onChange: (qty: QtyState) => void;
}) {
  const isPendingSolo = group.id.startsWith(SOLO_KEY_PREFIX);
  const prompt = usePrompt();
  const sold = group.quantitySold;
  const hasValue = !qty.unlimited && qty.value.trim() !== "";
  const available = hasValue ? Math.max(0, Number(qty.value) || 0) : null;
  const remaining = available == null ? null : Math.max(0, available - sold);
  const overSold = available != null && available < sold;

  async function adjustStock() {
    const raw = await prompt({
      title: `Stock de "${group.name}"`,
      description: hasValue
        ? `Hay ${available} cargadas, ${sold} vendidas — quedan ${remaining}. Sumá unidades, o restá con un número negativo (ej: -5).`
        : "¿Cuántas unidades cargás para esta fecha?",
      label: "Cantidad",
      type: "number",
      placeholder: "Ej: 20",
      confirmLabel: "Aplicar",
    });
    if (raw == null || raw.trim() === "") return;
    const delta = Number(raw);
    if (!Number.isFinite(delta) || delta === 0) return;
    const base = available ?? 0;
    onChange({ unlimited: false, value: String(Math.max(0, base + delta)) });
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-md border p-3">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{group.name}</span>
            {group.productNames.length > 1 ? (
              <Badge variant="secondary" className="shrink-0 text-[0.65rem]">
                Grupo
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 text-[0.65rem]">
                Individual
              </Badge>
            )}
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {group.productNames.length > 1
              ? `Compartido entre: ${group.productNames.join(", ")}`
              : isPendingSolo
                ? "Sin guardar todavía"
                : group.productNames[0]}
          </span>
        </div>
        {!isPendingSolo && (
          <GroupMembersButton group={group} allProducts={allProducts} selected={selected} onApply={onApplyMembers} />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Vendidas: <span className="font-semibold text-foreground">{sold}</span>
          </span>
          {qty.unlimited ? (
            <span className="text-muted-foreground">Sin límite</span>
          ) : hasValue ? (
            <>
              <span className="text-muted-foreground">
                Cargadas: <span className="font-semibold text-foreground">{available}</span>
              </span>
              <span className={cn("font-semibold", overSold || remaining === 0 ? "text-destructive" : "text-primary")}>
                Quedan: {remaining}
              </span>
            </>
          ) : (
            <span className="font-medium text-destructive">Sin stock cargado</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={qty.unlimited}
              onChange={(e) => onChange({ unlimited: e.target.checked, value: e.target.checked ? "" : qty.value })}
            />
            Sin límite
          </label>

          {!qty.unlimited && (
            <Button type="button" variant={hasValue ? "outline" : "default"} size="sm" onClick={adjustStock}>
              {hasValue ? "Ajustar stock" : "Cargar stock"}
            </Button>
          )}
        </div>
      </div>

      {overSold && (
        <p className="text-xs text-destructive">
          Ya se vendieron {sold} — no puede quedar por debajo de eso.
        </p>
      )}
    </div>
  );
}

function GroupMembersButton({
  group,
  allProducts,
  selected,
  onApply,
}: {
  group: Group;
  allProducts: Product[];
  selected: Set<string>;
  onApply: (ids: Set<string>) => void;
}) {
  const { containerRef } = useAdminTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(selected);

  function toggle(id: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(selected);
        setOpen(next);
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Elegir qué productos son parte de "${group.name}"`}
        onClick={() => {
          setDraft(selected);
          setOpen(true);
        }}
      >
        <UsersIcon className="size-4" />
      </Button>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto" container={containerRef}>
        <SheetHeader>
          <SheetTitle>Productos en &quot;{group.name}&quot;</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          <p className="text-xs text-muted-foreground">
            Los productos tildados comparten el mismo pozo de stock. Destildá uno para que vuelva
            a tener stock individual. Esto queda pendiente hasta que apretés &quot;Guardar
            cambios&quot;.
          </p>
          <div className="flex flex-col gap-1.5">
            {allProducts.map((p) => (
              <label key={p.id} className="flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm">
                <input type="checkbox" checked={draft.has(p.id)} onChange={() => toggle(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
          <Button
            type="button"
            disabled={draft.size === 0}
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
          >
            Aplicar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
