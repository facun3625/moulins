"use client";

import { toast } from "sonner";

import { useCart, type CartItem } from "@/lib/cart-context";

export function useQuickAdd(deliveryDateId: string) {
  const { addItem, confirmReplace } = useCart();

  function quickAdd(item: Omit<CartItem, "quantity">, quantity: number) {
    const result = addItem(deliveryDateId, item, quantity);
    if (result === "needs-confirmation") {
      toast("Tu carrito tiene productos de otra fecha", {
        description: "Agregar esto vacía lo que tenías antes.",
        action: {
          label: "Reemplazar",
          onClick: () => {
            confirmReplace(deliveryDateId, item, quantity);
            toast.success("Agregado");
          },
        },
      });
      return;
    }
    toast.success("Agregado");
  }

  return quickAdd;
}
