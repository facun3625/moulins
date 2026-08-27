import { requireAdmin } from "@/lib/require-admin";
import { ServiceEditor } from "../service-editor";
export default async function NewServicePage() { await requireAdmin(); return <div className="flex flex-col gap-4"><h1 className="text-xl font-semibold">Nuevo servicio</h1><ServiceEditor /></div>; }
