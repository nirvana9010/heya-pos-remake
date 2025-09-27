#!/bin/bash
docker run --rm \
  --network host \
  -v $(pwd):/backup \
  -e PGPASSWORD='cUWfqrUuuKlcnDWT' \
  postgres:17-alpine \
  pg_dump \
    -h 127.0.0.1 \
    -p 6433 \
    -U postgres \
    --format=custom \
    --no-owner \
    --dbname=postgres \
    --file=/backup/fly-backup.dump
