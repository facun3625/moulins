import type { NextAuthConfig, DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
  }
}

// Config compartida entre el runtime completo (auth.ts) y el proxy, que
// corre en Edge y no puede cargar Prisma/bcrypt.
export default {
  providers: [],
  // Sin esto, Auth.js rechaza el request con "UntrustedHost" en producción
  // atrás de un reverse proxy propio (Nginx/Caddy en el VPS) — solo confía
  // en el host automáticamente en plataformas como Vercel. El proxy es
  // quien ya valida el dominio real (TLS + routing), así que confiar en el
  // header Host acá es seguro para este esquema de deploy.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: Role }).role ?? "CUSTOMER";
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role ?? "CUSTOMER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
