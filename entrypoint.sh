#!/usr/bin/env bash
set -e

# Default to internal postgres if not explicitly configured or set to localhost
if [[ -z "$DATABASE_URL" || "$DATABASE_URL" == *"127.0.0.1"* || "$DATABASE_URL" == *"localhost"* ]]; then
    echo "==> Starting embedded PostgreSQL server..."
    /etc/init.d/postgresql start

    # Wait for PostgreSQL to be ready
    for i in {1..30}; do
        if su - postgres -c "pg_isready" > /dev/null 2>&1; then
            break
        fi
        echo "Waiting for PostgreSQL to be ready ($i/30)..."
        sleep 1
    done

    echo "==> Ensuring PostgreSQL database and user exist..."
    su - postgres -c "psql" <<'EOF'
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'finsight_user') THEN
      CREATE ROLE finsight_user LOGIN PASSWORD 'finsight_secret';
   END IF;
END
$do$;
EOF

    su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname = 'finsight'\" | grep -q 1 || psql -c \"CREATE DATABASE finsight OWNER finsight_user;\""
    su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE finsight TO finsight_user;\""
    su - postgres -c "psql -d finsight -c \"GRANT ALL ON SCHEMA public TO finsight_user;\""
    
    export DATABASE_URL="postgresql://finsight_user:finsight_secret@127.0.0.1:5432/finsight"
    echo "==> Embedded PostgreSQL is ready at $DATABASE_URL"
else
    echo "==> Using external DATABASE_URL: $DATABASE_URL"
fi

echo "==> Starting FinSight AI API server on port ${PORT:-8000}..."
exec uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8000}"
