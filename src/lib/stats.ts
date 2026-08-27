import type { FulfillmentType, OrderStatus, PaymentMethodType } from "@/generated/prisma/client";

// Solo estos estados representan una venta real — pedidos todavía sin
// confirmar (pendientes/en revisión) o cancelados no cuentan para las
// estadísticas de facturación.
export const COUNTED_ORDER_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "DELIVERED"];

export type OrderStatsRow = {
  id: string;
  createdAt: string;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethodType;
  fulfillmentType: FulfillmentType;
  userId: string | null;
  deliveryDateId: string;
  pointsEarned: number;
  items: {
    productId: string;
    productName: string;
    categoryName: string;
    quantity: number;
    unitPrice: number;
  }[];
};

// Una fecha de entrega con sus costos cargados a mano — para poder sacar
// el resultado neto (ventas de esa fecha menos estos costos) en la vista
// "Por fecha" de Ventas.
export type DeliveryDateOption = {
  id: string;
  label: string;
  costs: { id: string; label: string; amount: number }[];
};

export type CustomerStatsRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  avgOrderValue: number;
  lastOrderAt: string | null;
  lastWhatsappAt: string | null;
};
