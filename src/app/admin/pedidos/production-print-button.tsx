"use client";
import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
export function ProductionPrintButton() { return <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="print:hidden"><PrinterIcon className="size-4" />Imprimir</Button>; }
