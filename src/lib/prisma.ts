import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  // Se versiona cuando cambia el schema para que el HMR de Next no reutilice
  // una instancia construida con un cliente generado anterior.
  prismaSchemaV4: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prismaSchemaV4 ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaSchemaV4 = prisma;
