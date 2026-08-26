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
- `SMTP_HOST/PORT/USER/PASS/FROM` — mail de confirmación de pedido. Si se
  dejan vacías, la app sigue funcionando pero no manda mails.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — credenciales del admin que
  crea `prisma/seed.ts`. **Sin esto, el seed usa `admin@pedidos.local` /
  `admin123` por default — hay que fijar valores propios antes de correr el
  seed contra la base de producción.**

## Deploy al VPS

Sigue el patrón del resto de las apps del servidor (PM2 + Postgres en un
contenedor Docker suelto, Nginx + Let's Encrypt adelante) — pasos genéricos
en la guía interna del VPS. Puntos específicos de esta app:

- Elegir el próximo puerto libre de app y de DB (ver tabla de la guía).
- Migraciones: usar `npx prisma migrate deploy`, no `prisma db push` — esta
  app ya tiene historial de migraciones en `prisma/migrations/`, y mezclar
  `db push` con eso puede generar drift.
- Correr el seed una sola vez, después de fijar `SEED_ADMIN_EMAIL` /
  `SEED_ADMIN_PASSWORD` en el `.env` del servidor.
- Nginx: agregar `client_max_body_size 20M` (o más) al bloque — el checkout
  sube comprobantes de transferencia como archivo.
