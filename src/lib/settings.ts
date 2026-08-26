import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type StoreSettings = {
  storeName: string;
  logoUrl: string | null;
  coverUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  instagram: string | null;
  addToCartLabel: string;
};

const DEFAULT_STORE_NAME = "Pedidos";
const DEFAULT_ADD_TO_CART_LABEL = "Agregar";

const SETTINGS_KEYS = [
  "store_name",
  "store_logo_url",
  "store_cover_url",
  "store_address",
  "store_phone",
  "store_email",
  "store_whatsapp",
  "store_instagram",
  "store_add_to_cart_label",
] as const;

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const rows = await prisma.settings.findMany({
    where: { key: { in: [...SETTINGS_KEYS] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    storeName: map.store_name || DEFAULT_STORE_NAME,
    logoUrl: map.store_logo_url || null,
    coverUrl: map.store_cover_url || null,
    address: map.store_address || null,
    phone: map.store_phone || null,
    email: map.store_email || null,
    whatsapp: map.store_whatsapp || null,
    instagram: map.store_instagram || null,
    addToCartLabel: map.store_add_to_cart_label || DEFAULT_ADD_TO_CART_LABEL,
  };
});

// ---------- SMTP (mail de confirmación de pedido) ----------

export type SmtpSettings = {
  configured: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  pass: string | null;
  from: string | null;
  secure: boolean;
};

const SMTP_SETTINGS_KEYS = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_secure"] as const;

export const getSmtpSettings = cache(async (): Promise<SmtpSettings> => {
  const rows = await prisma.settings.findMany({
    where: { key: { in: [...SMTP_SETTINGS_KEYS] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const host = map.smtp_host || null;
  const user = map.smtp_user || null;
  const pass = map.smtp_pass || null;
  return {
    configured: Boolean(host && user && pass),
    host,
    port: map.smtp_port ? Number(map.smtp_port) : null,
    user,
    pass,
    from: map.smtp_from || null,
    secure: map.smtp_secure === "true",
  };
});
