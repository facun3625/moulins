import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@pedidos.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  await prisma.storeConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      passwordHash: adminHash,
    },
  });

  await prisma.settings.upsert({
    where: { key: "store_name" },
    update: {},
    create: { key: "store_name", value: "Tsuki Demo" },
  });

  await prisma.paymentMethodConfig.upsert({
    where: { type: "CASH_ON_DELIVERY" },
    update: {},
    create: { type: "CASH_ON_DELIVERY", enabled: true },
  });
  await prisma.paymentMethodConfig.upsert({
    where: { type: "TRANSFER" },
    update: {},
    create: { type: "TRANSFER", enabled: false },
  });
  await prisma.paymentMethodConfig.upsert({
    where: { type: "MERCADOPAGO" },
    update: {},
    create: { type: "MERCADOPAGO", enabled: false },
  });

  await prisma.fulfillmentMethodConfig.upsert({
    where: { type: "DELIVERY" },
    update: {},
    create: { type: "DELIVERY", enabled: true },
  });
  await prisma.fulfillmentMethodConfig.upsert({
    where: { type: "PICKUP" },
    update: {},
    create: { type: "PICKUP", enabled: false },
  });

  const existingRule = await prisma.pointsRule.findFirst({
    where: { effectiveTo: null },
  });
  if (!existingRule) {
    await prisma.pointsRule.create({ data: { pointsPerAmount: 1 } });
  }

  console.log(`Admin de tienda -> ${admin.email} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
