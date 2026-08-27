import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { RichText } from "@/components/catalog/rich-text";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { ServiceCarousel } from "../service-carousel";
import { ServiceInquiryForm } from "../service-inquiry-form";

export default async function ServicesPage({ params }: { params: Promise<{ id?: string[] }> }) {
  const { id } = await params;
  const services = await prisma.service.findMany({
    where: { active: true },
    include: { fields: { orderBy: { order: "asc" } }, images: { orderBy: { order: "asc" } } },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  if (!services.length) notFound();
  if (!id?.length) redirect(`/servicios/${services[0].id}`);
  const current = services.find((service) => service.id === id[0]);
  if (!current || id.length > 1) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <StoreHero />
      <main className="relative z-1 -mt-6 flex-1 rounded-t-3xl bg-background lg:-mt-32 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:shadow-2xl">
        <div className="grid gap-7 px-4 py-9 lg:grid-cols-[220px_1fr] lg:px-8 lg:py-12">
          <aside className="flex gap-2 overflow-x-auto lg:sticky lg:top-6 lg:flex-col lg:self-start">
            {services.map((service) => (
              <Link key={service.id} href={`/servicios/${service.id}`} className={cn("whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium transition-colors", service.id === current.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted")}>{service.title}</Link>
            ))}
          </aside>

          <div className="flex min-w-0 flex-col gap-10">
            <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
              <section className="min-w-0 rounded-2xl bg-muted/30 p-5 lg:p-7">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Servicios</p>
                <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{current.title}</h1>
                <RichText html={current.description} columns={current.descriptionColumns} className="mt-5 leading-relaxed text-muted-foreground" />
              </section>
              <ServiceInquiryForm serviceId={current.id} title={current.formTitle} submitLabel={current.submitLabel} fields={current.fields} />
            </div>
            <ServiceCarousel images={current.images} title={current.title} />
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
