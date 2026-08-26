import type { Metadata, Viewport } from "next";
import { Barlow, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { StoreSettingsProvider } from "@/lib/store-settings-context";
import { getStoreSettings } from "@/lib/settings";

// El layout raíz necesita la DB en cada request (nombre/branding de la
// tienda) y no tiene ningún estado sensato "sin datos" para prerenderizar
// como estática — sin esto, `next build` intenta generar páginas en build
// time y falla ahí donde no hay Postgres disponible (ej. la imagen Docker).
export const dynamic = "force-dynamic";

const barlow = Barlow({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getStoreSettings();
  return {
    title: storeName,
    description: `Encargá tu comida en ${storeName}`,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const htmlClassName = `${barlow.variable} ${geistMono.variable} h-full antialiased`;
  const storeSettings = await getStoreSettings();

  return (
    <html lang="es" className={htmlClassName}>
      <body className="min-h-full flex flex-col">
        <StoreSettingsProvider value={storeSettings}>
          <Providers>{children}</Providers>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
