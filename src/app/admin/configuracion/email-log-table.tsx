import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EMAIL_TYPE_LABELS, getRecentEmailLogs } from "@/lib/email-log";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export async function EmailLogTable() {
  const logs = await getRecentEmailLogs();

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Mails enviados</h2>
        <p className="text-xs text-muted-foreground">
          Los últimos {logs.length > 0 ? logs.length : ""} intentos de envío — confirmaciones de
          pedido, recuperación de contraseña y pruebas. No depende de tu proveedor SMTP para
          verse.
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Todavía no se envió ningún mail.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead>Para</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cuándo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge
                    variant={log.success ? "default" : "secondary"}
                    className={log.success ? "" : "text-destructive"}
                    title={log.error ?? undefined}
                  >
                    {log.success ? "Enviado" : "Falló"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-48 truncate">{log.to}</TableCell>
                <TableCell className="max-w-64 truncate">{log.subject}</TableCell>
                <TableCell className="text-muted-foreground">{EMAIL_TYPE_LABELS[log.type as keyof typeof EMAIL_TYPE_LABELS] ?? log.type}</TableCell>
                <TableCell className="text-muted-foreground">{dateFormatter.format(log.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
