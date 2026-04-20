#!/bin/bash

cd /home/administrator/checkout

# Pull latest code
git pull origin main

# Install dependencies (only if package.json changed)
npm install

# Build the application
npm run build

# Generate Prisma client
npm run db:generate

# Push database schema changes
npm run db:push

# Restart PM2
pm2 restart app

# Save PM2 state
pm2 save

echo "Deployment completed at $(date)" >> /home/administrator/checkout/deploy.log
