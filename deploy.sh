#!/bin/bash

cd /var/www/station

# Pull latest code
git pull origin main

# Install dependencies (only if package.json changed)
npm install

# Build the application
npm run build

# Restart PM2
pm2 restart station

# Save PM2 state
pm2 save

echo "Deployment completed at $(date)" >> /var/www/station/deploy.log
