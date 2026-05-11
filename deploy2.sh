#!/bin/bash
set -euo pipefail

APP_DIR="/home/administrator/checkout"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

log() { echo "$LOG_PREFIX === $1 ==="; }
die() { echo "$LOG_PREFIX ERROR: $1" >&2; exit 1; }

cd "$APP_DIR" || die "No se puede acceder a $APP_DIR"

log "Pulling latest code"
git pull origin main

log "Installing dependencies"
npm ci --omit=dev 2>/dev/null || npm install   # ci es más reproducible

log "Generating Prisma client"
npm run db:generate

log "Building application"
npm run build || die "Build falló — abortando sin reiniciar"

# Schema ANTES del restart para evitar ventana de inconsistencia
log "Pushing database schema"
npm run db:push || die "db:push falló — la app sigue corriendo con la versión anterior"

log "Restarting PM2"
pm2 restart app
pm2 save

log "Deploy completado"