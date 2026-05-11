#!/bin/bash
set -e  # Salir en primer error

cd /home/administrator/checkout

echo "=== Pulling latest code ==="
git pull origin main

echo "=== Installing dependencies ==="
npm install

echo "=== Building application ==="
npm run build

echo "=== Restarting PM2 ==="
pm2 restart app
pm2 save
