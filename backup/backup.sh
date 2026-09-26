#!/bin/sh

DATE=$(date +"%Y-%m-%d_%H-%M-%S")

pg_dump \
    -h postgres \
    -U "$POSTGRES_USER" \
    "$POSTGRES_DB" \
    > "/backup/inventory_$DATE.sql"

echo "Backup created: inventory_$DATE.sql"