import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { ProfileForm } from "./profile-form";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/perfil");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  return (
    <div className="flex flex-1 flex-col">
      <StoreHero />
      <main className="relative z-1 -mt-6 mx-5 flex flex-1 flex-col gap-6 rounded-t-3xl bg-background px-4 py-6 lg:-mt-32 lg:mx-auto lg:w-full lg:max-w-2xl lg:shadow-2xl">
        <h1 className="text-xl font-semibold">Mi perfil</h1>
        <ProfileForm
          user={{
            name: user.name ?? "",
            email: user.email,
            phone: user.phone ?? "",
            address: user.address ?? "",
            image: user.image,
          }}
        />
      </main>
      <StoreFooter />
    </div>
  );
}
