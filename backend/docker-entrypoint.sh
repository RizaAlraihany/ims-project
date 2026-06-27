#!/bin/bash
set -e

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force || true

# Cache Laravel configuration for performance
echo "Caching configuration, routes, and views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Starting application..."
# Execute the command passed to the docker container (apache2-foreground)
exec "$@"
