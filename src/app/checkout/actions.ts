"use server";

import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPickupSlotsForDate } from "@/lib/pickup-slots";
import { saveUploadedFile } from "@/lib/storage";
import { isWeeklyWindowStillOpen } from "@/lib/availability";
import { logGroupStockMovement, logProductStockMovement } from "@/lib/stock-movements";
import { awardPointsForOrder } from "@/lib/points";
import { getStoreSettings } from "@/lib/settings";
import { sendMail } from "@/lib/mailer";
import { orderConfirmationEmail } from "@/lib/email-templates";

const itemSchema = z.object({
  productVariantId: z.string(),
  quantity: z.number().int().positive(),
});

const placeOrderSchema = z
  .object({
    deliveryDateId: z.string().min(1),
    fulfillmentType: z.enum(["DELIVERY", "PICKUP"]),
    paymentMethod: z.enum(["CASH_ON_DELIVERY", "TRANSFER"]),
    items: z.array(itemSchema).min(1, "El carrito está vacío"),
    phone: z.string().trim().min(1, "Ingresá un teléfono de contacto"),
    address: z.string().trim().optional(),
    pickupSlotId: z.string().optional(),
    couponCode: z.string().trim().optional(),
    guestName: z.string().trim().optional(),
    guestEmail: z.string().trim().email("Ingresá un email válido").optional().or(z.literal("")),
  })
  .refine((data) => data.fulfillmentType !== "DELIVERY" || !!data.address, {
    message: "Ingresá la dirección de entrega",
    path: ["address"],
  });

export async function getPickupSlotsForCheckout(deliveryDateId: string) {
  const deliveryDate = await prisma.deliveryDate.findUnique({
    where: { id: deliveryDateId },
  });
  if (!deliveryDate) return [];

  return getPickupSlotsForDate(deliveryDateId);
}

function computeCouponDiscount(
  coupon: { discountType: "PERCENT" | "FIXED"; discountValue: unknown },
  subtotal: number,
) {
  const value = Number(coupon.discountValue);
  if (coupon.discountType === "PERCENT") return Math.round((subtotal * value) / 100);
  return Math.min(value, subtotal);
}

export async function validateCoupon(rawCode: string, subtotal: number) {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error("Ingresá un código");

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) throw new Error("Ese cupón no existe o no está activo");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error("Ese cupón venció");
  }
  if (coupon.usageLimit) {
    const usedCount = await prisma.couponRedemption.count({ where: { couponId: coupon.id } });
    if (usedCount >= coupon.usageLimit) {
      throw new Error("Ese cupón ya alcanzó el límite de usos");
    }
  }
  if (coupon.pointsCost > 0) {
    const session = await auth();
    const redeemed = session?.user
      ? await prisma.couponRedemption.findFirst({
          where: { couponId: coupon.id, userId: session.user.id, orderId: null },
        })
      : null;
    if (!redeemed) {
      throw new Error("Este cupón se canjea por puntos desde \"Mis puntos\"");
    }
  }

  return {
    couponId: coupon.id,
    code: coupon.code,
    discountAmount: computeCouponDiscount(coupon, subtotal),
  };
}

