# Cambios de esta sesión — resumen para portar a otra app

Sin commitear todavía. 39 archivos modificados + 12 nuevos + 3 migraciones de Prisma.
Organizado por feature, con los archivos clave y el modelo de datos de cada uno para poder recrearlo en otro proyecto.

---

## 1. Mail de confirmación de pedido — rediseño completo

**Qué hace:** template de mail con header (logo + nombre de la tienda), mensaje editable con campos dinámicos, detalle del pedido, footer con datos de contacto, y una línea de marca "Armá tu propia tienda con Yaa".

**Editor con vista previa en vivo** en Configuración → Mail:
- Textarea con chips para insertar `{{nombre}}`, `{{pedido}}`, `{{total}}`, `{{tienda}}` — se reemplazan por el dato real al enviar.
- Panel derecho con iframe que renderiza el mail en vivo con datos de ejemplo mientras escribís.
- Botón "Mandar mensaje de prueba" (deshabilitado si no hay SMTP configurado).
- Sub-tab "Enviados": historial persistente de cada mail (a quién, asunto, tipo, éxito/error, fecha) — tabla `EmailLog`.

**Archivos clave:**
- `src/lib/email-templates.ts` — `orderConfirmationEmail()`, `applyOrderEmailTokens()`, `SAMPLE_ORDER_EMAIL_DATA`, `ORDER_EMAIL_TOKENS`
- `src/lib/mailer.ts` — `sendMail()` ahora loguea cada intento en `EmailLog` (parámetro `type`)
- `src/lib/email-log.ts` — `getRecentEmailLogs()`, `EMAIL_TYPE_LABELS`
- `src/app/admin/configuracion/email-editor.tsx`, `email-log-table.tsx`
- `src/lib/settings.ts` — `getOrderEmailMessage()`

**Modelo Prisma nuevo:**
```prisma
model EmailLog {
  id        String   @id @default(cuid())
  to        String
  subject   String
  type      String   // "ORDER_CONFIRMATION" | "PASSWORD_RESET" | "TEST_SMTP" | "TEST_ORDER"
  success   Boolean
  error     String?
  createdAt DateTime @default(now())
}
```

**Gotcha:** el logo de Yaa en el mail necesita una URL absoluta (`appUrl`) porque un cliente de correo no tiene "página actual" — se arma con `headers()` en el server action que envía el mail.

---

## 2. Estados de pedido simplificados

**Qué hace:** de 4 pasos (Confirmado → Preparación → Listo → Entregado) a 3 (Confirmado, En preparación, Entregado), reasignables libremente entre sí en cualquier sentido — incluso desde Entregado hacia atrás. Antes solo se podía avanzar de a un paso.

**Color por estado** para escanear la tabla de un vistazo: Confirmado azul, En preparación ámbar, Entregado verde, Cancelado rojo, En revisión violeta.

**Archivos clave:**
- `src/lib/order-status.ts` — `ORDER_STATUS_COLORS`
- `src/app/admin/pedidos/order-status-select.tsx`, `src/app/admin/pedidos/[id]/order-status-actions.tsx`, `[id]/actions.ts` — `ACTIVE_STATUSES`, `CANCELLABLE_FROM`

---

## 3. Estadísticas — sección nueva completa

**Qué hace:** `/admin/estadisticas`, tres tabs:

- **Ventas:** filtros por período (7/30/90 días, este mes, mes pasado, todo) + tipo de entrega + medio de pago. KPIs (ventas totales, pedidos, ticket promedio, puntos otorgados), gráfico de barras por día/semana/mes (granularidad automática según el rango), desglose por medio de pago y tipo de entrega.
- **Productos:** más vendidos (cantidad e ingresos) y categorías más vendidas, mismo período que Ventas.
- **Clientes:** tabla con pedidos, gastado, ticket promedio, última compra. Filtros: sin comprar hace más de X días, mínimo de pedidos, mínimo gastado, búsqueda. Selección múltiple + botón "Enviar WhatsApp a N clientes".

**Campaña de WhatsApp:** al seleccionar clientes se abre un diálogo con mensaje editable (token `{{nombre}}`) y, por cada cliente, un botón que abre `wa.me` con el mensaje ya cargado — uno por uno, manual (no hay API de WhatsApp Business). Cada envío queda registrado en DB con fecha, visible en la tabla como columna "Último WhatsApp".

**Todo el cálculo (filtros, agregaciones, gráfico) es client-side** sobre el dataset completo — no hay round-trips al server por cada cambio de filtro. Pensado para el volumen de una tienda chica.

