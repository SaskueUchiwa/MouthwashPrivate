import {
    EventListener,
    HindenburgPlugin,
    Room,
    RoomCreateEvent,
    RoomDestroyEvent,
    RoomGameEndEvent,
    RoomGameStartEvent,
    Worker,
    WorkerPlugin
} from "@skeldjs/hindenburg";

import pg from "pg";
import * as crypto from "crypto";

import dotenv from "dotenv";
dotenv.config();

import { MouthwashAuthPlugin } from "hbplugin-mouthwashgg-auth";
import { MouthwashApiPlugin } from "hbplugin-mouthwashgg-api";

export interface MouthwashggMetricsPluginConfig {

}

@HindenburgPlugin("hbplugin-mouthwashgg-metrics")
export class MouthwashggMetricsPlugin extends WorkerPlugin {
    protected _authApi?: MouthwashAuthPlugin;
    protected postgresClient: pg.Client;

    lobbyIds: WeakMap<Room, string>;
    lobbyCurrentGameIds: WeakMap<Room, string>;
    
    constructor(public readonly worker: Worker, public readonly config: MouthwashggMetricsPluginConfig) {
        super(worker, config);

        const [ hostName, port ] = (process.env.MWGG_METRICS_POSTGRES_HOST as string).split(":");
        this.postgresClient = new pg.Client({
            user: process.env.MWGG_METRICS_POSTGRES_USER,
            host: hostName,
            port: parseInt(port),
            database: process.env.MWGG_METRICS_POSTGRES_DATABASE,
            password: process.env.MWGG_METRICS_POSTGRES_PASSWORD
        });

        this.lobbyIds = new WeakMap;
        this.lobbyCurrentGameIds = new WeakMap;
    }
    
    get authApi() {
        this._authApi ??= this.worker.loadedPlugins.get("hbplugin-mouthwashgg-auth")?.pluginInstance as MouthwashAuthPlugin|undefined;
        return this._authApi;
    }

    async onPluginLoad() {
        await this.postgresClient.connect();
        this.logger.info("Connected to postgres database");
    }

    @EventListener()
    async onRoomCreate(ev: RoomCreateEvent) {
        if (!this.authApi)
            return;

        const lobbyId = crypto.randomUUID();
        const connectionUser = ev.room.createdBy ? await this.authApi.getConnectionUser(ev.room.createdBy) : undefined;
        if (!connectionUser) {
            if (ev.room.createdBy) {
                this.logger.warn("Room %s created but could not get user (connection %s)", ev.room, ev.room.createdBy);
            } else {
                this.logger.warn("Room %s created but could not get user (no connection)", ev.room);
            }
            return;
        }

        const { rows: createdLobbies } = await this.postgresClient.query(`
            INSERT INTO lobby(id, creator_id, created_at, host_server_id, destroyed_at)
            VALUES($1, $2, NOW(), $3, NULL)
            RETURNING *
        `, [ lobbyId, connectionUser.id, this.worker.config.nodeId ]);

        if (createdLobbies.length > 0) {
            this.lobbyIds.set(ev.room, lobbyId);
            this.logger.info("Lobby recorded for room %s (id %s, created by %s)", ev.room, lobbyId, connectionUser.display_name);
        } else {
            this.logger.warn("Failed to record lobby for room %s, no records updated", ev.room);
        }
    }

    @EventListener()
    async onRoomDestroy(ev: RoomDestroyEvent<Room>) {
        const lobbyId = this.lobbyIds.get(ev.room as Room);
        if (!lobbyId) {
            this.logger.warn("Room %s destroyed, but no lobby id was recorded for it", ev.room);
            return;
        }

        const { rows: updatedLobbies } = await this.postgresClient.query(`
            UPDATE lobby
            SET destroyed_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [ lobbyId ]);

        if (updatedLobbies.length > 0) {
            this.logger.info("Lobby record updated for destroyed room %s (id %s)", ev.room, lobbyId);
        } else {
            this.logger.warn("Failed to record lobby for room %s, no records updated", ev.room);
        }
    }

    @EventListener()
    async onGameStarted(ev: RoomGameStartEvent<Room>) {
        const lobbyId = this.lobbyIds.get(ev.room as Room);
        if (!lobbyId) {
            this.logger.warn("Game started in room %s, but no lobby id was recorded for it", ev.room);
            return;
        }

        const api = ev.room.loadedPlugins.get("hbplugin-mouthwashgg-api")?.pluginInstance as MouthwashApiPlugin;
        if (!api) {
            this.logger.warn("No API plugin available in room %s", ev.room);
            return;
        }

        const gameSettings: any = {};
        for (const [ gameOptionPath, gameOptionValue ] of api.gameOptions.cachedValues) {
            gameSettings[gameOptionPath] = gameOptionValue.toJSON();
        }

        const hostPlayer = ev.room.host;
        const hostConnection = hostPlayer ? ev.room.getConnection(ev.room.host) : undefined;
        const hostConnectionUser = hostConnection ? await this.authApi?.getConnectionUser(hostConnection) : undefined;

        const gameId = crypto.randomUUID();

        const { rows: createdGames } = await this.postgresClient.query(`
            INSERT INTO game(id, lobby_id, started_by, game_settings, started_at, ended_at)
            VALUES($1, $2, $3, $4, NOW(), NULL)
            RETURNING *
        `, [ gameId, lobbyId, hostConnectionUser ? hostConnectionUser.id : null, gameSettings ]);

        const userIds = [];
        const params = [];
        for (const [ , connection ] of ev.room.connections) {
            const connectionUser = await this.authApi?.getConnectionUser(connection);
            if (!connectionUser) {
                this.logger.warn("No connection user for client %s in room %s", connection, ev.room);
                continue;
            }
            userIds.push(connectionUser.id);
            params.push(crypto.randomUUID(), gameId, connectionUser.id);
        }
        await this.postgresClient.query(`
            INSERT INTO player(id, game_id, user_id)
            VALUES ${userIds.map((userId, i) => `($${(i * 3 + 1)}, $${(i * 3) + 2}, $${(i * 3) + 3})`).join(",")}
            RETURNING *
        `, params);

        this.lobbyCurrentGameIds.set(ev.room, gameId);

        if (createdGames.length > 0) {
            this.logger.info("Game record (id %s) created for room %s", gameId, ev.room);
        } else {
            this.logger.info("Failed to create game record for room %s", gameId, ev.room);
        }
    }

    @EventListener()
    async onGameEnded(ev: RoomGameEndEvent<Room>) {
        const lobbyId = this.lobbyIds.get(ev.room as Room);
        if (!lobbyId) {
            this.logger.warn("Game ended in room %s, but no lobby id was recorded for it", ev.room);
            return;
        }

        const gameId = this.lobbyCurrentGameIds.get(ev.room);
        if (!gameId) {
            this.logger.warn("Game ended in room %s, but no game id was recorded for it", ev.room);
            return;
        }

        const { rows: createdGames } = await this.postgresClient.query(`
            UPDATE game
            SET ended_at = NOW()
            WHERE id = $1
        `, [ gameId ]);

        if (createdGames.length > 0) {
            this.logger.info("Updated record for game ended (id %s) for room %s", gameId, ev.room);
        } else {
            this.logger.info("Failed to update record for game ended (id %s) for room %s", gameId, ev.room);
        }
        this.lobbyCurrentGameIds.delete(ev.room);
    }
}

