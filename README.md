# Moulins — app de pedidos

Next.js 16 + Prisma + Postgres. Panel de admin en `/admin`, storefront en `/`.

## Desarrollo local

```bash
docker compose up -d db      # levanta Postgres en localhost:5442
cp .env.example .env         # completá DATABASE_URL, AUTH_SECRET, etc.
npm install
npx prisma migrate dev       # aplica el schema
npm run dev
```

## Variables de entorno

Ver `.env.example`. Resumen:

- `DATABASE_URL` — requerida.
- `AUTH_SECRET` — requerida (`openssl rand -base64 32`).
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — login con Google. Agregar
  `https://<dominio>/api/auth/callback/google` como redirect URI autorizado
  en Google Cloud Console.
- SMTP (mail de confirmación de pedido) **no** se configura por env var —
  se carga desde `/admin/configuracion` → pestaña "Mail". Sin configurar,
  la app sigue funcionando pero no manda mails.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — credenciales del admin que
  crea `prisma/seed.ts`. **Sin esto, el seed usa `admin@pedidos.local` /
  `admin123` por default — hay que fijar valores propios antes de correr el
  seed contra la base de producción.**

## Deploy al VPS

Sigue el patrón del resto de las apps del servidor (PM2 + Postgres en un
contenedor Docker suelto, Nginx + Let's Encrypt adelante) — pasos genéricos
en la guía interna del VPS. Puntos específicos de esta app:

- Elegir el próximo puerto libre de app y de DB (ver tabla de la guía).
- Migraciones: usar `npm run migrate:deploy` (= `prisma migrate deploy`), no
  `prisma db push` — esta app ya tiene historial de migraciones en
  `prisma/migrations/`, y mezclar `db push` con eso puede generar drift.
- Correr el seed una sola vez, después de fijar `SEED_ADMIN_EMAIL` /
  `SEED_ADMIN_PASSWORD` en el `.env` del servidor.
- Nginx: agregar `client_max_body_size 20M` (o más) al bloque — el checkout
  sube comprobantes de transferencia como archivo, y ya subimos a 20mb el
  límite de los Server Actions en `next.config.ts` para que no rebote antes.
- Los archivos subidos (fotos de producto, comprobantes) quedan en
  `public/uploads/` dentro del proyecto — no hace falta ningún volumen ni
  configuración extra, con PM2 corriendo directo sobre el filesystem del
  VPS ya persisten solos entre deploys (`git pull` nunca borra archivos sin
  trackear).

### Actualizaciones

Con la app ya registrada en PM2 como `moulins`, ejecutar desde el repositorio:

```bash
npm run deploy
```

El script actualiza `main`, instala las dependencias del lockfile, genera el
cliente de Prisma, aplica las migraciones, compila y recién entonces reinicia
PM2. Se pueden cambiar el proceso y la rama con `PM2_APP_NAME` y
`DEPLOY_BRANCH`, respectivamente.
