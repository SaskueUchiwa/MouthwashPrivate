import { AccountServer } from "../AccountServer";
import { DeclareSafeKeys } from "../types/DeclareSafeKeys";

export interface Game {
    id: string;
    lobby_id: string;
    started_by: string;
    game_settings: any;
    started_at: Date;
    ended_at: Date|null;
}

export interface GameWithPlayers extends Game {
    total_players: number;
}

export interface Player {
    id: string;
    game_id: string;
    user_id: string;
    did_win: boolean|null;
    role_name: string|null;
    cosmetic_color: number|null;
    cosmetic_name: string|null;
    role_alignment: string|null;
}

export type AntiCheatPlayer = DeclareSafeKeys<Player, "id"|"game_id"|"user_id"|"cosmetic_color"|"cosmetic_name">;

export class LobbiesController {
    constructor(public readonly server: AccountServer) {}

    async getGameById(gameId: string) {
        const { rows: foundGames } = await this.server.postgresClient.query(`
            SELECT *
            FROM game
            WHERE id = $1
        `, [ gameId ]);

        return foundGames[0] as Game|undefined;
    }

    async getUserGames(userId: string, before: Date, limit: number) {
        const { rows: foundGames } = await this.server.postgresClient.query(`
            SELECT game.*, COUNT(player.id) AS total_players
            FROM game
            JOIN player ON game.id = player.game_id
            WHERE player.user_id = $1 AND started_at < $2
            GROUP BY game.id
            LIMIT $3
        `, [ userId, before, limit ]);

        return foundGames as GameWithPlayers[];
    }

    async getPlayersInGame(gameId: string) {
        const { rows: foundPlayers } = await this.server.postgresClient.query(`
            SELECT *
            FROM player
            WHERE game_id = $1
        `, [ gameId ]);

        return foundPlayers as Player[];
    }
}