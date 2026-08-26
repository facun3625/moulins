import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type AboutMediaItem = { id: string; type: "IMAGE" | "VIDEO"; url: string };
export type AboutContent = { text: string | null; columns: boolean; media: AboutMediaItem[] };

export const getAboutContent = cache(async (): Promise<AboutContent> => {
  const [textSetting, columnsSetting, media] = await Promise.all([
    prisma.settings.findUnique({ where: { key: "about_text" } }),
    prisma.settings.findUnique({ where: { key: "about_text_columns" } }),
    prisma.aboutMedia.findMany({ orderBy: { order: "asc" } }),
  ]);
  return {
    text: textSetting?.value ?? null,
    columns: columnsSetting?.value === "true",
    media: media.map((m) => ({ id: m.id, type: m.type, url: m.url })),
  };
});
