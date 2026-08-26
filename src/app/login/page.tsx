import { Suspense } from "react";
import Image from "next/image";

import { getStoreSettings } from "@/lib/settings";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const { storeName, logoUrl } = await getStoreSettings();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        {logoUrl && (
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-border">
            <Image src={logoUrl} alt={storeName} width={64} height={64} className="size-full object-contain" />
          </div>
        )}
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-semibold">Bienvenido</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá para hacer tu pedido
          </p>
        </div>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
