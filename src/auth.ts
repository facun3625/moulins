import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role ?? "CUSTOMER";
        
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, image: true }
          });
          if (dbUser) {
            session.user.name = dbUser.name;
            session.user.image = dbUser.image;
          } else {
            if (token.picture) session.user.image = token.picture;
            if (token.name) session.user.name = token.name;
          }
        } catch (err) {
          // Fallback silencioso
          if (token.picture) session.user.image = token.picture;
          if (token.name) session.user.name = token.name;
        }
      }
      return session;
    }
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Une la cuenta de Google a un usuario que ya se registró con el mismo
      // email por credenciales — Google ya verificó ese email, así que el
      // riesgo habitual (alguien "roba" una cuenta creando el email en el
      // proveedor OAuth) no aplica acá.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
});
