import { requireAdmin } from "@/lib/require-admin";
import { getActivePointsRule } from "@/lib/points";
import { prisma } from "@/lib/prisma";
import { RateForm } from "./rate-form";

export default async function AdminPointsPage() {
  await requireAdmin();

  const [rule, redemptionsCount] = await Promise.all([
    getActivePointsRule(),
    prisma.pointsLedger.count({ where: { reason: "COUPON_REDEMPTION" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Puntos</h1>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Tasa de acumulación</span>
          <span className="text-xs text-muted-foreground">
            Cuántos puntos suma un cliente logueado por cada $1000 de subtotal, al confirmarse el
            pedido. Los invitados (sin cuenta) no acumulan.
          </span>
        </div>
        <RateForm currentRate={Number(rule?.pointsPerAmount ?? 0)} />
      </div>

      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Los clientes canjean sus puntos por cupones desde &quot;Mis puntos&quot; — creá cupones
        con un costo en puntos desde la sección de Cupones. Canjes hechos hasta ahora:{" "}
        <span className="font-medium text-foreground">{redemptionsCount}</span>.
      </div>
    </div>
  );
}
