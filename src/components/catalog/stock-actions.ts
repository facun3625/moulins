"use server";

import { getRemainingForProduct, getRemainingForVariant, getRemainingForVariants } from "@/lib/stock";

export async function checkRemainingStock(deliveryDateId: string, variantId: string) {
  return getRemainingForVariant(deliveryDateId, variantId);
}

export async function checkRemainingStockForVariants(deliveryDateId: string, variantIds: string[]) {
  const map = await getRemainingForVariants(deliveryDateId, variantIds);
  return Object.fromEntries(map) as Record<string, number>;
}

export async function checkRemainingStockForProduct(deliveryDateId: string, productId: string) {
  return getRemainingForProduct(deliveryDateId, productId);
}
