mkdir -p redis-conf
export $(cat .env | xargs)
echo "requirepass $REDIS_PASSWORD" > redis-conf/redis.conf

docker compose -p mwgg up -d

cp misc/db.sql data/pg
docker exec -e PGPASSWORD=$POSTGRES_PASSWORD -i mwgg-mwgg-postgres-1 psql --username=postgres -d Mouthwash -f /var/lib/postgresql/data/db.sql
rm data/pg/db.sql