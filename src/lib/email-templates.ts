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

export function passwordResetEmail({ storeName, resetUrl }: { storeName: string; resetUrl: string }) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h1 style="font-size: 20px;">Restablecer tu contraseña</h1>
      <p>Alguien pidió cambiar la contraseña de tu cuenta en <strong>${escapeHtml(storeName)}</strong>. Si fuiste vos, entrá acá para elegir una nueva:</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
          Elegir nueva contraseña
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">El link vence en 1 hora. Si no fuiste vos, podés ignorar este mail.</p>
    </div>
  `;
}
