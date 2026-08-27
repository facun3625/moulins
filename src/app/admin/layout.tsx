import { Montserrat } from "next/font/google";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar, type AdminNotification } from "@/components/admin/admin-topbar";
import { AdminThemeRoot } from "@/components/admin/admin-theme-root";
import { ConfirmProvider } from "@/components/admin/confirm-provider";
import { PromptProvider } from "@/components/admin/prompt-provider";
import { prisma } from "@/lib/prisma";
import { getStockAlerts } from "@/lib/stock-alerts";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [storeConfig, stockAlerts, newInquiryCount, pendingOrderCount, recentInquiries, recentOrders] = await Promise.all([
    prisma.storeConfig.findUniqueOrThrow({ where: { id: 1 } }),
    getStockAlerts(),
    prisma.serviceInquiry.count({ where: { status: "NEW" } }),
    prisma.order.count({ where: { status: { in: ["PENDING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED"] } } }),
    prisma.serviceInquiry.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, serviceTitle: true, createdAt: true } }),
    prisma.order.findMany({ where: { status: { in: ["PENDING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED"] } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, guestName: true, user: { select: { name: true, email: true } }, createdAt: true } }),
  ]);
  const notifications: AdminNotification[] = [
    ...recentInquiries.map((item) => ({ id: item.id, type: "INQUIRY" as const, title: "Nueva consulta", detail: item.serviceTitle, href: `/admin/consultas/${item.id}`, createdAt: item.createdAt.toISOString() })),
    ...recentOrders.map((item) => ({ id: item.id, type: "ORDER" as const, title: "Nuevo pedido", detail: item.user?.name ?? item.user?.email ?? item.guestName ?? `Pedido #${item.id.slice(-8).toUpperCase()}`, href: `/admin/pedidos/${item.id}`, createdAt: item.createdAt.toISOString() })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  return (
    <AdminThemeRoot fontFamily={montserrat.style.fontFamily}>
      <ConfirmProvider>
        <PromptProvider>
          <aside className="hidden bg-sidebar h-full overflow-y-auto w-64 shrink-0 border-r border-sidebar-border print:hidden lg:flex lg:flex-col">
            <AdminSidebar newInquiryCount={newInquiryCount} />
          </aside>
          <div className="flex min-w-0 min-h-0 flex-1 flex-col h-full overflow-hidden">
            <AdminTopbar storeOpen={storeConfig.storeOpen} stockAlerts={stockAlerts} newInquiryCount={newInquiryCount} notificationCount={newInquiryCount + pendingOrderCount} notifications={notifications} />
            <main className="flex-1 min-h-0 overflow-y-auto px-4 py-6 lg:px-8 print:p-0">{children}</main>
          </div>
        </PromptProvider>
      </ConfirmProvider>
    </AdminThemeRoot>
  );
}
