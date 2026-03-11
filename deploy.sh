#!/bin/bash

echo "=== Aifacescan SDK Deployment ==="

if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

echo "Installing dependencies..."
npm install

if [ ! -f .env ]; then
    echo "Warning: .env file not found!"
    echo "Please create .env file before running"
    exit 1
fi

echo "Stopping old process..."
pm2 stop aifacescan-sdk 2>/dev/null || true
pm2 delete aifacescan-sdk 2>/dev/null || true

echo "Starting application..."
pm2 start ecosystem.config.js

pm2 save
t
pm2 startup

echo ""
echo "=== Deployment Complete ==="
echo "Run 'pm2 logs aifacescan-sdk' to view logs"
echo "Run 'pm2 status' to check status"
echo "Run 'pm2 restart aifacescan-sdk' to restart"
echo "Run 'pm2 stop aifacescan-sdk' to stop"
