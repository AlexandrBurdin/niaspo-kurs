#!/bin/sh

echo "Initializing database..."

python db.py

echo "Starting Gunicorn..."

exec gunicorn \
    --bind 0.0.0.0:5000 \
    app:app