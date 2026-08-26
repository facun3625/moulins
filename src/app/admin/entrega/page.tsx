import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { PickupSlotList } from "@/components/admin/pickup-slot-list";
import { FulfillmentMethodRow } from "./fulfillment-method-row";
import { DeliveryFeeForm } from "./delivery-fee-form";
import { addDefaultPickupSlot, deleteDefaultPickupSlot } from "./actions";

export type DeliveryFeeConfig = { fee?: number };

const METHOD_LABELS: Record<string, { title: string; description: string }> = {
  DELIVERY: {
    title: "Delivery",
    description: "El pedido se envía a la dirección del comprador.",
  },
  PICKUP: {
    title: "Retira en el local",
    description: "El comprador pasa a buscar el pedido por la tienda.",
  },
};

const METHOD_ORDER = ["DELIVERY", "PICKUP"] as const;

export default async function FulfillmentPage() {
  await requireAdmin();

  const [rows, defaultSlots] = await Promise.all([
    prisma.fulfillmentMethodConfig.findMany(),
    prisma.pickupSlot.findMany({
      where: { deliveryDateId: null },
      orderBy: { order: "asc" },
    }),
  ]);
  const byType = new Map(rows.map((r) => [r.type, r]));
  const pickupEnabled = byType.get("PICKUP")?.enabled ?? false;
  const deliveryEnabled = byType.get("DELIVERY")?.enabled ?? false;
  const deliveryFee = (byType.get("DELIVERY")?.config as DeliveryFeeConfig | null)?.fee ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Entrega</h1>

      <div className="flex flex-col gap-3">
        {METHOD_ORDER.map((type) => {
          const row = byType.get(type);
          const { title, description } = METHOD_LABELS[type];
          return (
            <div key={type} className="flex flex-col gap-3 rounded-lg border p-4">
              <FulfillmentMethodRow
                type={type}
                title={title}
                description={description}
                enabled={row?.enabled ?? false}
              />
              {type === "DELIVERY" && deliveryEnabled && (
                <DeliveryFeeForm key={deliveryFee} fee={deliveryFee} />
              )}
            </div>
          );
        })}
      </div>

      {pickupEnabled && (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Franjas horarias predeterminadas</span>
            <span className="text-xs text-muted-foreground">
              Se ofrecen para retirar en cualquier fecha, salvo que cargues franjas especiales
              para una fecha puntual desde &quot;Fechas y stock&quot;. Opcional: si no cargás
              ninguna, el retiro queda disponible sin horario puntual.
            </span>
          </div>
          <PickupSlotList
            slots={defaultSlots}
            onAdd={addDefaultPickupSlot}
            onDelete={deleteDefaultPickupSlot}
          />
        </div>
      )}
    </div>
  );
}
