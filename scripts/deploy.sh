#!/usr/bin/env bash

set -Eeuo pipefail

APP_NAME="${PM2_APP_NAME:-moulins}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ ! -f package-lock.json ]]; then
  echo "Error: no se encontro package-lock.json en $(pwd)." >&2
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Error: PM2 no esta instalado o no esta disponible en PATH." >&2
  exit 1
fi

if ! pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  echo "Error: la app '$APP_NAME' no existe en PM2." >&2
  echo "Registrala una vez y volve a ejecutar este script." >&2
  exit 1
fi

echo "==> Actualizando origin/$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Instalando dependencias"
npm ci

echo "==> Generando Prisma Client"
npx prisma generate

echo "==> Aplicando migraciones"
npm run migrate:deploy

echo "==> Generando build de produccion"
npm run build

echo "==> Reiniciando $APP_NAME"
pm2 restart "$APP_NAME" --update-env

echo "==> Estado final"
pm2 status "$APP_NAME"
