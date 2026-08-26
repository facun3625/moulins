import { formatPrice } from "@/lib/format";
import { FULFILLMENT_TYPE_LABELS } from "@/lib/order-status";
import type { FulfillmentType } from "@/generated/prisma/client";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function orderConfirmationEmail({
  storeName,
  orderId,
  total,
  fulfillmentType,
  items,
}: {
  storeName: string;
  orderId: string;
  total: number;
  fulfillmentType: FulfillmentType;
  items: { name: string; quantity: number }[];
}) {
  const itemsHtml = items
    .map((i) => `<li>${i.quantity}× ${escapeHtml(i.name)}</li>`)
    .join("");

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h1 style="font-size: 20px;">¡Gracias por tu pedido!</h1>
      <p>Recibimos tu pedido en <strong>${escapeHtml(storeName)}</strong>.</p>
      <p style="color: #666; font-size: 13px;">N° de pedido: ${orderId.slice(-8)}</p>
      <ul style="padding-left: 20px;">${itemsHtml}</ul>
      <p><strong>Total: ${formatPrice(total)}</strong></p>
      <p>Tipo de entrega: ${FULFILLMENT_TYPE_LABELS[fulfillmentType]}</p>
      <p style="color: #666; font-size: 13px; margin-top: 24px;">
        Te avisamos por acá si cambia el estado de tu pedido.
      </p>
    </div>
  `;
}
