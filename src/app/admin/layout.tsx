import { Montserrat } from "next/font/google";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { AdminThemeRoot } from "@/components/admin/admin-theme-root";
import { ConfirmProvider } from "@/components/admin/confirm-provider";
import { PromptProvider } from "@/components/admin/prompt-provider";
import { prisma } from "@/lib/prisma";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const storeConfig = await prisma.storeConfig.findUniqueOrThrow({ where: { id: 1 } });

  return (
    <AdminThemeRoot fontFamily={montserrat.style.fontFamily}>
      <ConfirmProvider>
        <PromptProvider>
          <aside className="hidden bg-sidebar h-full overflow-y-auto w-64 shrink-0 border-r border-sidebar-border print:hidden lg:flex lg:flex-col">
            <AdminSidebar />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
            <AdminTopbar storeOpen={storeConfig.storeOpen} />
            <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 print:p-0">{children}</main>
          </div>
        </PromptProvider>
      </ConfirmProvider>
    </AdminThemeRoot>
  );
}
