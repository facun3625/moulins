import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Foto de perfil de Google (login con Google) — sin esto, next/image
    // rechaza cualquier URL externa que no esté en esta lista.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
  experimental: {
    // Default de Next es 1MB — una foto de celular (comprobante de
    // transferencia, foto de producto) lo pasa fácil. Tiene que ir de la
    // mano con el client_max_body_size de Nginx (ver README).
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
