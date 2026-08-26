"use client";

import {
  UtensilsCrossed,
  ChefHat,
  Soup,
  Salad,
  Sandwich,
  Pizza,
  Hamburger,
  Beef,
  Drumstick,
  Fish,
  Shrimp,
  Egg,
  EggFried,
  Croissant,
  Wheat,
  LeafyGreen,
  Carrot,
  Citrus,
  Apple,
  Cherry,
  Grape,
  Popcorn,
  Cake,
  CakeSlice,
  Cookie,
  Donut,
  IceCreamCone,
  Candy,
  Coffee,
  CupSoda,
  Milk,
  BottleWine,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { CategoryIconName } from "@/lib/category-icons";

const ICON_MAP: Record<CategoryIconName, LucideIcon> = {
  UtensilsCrossed,
  ChefHat,
  Soup,
  Salad,
  Sandwich,
  Pizza,
  Hamburger,
  Beef,
  Drumstick,
  Fish,
  Shrimp,
  Egg,
  EggFried,
  Croissant,
  Wheat,
  LeafyGreen,
  Carrot,
  Citrus,
  Apple,
  Cherry,
  Grape,
  Popcorn,
  Cake,
  CakeSlice,
  Cookie,
  Donut,
  IceCreamCone,
  Candy,
  Coffee,
  CupSoda,
  Milk,
  BottleWine,
};

export function CategoryIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && ICON_MAP[name as CategoryIconName]) || UtensilsCrossed;
  return <Icon className={cn("size-5", className)} strokeWidth={1.75} />;
}