**Archivos clave:**
- `src/lib/stats.ts` — tipos `OrderStatsRow`, `CustomerStatsRow`, `DeliveryDateOption`, `COUNTED_ORDER_STATUSES`
- `src/app/admin/estadisticas/page.tsx` — fetch server-side, une pedidos + clientes (incluye cuentas ADMIN que también compraron, no solo CUSTOMER) + WhatsappLog + costos por fecha
- `stats-dashboard.tsx`, `sales-bar-chart.tsx`, `customers-panel.tsx`, `whatsapp-campaign-dialog.tsx`, `delivery-date-result-panel.tsx`, `actions.ts`

**Modelo Prisma nuevo:**
```prisma
model WhatsappLog {
  id        String   @id @default(cuid())
  userId    String
  phone     String
  message   String
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Gotcha real que salió al probar:** "Clientes" filtraba por `role: CUSTOMER` y una cuenta que compró de verdad pero tenía rol ADMIN (el dueño probando) desaparecía de las estadísticas con 0 resultados pese a tener pedidos reales. Fix: incluir cualquier cuenta con `role === "CUSTOMER" || orderCount > 0`.

---

## 4. Costos por fecha + resultado neto

**Qué hace:** dentro de cada fecha de entrega (`/admin/fechas/[id]`), nueva tab "Costos" — opcional, cargás costos sueltos (nombre + monto) que se guardan al toque, sin depender del botón "Guardar" general de la fecha.

En Estadísticas → Ventas aparece "Resultado por fecha de entrega": elegís una fecha puntual y ves Ventas de esa fecha − Costos cargados = Resultado (verde si positivo, rojo si negativo), con el detalle de cada costo.

**Archivos clave:**
- `src/app/admin/fechas/[id]/costs-tab.tsx`
- `src/app/admin/fechas/actions.ts` — `addDeliveryDateCost()`, `deleteDeliveryDateCost()`
- `src/app/admin/estadisticas/delivery-date-result-panel.tsx`

**Modelo Prisma nuevo:**
```prisma
model DeliveryDateCost {
  id             String   @id @default(cuid())
  deliveryDateId String
  label          String
  amount         Decimal  @db.Decimal(10, 2)
  createdAt      DateTime @default(now())
  deliveryDate DeliveryDate @relation(fields: [deliveryDateId], references: [id], onDelete: Cascade)
}
```

---

## 5. Avisos por Telegram

**Qué hace:** manda un mensaje al grupo de Telegram del equipo apenas se crea un pedido (efectivo o transferencia, cualquier estado inicial) — fire-and-forget, nunca bloquea ni rompe la venta si Telegram falla.

**Configuración → Telegram:** token del bot (enmascarado) + chat ID, botón "Guardar" y "Mandar mensaje de prueba" (lee de los inputs sin guardar primero, igual que el de SMTP).

**Archivos clave:**
- `src/lib/telegram.ts` — `sendTelegram()` (POST directo a la Bot API), `buildMessage()`, `notifyNewOrder()`
- `src/lib/settings.ts` — `getTelegramSettings()`
- `src/app/admin/configuracion/actions.ts` — `updateTelegramSettings`, `removeTelegramSettings`, `sendTestTelegram`
- `src/app/admin/configuracion/telegram-settings-form.tsx`
- Se dispara desde `src/app/checkout/actions.ts` → `placeOrder`, sin `await` bloqueante, en un `try/catch` separado del mail

**Setup manual (no es código):** crear el bot con @BotFather, agregarlo al grupo, sacar el chat ID mandando un mensaje y abriendo `https://api.telegram.org/bot<TOKEN>/getUpdates`.

---

## 6. Selector de grupo de stock — ya no se puede crear sin querer

**Antes:** el selector de "Stock" al crear/editar un producto tenía una opción "+ Crear grupo nuevo" que, sin querer, generaba grupos duplicados (de ahí productos con nombres tipo "asdfas (copia) (copia)" en la base).

**Ahora:** hay que elegir un grupo que ya exista (`required`, bloquea el submit si no se elige ninguno). Si no hay grupos o hace falta uno nuevo, un link lleva a "Productos → Grupos de stock" para crearlo a propósito, con la cantidad inicial.

**Archivos clave:**
- `src/app/admin/productos/stock-group-picker.tsx` — reescrito, sin la opción inline
- `src/app/admin/productos/actions.ts` — `createProduct`/`saveProduct` ahora exigen `stockGroupId`; `resolveStockGroupId` renombrado a `createStockGroupForCopy`, usado solo por `duplicateProduct` (que sigue creando grupo propio a propósito para no compartir stock con el original)

