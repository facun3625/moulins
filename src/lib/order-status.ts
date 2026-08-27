import type { FulfillmentType, OrderStatus } from "@/generated/prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAYMENT_REVIEW: "En revisión",
  CONFIRMED: "Confirmado",
  PREPARING: "En preparación",
  READY: "Listo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

// Un color por estado para que la tabla de pedidos se pueda escanear de
// un vistazo, sin tener que leer cada pill.
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  PAYMENT_REVIEW: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  CONFIRMED: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  PREPARING: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  READY: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  DELIVERED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH_ON_DELIVERY: "Efectivo",
  TRANSFER: "Transferencia",
  MERCADOPAGO: "MercadoPago",
};

export const FULFILLMENT_TYPE_LABELS: Record<FulfillmentType, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Retira en el local",
};
