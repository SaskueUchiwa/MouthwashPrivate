mkdir -p redis_conf
docker compose -p mwgg up -d

echo "require_pass $REDIS_PASSWORD" > redis_conf/redis.conf

cp misc/db.sql data/pg
export $(cat .env | xargs)
docker exec -e PGPASSWORD=$POSTGRES_PASSWORD -i mwgg-mwgg-postgres-1 psql --username=postgres -d Mouthwash -f /var/lib/postgresql/data/db.sql
rm data/pg/db.sql