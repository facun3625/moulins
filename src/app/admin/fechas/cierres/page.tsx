import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { FechasSubnav } from "../fechas-subnav";
import { ClosuresManager } from "./closures-manager";

export default async function ClosuresPage() {
  await requireAdmin();
  const closures = await prisma.storeClosure.findMany({
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Fechas y stock</h1>
      <FechasSubnav />

      <ClosuresManager
        closures={closures.map((c) => ({
          id: c.id,
          startDate: c.startDate.toISOString(),
          endDate: c.endDate.toISOString(),
          reason: c.reason,
        }))}
      />
    </div>
  );
}
