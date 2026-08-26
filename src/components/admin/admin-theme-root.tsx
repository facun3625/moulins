"use client";

import { createContext, useContext, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const AdminThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}>({
  theme: "dark",
  toggleTheme: () => {},
  containerRef: { current: null },
});

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

export function AdminThemeRoot({
  children,
  fontFamily,
}: {
  children: React.ReactNode;
  fontFamily: string;
}) {
  const [theme, setTheme] = useState<Theme>("dark");
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme, containerRef }}>
      <div
        ref={containerRef}
        className={cn("flex flex-1 h-[100dvh] overflow-hidden bg-background text-foreground", theme === "dark" && "dark")}
        style={
          {
            "--font-sans": fontFamily,
            fontFamily: "var(--font-sans)",
            "--text-xs": "0.6875rem",
            "--text-sm": "0.75rem",
            "--text-base": "0.875rem",
            "--text-lg": "1rem",
            "--text-xl": "1.125rem",
            "--text-2xl": "1.375rem",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}
