import { cn } from "@/lib/utils";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { RichText } from "@/components/catalog/rich-text";
import { AboutGallery } from "@/components/catalog/about-gallery";
import { getAboutContent } from "@/lib/about";
import { getStoreSettings } from "@/lib/settings";

export default async function SobreNosotrosPage() {
  const [content, { storeName }] = await Promise.all([
    getAboutContent(),
    getStoreSettings(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <StoreHero />
      <main className="relative z-1 -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background lg:-mt-32 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:shadow-2xl">
        <div className="flex flex-col gap-10 px-4 py-10 lg:px-8 lg:py-14">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 text-center">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">
              Nuestra historia
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              Sobre {storeName}
            </h1>
            <span className="mx-auto h-1 w-12 rounded-full bg-primary" />
          </div>

          {content.text ? (
            <div
              className={cn(
                "mx-auto w-full rounded-3xl bg-muted/40 p-6 text-left text-sm leading-relaxed text-muted-foreground lg:p-10 lg:text-base",
                content.columns ? "max-w-4xl" : "max-w-3xl",
              )}
            >
              <RichText html={content.text} columns={content.columns} />
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Todavía no cargamos esta sección.
            </p>
          )}

          {content.media.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-center text-lg font-semibold text-foreground lg:text-left">
                Momentos {storeName}
              </h2>
              <AboutGallery media={content.media} />
            </div>
          )}
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
