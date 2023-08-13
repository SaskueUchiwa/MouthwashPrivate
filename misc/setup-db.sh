mkdir -p data/pg
cp misc/db.sql data/pg
docker compose -f db.compose.yml -p mwgg-db up -d
docker exec -e PGPASSWORD=$POSTGRES_PASSWORD -i mwgg-mwgg-postgres-1 psql --username=postgres -d Mouthwash -f /var/lib/postgresql/data/db.sql
rm data/pg/db.sql
docker compose -p mwgg-db down