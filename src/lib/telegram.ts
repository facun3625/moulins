import { getTelegramSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/format";
import { FULFILLMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/order-status";
import type { FulfillmentType, PaymentMethodType } from "@/generated/prisma/client";

// Un solo POST al endpoint sendMessage de la Bot API — devuelve {ok, error}
// en vez de tirar, para poder reusarla tanto en el aviso automático como en
// el botón "Probar" del admin.
export async function sendTelegram(
  token: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (res.ok) return { ok: true };

    // Telegram devuelve { description } con el motivo (token inválido, chat
    // no encontrado, bot sin permiso, etc.) — útil para mostrar en el admin.
    const detail = await res.text().catch(() => "");
    let description = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(detail) as { description?: string };
      if (parsed.description) description = parsed.description;
    } catch {
      /* dejamos el HTTP status */
    }
    return { ok: false, error: description };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red" };
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type NewOrderNotification = {
  orderId: string;
  orderUrl?: string;
  customerName: string;
  customerPhone?: string | null;
  paymentMethod: PaymentMethodType;
  fulfillmentType: FulfillmentType;
  total: number;
  items: { name: string; quantity: number }[];
};

function buildMessage(order: NewOrderNotification): string {
  const lines: string[] = [];
  lines.push(`🛍️ <b>Nueva venta</b> #${escapeHtml(order.orderId.slice(-8).toUpperCase())}`);
  lines.push("");
  lines.push(`👤 ${escapeHtml(order.customerName)}`);
  if (order.customerPhone) lines.push(`📱 ${escapeHtml(order.customerPhone)}`);
  lines.push(
    `💳 ${escapeHtml(PAYMENT_METHOD_LABELS[order.paymentMethod])} · ${escapeHtml(FULFILLMENT_TYPE_LABELS[order.fulfillmentType])} — ${escapeHtml(formatPrice(order.total))}`,
  );
  lines.push("");
  for (const item of order.items) {
    lines.push(`• ${item.quantity}x ${escapeHtml(item.name)}`);
  }

  if (order.orderUrl) {
    lines.push("");
    lines.push(`<a href="${escapeHtml(order.orderUrl)}">Ver en el panel →</a>`);
  }

  return lines.join("\n");
}

// Fire-and-forget: se llama sin await justo después de guardar el pedido.
// Si Telegram está mal configurado, caído, o el token venció, el pedido ya
// se guardó igual y el cliente no ve ningún error — esto solo loguea.
export async function notifyNewOrder(order: NewOrderNotification): Promise<void> {
  const settings = await getTelegramSettings();
  if (!settings.configured) return;

  const result = await sendTelegram(settings.botToken!, settings.chatId!, buildMessage(order));
  if (!result.ok) console.error("notifyNewOrder: Telegram falló —", result.error);
}
