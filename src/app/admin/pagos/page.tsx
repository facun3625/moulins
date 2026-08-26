import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { PaymentMethodRow } from "./payment-method-row";
import { TransferConfigForm } from "./transfer-config-form";
import { CashRestrictionForm } from "./cash-restriction-form";

const METHOD_LABELS: Record<string, { title: string; description: string }> = {
  CASH_ON_DELIVERY: {
    title: "Efectivo",
    description: "El comprador paga al recibir el pedido.",
  },
  TRANSFER: {
    title: "Transferencia",
    description: "El comprador transfiere y sube un comprobante para que lo revises.",
  },
  MERCADOPAGO: {
    title: "MercadoPago",
    description: "Próximamente — todavía no está disponible.",
  },
};

const METHOD_ORDER = ["CASH_ON_DELIVERY", "TRANSFER", "MERCADOPAGO"] as const;

export type TransferConfig = {
  bankName?: string;
  accountHolder?: string;
  cbuOrAlias?: string;
};

export default async function PaymentMethodsPage() {
  await requireAdmin();

  const rows = await prisma.paymentMethodConfig.findMany();
  const byType = new Map(rows.map((r) => [r.type, r]));

  const transferConfig = (byType.get("TRANSFER")?.config as TransferConfig | null) ?? {};

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Medios de pago</h1>

      <div className="flex flex-col gap-3">
        {METHOD_ORDER.map((type) => {
          const row = byType.get(type);
          const { title: defaultTitle, description } = METHOD_LABELS[type];
          return (
            <div key={type} className="flex flex-col gap-3 rounded-lg border p-4">
              <PaymentMethodRow
                type={type}
                title={row?.label ?? defaultTitle}
                defaultTitle={defaultTitle}
                description={description}
                enabled={row?.enabled ?? false}
                disabled={type === "MERCADOPAGO"}
              />
              {type === "TRANSFER" && (row?.enabled ?? false) && (
                <TransferConfigForm key={JSON.stringify(transferConfig)} config={transferConfig} />
              )}
              {type === "CASH_ON_DELIVERY" && (row?.enabled ?? false) && (
                <CashRestrictionForm minPreviousOrders={row?.minPreviousOrders ?? null} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
