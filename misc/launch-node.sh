docker build -f Dockerfile.Node . --tag mouthwashgg-node
docker run -d -e HINDENBURG_CLI_ARGS="--socket.port $2 --socket.ip 'auto' --nodeId $1" --env-file .env --network mwgg_app mouthwashgg-node