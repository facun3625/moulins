import { Suspense } from "react";
import Image from "next/image";

import { getStoreSettings } from "@/lib/settings";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const { storeName, logoUrl } = await getStoreSettings();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-0 overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-border">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 bg-muted/40 px-6 py-7 text-center">
          {logoUrl && (
            <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-border">
              <Image src={logoUrl} alt={storeName} width={56} height={56} className="size-full object-contain" />
            </div>
          )}
          <div className="flex flex-col items-center gap-0.5">
            <h1 className="text-xl font-semibold">Bienvenido</h1>
            <p className="text-sm text-muted-foreground">Ingresá para hacer tu pedido</p>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="px-6 py-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