---

## 7. Sidebar admin — "Productos" desplegable

**Qué hace:** el ítem "Productos" del menú se convierte en un desplegable con tres sub-ítems: Productos, Categorías, Grupos de stock (estos dos últimos abren paneles que ya existían como sheets en la lista de productos, ahora alcanzables desde el menú vía `?panel=categorias` / `?panel=grupos`).

- Se abre solo al entrar a la sección; el admin puede plegarlo a mano sin que se reabra en cada click.
- **Todo el botón es clickeable** para abrir/cerrar (no solo la flechita) — click navega y togglea a la vez.
- Flecha rota con transición 200ms, contenido se expande/colapsa animando `grid-template-rows` (técnica CSS moderna, sin JS de altura medida) + opacidad — "delicado" según el criterio de diseño del proyecto.

**Archivo clave:** `src/components/admin/admin-sidebar.tsx`

**Gotcha de React:** el primer intento usaba `useEffect` + `setState` para auto-expandir al entrar a la sección — el linter (`react-hooks/set-state-in-effect`) lo rechaza por riesgo de cascading renders. Solución: calcular el href activo directamente en el render (`sections.find(...)`) y guardar solo un "override" cuando el admin pliega/expande a mano, sin efecto.

---

## 8. Notificación de stock agotado en el header del admin

**Qué hace:** si alguna fecha abierta tiene un grupo o producto con stock cargado en 0, aparece una pill roja "Sin stock" en el header de admin con un dropdown listando qué fecha y qué está agotado, con link directo a esa fecha.

**Archivos clave:**
- `src/lib/stock-alerts.ts` — `getStockAlerts()`
- `src/components/admin/admin-topbar.tsx`
- `src/app/admin/layout.tsx` — fetch en paralelo con el resto del layout

**Gotcha:** `DropdownMenuLabel` tiene que estar dentro de un `DropdownMenuGroup` (primitiva base-ui) — sin eso tira "MenuGroupContext is missing" en runtime.

---

## 9. Puntos/cupones — un solo cupón canjeado a la vez

**Qué hace:** si el cliente ya tiene un cupón canjeado sin usar (cualquiera), no puede canjear otro hasta usarlo en un pedido. Antes solo se evitaba canjear el *mismo* cupón dos veces, pero se podían acumular varios distintos.

Validado tanto en el cliente (botones deshabilitados + banner explicativo) como en el servidor (probado saltándose el disabled a mano — el server igual lo rechaza).

**Archivos clave:** `src/app/puntos/actions.ts`, `src/app/puntos/page.tsx`

---

## 10. Arreglos de layout / UX puntuales

- **Scroll del admin arreglado de raíz:** `AdminThemeRoot` tenía `flex-1` compitiendo con `h-[100dvh]` porque `body` no tiene altura definida — el navegador terminaba ignorando el 100dvh y estirando todo al alto del contenido, causando que el sidebar/header scrollearan junto con el contenido en vez de quedar fijos. Fix: sacar `flex-1` (no hace falta, el div ya tiene alto explícito). `src/components/admin/admin-theme-root.tsx`.
- **Logout siempre a la tienda, nunca a `/login`:** `signOut({ callbackUrl: "/" })` en vez de `signOut()` sin opciones — antes, si cerrabas sesión desde una página que requiere auth, el middleware te rebotaba a login. `account-menu.tsx`, `admin-topbar.tsx`.
- **Checkout — pantalla de transición:** entre confirmar el pago y llegar al pedido, el carrito se vacía antes de que la navegación termine, mostrando por un instante "Tu carrito está vacío". Fix: flag `orderPlaced` que muestra "Confirmando tu pedido..." con spinner en ese instante. `checkout-form.tsx`.
- **Carrito flotante mobile y drawer tapados por WhatsApp:** padding ajustado en `cart-bar.tsx` (barra inferior del catálogo) y `cart-sheet.tsx` (drawer) para que el botón de WhatsApp no tape el precio/botón de comprar.

---

## Migraciones incluidas

```
prisma/migrations/20260826220734_add_email_log/
prisma/migrations/20260827100528_add_whatsapp_log/
prisma/migrations/20260827103503_add_delivery_date_costs/
```

## Variables de entorno / config nuevas (no son env vars, viven en la tabla `Settings`)

- `order_email_message` — mensaje editable del mail de pedido
- `telegram_bot_token`, `telegram_chat_id`

## Dependencias

No se agregó ninguna dependencia nueva a `package.json` — todo (gráfico de barras, etc.) se hizo a mano para no sumar peso.
