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

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH_ON_DELIVERY: "Efectivo",
  TRANSFER: "Transferencia",
  MERCADOPAGO: "MercadoPago",
};

export const FULFILLMENT_TYPE_LABELS: Record<FulfillmentType, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Retira en el local",
};
