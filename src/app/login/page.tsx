import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold">Bienvenido</h1>
        <p className="text-sm text-muted-foreground">
          Ingresá para hacer tu pedido
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
