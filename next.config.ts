import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida standalone: `next build` copia solo los node_modules que hacen
  // falta para correr en runtime, así la imagen de Docker queda liviana.
  output: "standalone",
};

export default nextConfig;