export async function placeOrder(formData: FormData) {
  const session = await auth();

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    throw new Error("Carrito inválido");
  }

  const parsed = placeOrderSchema.parse({
    deliveryDateId: formData.get("deliveryDateId"),
    fulfillmentType: formData.get("fulfillmentType"),
    paymentMethod: formData.get("paymentMethod"),
    items,
    phone: formData.get("phone"),
    address: formData.get("address") || undefined,
    pickupSlotId: formData.get("pickupSlotId") || undefined,
    couponCode: formData.get("couponCode") || undefined,
    guestName: formData.get("guestName") || undefined,
    guestEmail: formData.get("guestEmail") || undefined,
  });

  if (!session?.user && (!parsed.guestName || !parsed.guestEmail)) {
    throw new Error("Ingresá tu nombre y email de contacto");
  }

  const [storeConfig, paymentConfig, fulfillmentConfig] = await Promise.all([
    prisma.storeConfig.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.paymentMethodConfig.findUnique({ where: { type: parsed.paymentMethod } }),
    prisma.fulfillmentMethodConfig.findUnique({ where: { type: parsed.fulfillmentType } }),
  ]);
  if (!storeConfig.storeOpen) throw new Error("La tienda está cerrada temporalmente");
  if (!paymentConfig?.enabled) throw new Error("Ese medio de pago no está disponible");
  if (!fulfillmentConfig?.enabled) throw new Error("Ese tipo de entrega no está disponible");

  if (parsed.paymentMethod === "CASH_ON_DELIVERY" && paymentConfig.minPreviousOrders != null) {
    const previousOrders = session?.user
      ? await prisma.order.count({
          where: { userId: session.user.id, status: { not: "CANCELLED" } },
        })
      : 0;
    if (previousOrders < paymentConfig.minPreviousOrders) {
      throw new Error("Ese medio de pago no está disponible para tu cuenta todavía — probá con otro.");
    }
  }

  const deliveryDate = await prisma.deliveryDate.findUnique({
    where: { id: parsed.deliveryDateId },
  });
  if (!deliveryDate || deliveryDate.status !== "OPEN") {
    throw new Error("Esta fecha de entrega ya no está disponible");
  }
  if (deliveryDate.orderOpenAt && deliveryDate.orderOpenAt > new Date()) {
    throw new Error("Todavía no empezamos a tomar pedidos para esta fecha");
  }
  if (deliveryDate.cutoffAt && deliveryDate.cutoffAt < new Date()) {
    throw new Error("Se venció el horario de corte para esta fecha");
  }
  if (storeConfig.orderingMode === "WEEKLY_HOURS") {
    const stillOpen = await isWeeklyWindowStillOpen(parsed.deliveryDateId);
    if (!stillOpen) throw new Error("Ya no estamos tomando pedidos en este horario");
  }
  if (deliveryDate.capacity != null) {
    const orderCount = await prisma.order.count({
      where: { deliveryDateId: deliveryDate.id, status: { not: "CANCELLED" } },
    });
    if (orderCount >= deliveryDate.capacity) {
      throw new Error("Esta fecha ya alcanzó el máximo de pedidos");
    }
  }

  const deliveryFee =
    parsed.fulfillmentType === "DELIVERY"
      ? Number((fulfillmentConfig.config as { fee?: number } | null)?.fee ?? 0)
      : 0;

  let pickupSlotId: string | null = null;
  if (parsed.fulfillmentType === "PICKUP") {
    const validSlots = await getPickupSlotsForDate(parsed.deliveryDateId);
    if (validSlots.length > 0) {
      if (!parsed.pickupSlotId || !validSlots.some((s) => s.id === parsed.pickupSlotId)) {
        throw new Error("Elegí un horario de retiro");
      }
      pickupSlotId = parsed.pickupSlotId;
    }
  }

  let proofUrl: string | null = null;
  if (parsed.paymentMethod === "TRANSFER") {
    const file = formData.get("proof") as File | null;
    if (!file || file.size === 0) throw new Error("Subí el comprobante de la transferencia");
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      throw new Error("El comprobante debe ser una imagen o un PDF");
    }
    proofUrl = await saveUploadedFile(file, "payment-proofs");
  }

  const status = parsed.paymentMethod === "CASH_ON_DELIVERY" ? "CONFIRMED" : "PAYMENT_REVIEW";

  const order = await prisma.$transaction(async (tx) => {
    if (deliveryDate.capacity != null) {
      const orderCount = await tx.order.count({
        where: { deliveryDateId: deliveryDate.id, status: { not: "CANCELLED" } },
      });
      if (orderCount >= deliveryDate.capacity) {
        throw new Error("Esta fecha ya alcanzó el máximo de pedidos");
      }
    }

    const variantIds = parsed.items.map((i) => i.productVariantId);
    const variants = await tx.productVariant.findMany({
      where: {
        id: { in: variantIds },
        active: true,
        product: { active: true, category: { active: true } },
      },
      include: {
        product: {
          include: {
            stockGroup: { include: { stock: { where: { deliveryDateId: parsed.deliveryDateId } } } },
            productStock: { where: { deliveryDateId: parsed.deliveryDateId } },
          },
        },
      },
    });

    if (variants.length !== variantIds.length) {
      throw new Error("Alguno de los productos ya no está disponible");
    }
    if (variants.some((v) => v.product.contactToBuy)) {
      throw new Error("Alguno de los productos es a consulta — coordinalo por WhatsApp, no se puede pedir online");
    }
    if (storeConfig.orderingMode === "WEEKLY_HOURS" && variants.some((v) => v.product.soldOutToday)) {
      throw new Error("Alguno de los productos se marcó como agotado hoy");
    }

    let subtotal = 0;
    const orderItemsData = parsed.items.map((item) => {
      const variant = variants.find((v) => v.id === item.productVariantId)!;
      const unitPrice = Number(variant.price);
      subtotal += unitPrice * item.quantity;
      return { productVariantId: variant.id, quantity: item.quantity, unitPrice };
    });

    // El modo de stock de la fecha decide cómo se valida y descuenta: por
    // grupo (pozo compartido), por producto (número propio para esta fecha,
    // ignorando el grupo), o sin límite (no se trackea nada).
    const requestedByGroup = new Map<string, number>();
    const requestedByProduct = new Map<string, number>();

    if (deliveryDate.stockMode === "BY_GROUP") {
      for (const item of orderItemsData) {
        const variant = variants.find((v) => v.id === item.productVariantId)!;
        const groupId = variant.product.stockGroupId;
        requestedByGroup.set(groupId, (requestedByGroup.get(groupId) ?? 0) + item.quantity);
      }
      for (const [groupId, requested] of requestedByGroup) {
        const group = variants.find((v) => v.product.stockGroupId === groupId)!.product.stockGroup;
        const pool = group.stock[0];
        if (pool && pool.quantityAvailable != null) {
          const remaining = Math.max(0, pool.quantityAvailable - pool.quantitySold);
          if (remaining < requested) {
            throw new Error(
              remaining > 0
                ? `Solo quedan ${remaining} unidades disponibles de "${group.name}" (pediste ${requested}). Ajustá la cantidad en el carrito.`
                : `Se agotó el stock de "${group.name}". Sacalo del carrito para poder confirmar.`,
            );
          }
        }
      }
    } else if (deliveryDate.stockMode === "BY_PRODUCT") {
      for (const item of orderItemsData) {
        const variant = variants.find((v) => v.id === item.productVariantId)!;
        const productId = variant.productId;
        requestedByProduct.set(productId, (requestedByProduct.get(productId) ?? 0) + item.quantity);
      }
      for (const [productId, requested] of requestedByProduct) {
        const variant = variants.find((v) => v.productId === productId)!;
        const pool = variant.product.productStock[0];
        if (pool && pool.quantityAvailable != null) {
          const remaining = Math.max(0, pool.quantityAvailable - pool.quantitySold);
          if (remaining < requested) {
            throw new Error(
              remaining > 0
                ? `Solo quedan ${remaining} unidades disponibles de "${variant.product.name}" (pediste ${requested}). Ajustá la cantidad en el carrito.`
                : `Se agotó el stock de "${variant.product.name}". Sacalo del carrito para poder confirmar.`,
            );
          }
        }
      }
    }

    let couponId: string | null = null;
    let discountFromCoupon = 0;
    let couponPendingRedemptionId: string | null = null;
    if (parsed.couponCode) {
      const code = parsed.couponCode.trim().toUpperCase();
      const coupon = await tx.coupon.findUnique({ where: { code } });
      if (!coupon || !coupon.active) throw new Error("Ese cupón no existe o no está activo");
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new Error("Ese cupón venció");
      }
      if (coupon.usageLimit) {
        const usedCount = await tx.couponRedemption.count({ where: { couponId: coupon.id } });
        if (usedCount >= coupon.usageLimit) {
          throw new Error("Ese cupón ya alcanzó el límite de usos");
        }
      }
      if (coupon.pointsCost > 0) {
        const pending = session?.user
          ? await tx.couponRedemption.findFirst({
              where: { couponId: coupon.id, userId: session.user.id, orderId: null },
            })
          : null;
        if (!pending) throw new Error("Este cupón se canjea por puntos desde \"Mis puntos\"");
        couponPendingRedemptionId = pending.id;
      }
      couponId = coupon.id;
      discountFromCoupon = computeCouponDiscount(coupon, subtotal);
    }

    const total = Math.max(0, subtotal + deliveryFee - discountFromCoupon);

    const created = await tx.order.create({
      data: {
        userId: session?.user?.id ?? null,
        guestName: session?.user ? null : parsed.guestName,
        guestEmail: session?.user ? null : parsed.guestEmail,
        deliveryDateId: parsed.deliveryDateId,
        fulfillmentType: parsed.fulfillmentType,
        pickupSlotId,
        deliveryAddress: parsed.fulfillmentType === "DELIVERY" ? (parsed.address ?? null) : null,
        deliveryPhone: parsed.phone,
        status,
        paymentMethod: parsed.paymentMethod,
        subtotal,
        deliveryFee,
        couponId,
        discountFromCoupon,
        total,
        items: { create: orderItemsData },
      },
    });

    if (couponId) {
      if (couponPendingRedemptionId) {
        await tx.couponRedemption.update({
          where: { id: couponPendingRedemptionId },
          data: { orderId: created.id },
        });
      } else {
        await tx.couponRedemption.create({
          data: { couponId, userId: session?.user?.id ?? null, orderId: created.id },
        });
      }
    }

    if (status === "CONFIRMED") {
      await awardPointsForOrder(tx, created);
    }

    // Guardamos el teléfono/dirección en el perfil para prellenar el próximo pedido
    // — solo aplica a cuentas logueadas, un invitado no tiene perfil.
    if (session?.user) {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          phone: parsed.phone,
          ...(parsed.fulfillmentType === "DELIVERY" ? { address: parsed.address } : {}),
        },
      });
    }

    for (const [groupId, quantity] of requestedByGroup) {
      await tx.stockGroupStock.upsert({
        where: { stockGroupId_deliveryDateId: { stockGroupId: groupId, deliveryDateId: parsed.deliveryDateId } },
        update: { quantitySold: { increment: quantity } },
        create: {
          stockGroupId: groupId,
          deliveryDateId: parsed.deliveryDateId,
          quantityAvailable: null,
          quantitySold: quantity,
        },
      });
      await logGroupStockMovement(tx, {
        deliveryDateId: parsed.deliveryDateId,
        stockGroupId: groupId,
        reason: "SALE",
        delta: -quantity,
        note: `Pedido ${created.id}`,
      });
    }

    for (const [productId, quantity] of requestedByProduct) {
      await tx.productStock.upsert({
        where: { productId_deliveryDateId: { productId, deliveryDateId: parsed.deliveryDateId } },
        update: { quantitySold: { increment: quantity } },
        create: {
          productId,
          deliveryDateId: parsed.deliveryDateId,
          quantityAvailable: null,
          quantitySold: quantity,
        },
      });
      await logProductStockMovement(tx, {
        deliveryDateId: parsed.deliveryDateId,
        productId,
        reason: "SALE",
        delta: -quantity,
        note: `Pedido ${created.id}`,
      });
    }

    if (proofUrl) {
      await tx.paymentProof.create({ data: { orderId: created.id, url: proofUrl } });
    }

    return created;
  });

  const recipient = session?.user?.email ?? parsed.guestEmail;
  if (recipient) {
    try {
      const [storeSettings, orderItems] = await Promise.all([
        getStoreSettings(),
        prisma.orderItem.findMany({
          where: { orderId: order.id },
          include: { productVariant: { include: { product: true } } },
        }),
      ]);
      await sendMail({
        to: recipient,
        subject: `Recibimos tu pedido — ${storeSettings.storeName}`,
        html: orderConfirmationEmail({
          storeName: storeSettings.storeName,
          orderId: order.id,
          total: Number(order.total),
          fulfillmentType: order.fulfillmentType,
          items: orderItems.map((i) => ({
            name: i.productVariant.product.name,
            quantity: i.quantity,
          })),
        }),
      });
    } catch (e) {
      console.error("No se pudo enviar el mail de confirmación", e);
    }
  }

  return { orderId: order.id };
}
