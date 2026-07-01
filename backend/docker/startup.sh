#!/bin/bash
set -e

cd /var/www/html

echo "Running database migrations..."
php artisan migrate --force || true

echo "Caching config, routes, views..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "Startup complete."
