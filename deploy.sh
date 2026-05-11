#!/bin/bash
set -e  # Salir en primer error

cd /home/administrator/checkout

echo "=== Pulling latest code ==="
git pull origin main

echo "=== Installing dependencies ==="
npm install

echo "=== Generating Prisma client ==="
npm run db:generate

echo "=== Building application ==="
npm run build

echo "=== Pushing database schema ==="
npm run db:push

echo "=== Restarting PM2 ==="
pm2 restart app
pm2 save

echo "Deployment completed at $(date)" >> /home/administrator/checkout/deploy.log