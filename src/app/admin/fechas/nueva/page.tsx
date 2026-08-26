import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDeliveryDate } from "../actions";

export default function NewDeliveryDatePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nueva venta programada</h1>

      <form action={createDeliveryDate} className="flex max-w-2xl flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Fecha de entrega/retiro</Label>
            <Input id="date" name="date" type="date" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="capacity">Capacidad máxima de pedidos (opcional)</Label>
            <Input id="capacity" name="capacity" type="number" min="1" step="1" placeholder="Sin límite" />
            <p className="text-xs text-muted-foreground">
              Cuando se alcanza, la fecha deja de mostrarse aunque siga abierta.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="orderOpenAt">Empezamos a tomar pedidos (opcional)</Label>
            <Input id="orderOpenAt" name="orderOpenAt" type="datetime-local" />
            <p className="text-xs text-muted-foreground">
              Si lo dejás vacío, se toman pedidos desde ahora mismo.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cutoffAt">Dejamos de tomar pedidos (opcional)</Label>
            <Input id="cutoffAt" name="cutoffAt" type="datetime-local" />
            <p className="text-xs text-muted-foreground">
              Después de esta hora no se van a poder hacer más pedidos para esta venta.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea id="notes" name="notes" rows={2} />
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Crear y cargar stock
          </Button>
          <Button type="button" variant="outline" render={<Link href="/admin/fechas" />}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
