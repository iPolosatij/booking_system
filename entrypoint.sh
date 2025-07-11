#!/bin/sh

set -e

export PGPASSWORD=$DB_PASSWORD

echo "Waiting for PostgreSQL..."
until pg_isready -h db -U postgres -d booking -t 1; do
  sleep 2
done

echo "Applying database migrations..."
psql -h db -U postgres -d booking -f /app/migrations/001_init.sql

echo "Starting application..."
exec ./booking-system