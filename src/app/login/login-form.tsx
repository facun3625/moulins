"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v2.99h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-2.99c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.27a12 12 0 0 0 0 10.76l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

/** Input con label flotante dentro del campo */
function FloatingInput({
  id,
  label,
  type = "text",
  required,
  value,
  onChange,
  minLength,
  suffix,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  minLength?: number;
  suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const lifted = focused || hasValue;

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-4 transition-all duration-150 select-none",
          lifted
            ? "top-2 text-[10px] font-medium text-muted-foreground"
            : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground",
        )}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "peer w-full rounded-xl border bg-background px-4 pb-2.5 pt-6 text-sm text-foreground outline-none transition-colors",
          "border-border focus:border-primary focus:ring-2 focus:ring-primary/20",
          suffix && "pr-10",
        )}
        autoComplete={type === "password" ? "current-password" : undefined}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
      )}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error("Email o contraseña incorrectos");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      toast.error(data.error ?? "No se pudo crear la cuenta");
      return;
    }

    const result = await signIn("credentials", {
      email: registerEmail,
      password: registerPassword,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error("Cuenta creada, pero no se pudo iniciar sesión");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Google */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 rounded-xl py-5"
        onClick={() => signIn("google", { callbackUrl })}
      >
        <GoogleIcon className="size-4" />
        Continuar con Google
      </Button>

      {/* Divisor */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        o con tu email
        <span className="h-px flex-1 bg-border" />
      </div>

      <Tabs defaultValue="login">
        <TabsList className="grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="login" className="rounded-lg">Ingresar</TabsTrigger>
          <TabsTrigger value="register" className="rounded-lg">Crear cuenta</TabsTrigger>
        </TabsList>

        {/* LOGIN */}
        <TabsContent value="login">
          <form onSubmit={handleLogin} className="flex flex-col gap-3 pt-1">
            <FloatingInput
              id="login-email"
              label="Email"
              type="email"
              required
              value={loginEmail}
              onChange={setLoginEmail}
            />
            <div className="flex flex-col gap-1.5">
              <FloatingInput
                id="login-password"
                label="Contraseña"
                type="password"
                required
                value={loginPassword}
                onChange={setLoginPassword}
              />
              <Link
                href="/recuperar-contrasena"
                className="self-end text-xs text-muted-foreground"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="mt-1 w-full rounded-full"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </TabsContent>

        {/* REGISTRO */}
        <TabsContent value="register">
          <form onSubmit={handleRegister} className="flex flex-col gap-3 pt-1">
            <FloatingInput
              id="register-name"
              label="Nombre"
              required
              value={registerName}
              onChange={setRegisterName}
            />
            <FloatingInput
              id="register-email"
              label="Email"
              type="email"
              required
              value={registerEmail}
              onChange={setRegisterEmail}
            />
            <FloatingInput
              id="register-password"
              label="Contraseña"
              type="password"
              required
              minLength={6}
              value={registerPassword}
              onChange={setRegisterPassword}
            />
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="mt-1 w-full rounded-full"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
