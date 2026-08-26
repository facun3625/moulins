"use client";

import { useRef } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import type { AboutMediaItem } from "@/lib/about";

export function AboutGallery({ media }: { media: AboutMediaItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const showArrows = media.length > 3;

  function scrollByAmount(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {media.map((m) => (
          <div
            key={m.id}
            className="relative aspect-[4/5] w-[68%] shrink-0 snap-start overflow-hidden rounded-2xl bg-muted shadow-sm sm:w-[42%] lg:w-[30%]"
          >
            {m.type === "IMAGE" ? (
              <Image
                src={m.url}
                alt=""
                fill
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 42vw, 68vw"
                className="object-cover"
              />
            ) : (
              <video src={m.url} controls className="size-full object-cover" />
            )}
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            className="absolute top-1/2 left-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background"
          >
            <ChevronLeftIcon className="size-4" />
            <span className="sr-only">Anterior</span>
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background"
          >
            <ChevronRightIcon className="size-4" />
            <span className="sr-only">Siguiente</span>
          </button>
        </>
      )}
    </div>
  );
}
