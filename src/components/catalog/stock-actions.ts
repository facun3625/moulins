"use server";

import { getRemainingForProduct } from "@/lib/stock";

export async function checkRemainingStock(deliveryDateId: string, productId: string) {
  return getRemainingForProduct(deliveryDateId, productId);
}
