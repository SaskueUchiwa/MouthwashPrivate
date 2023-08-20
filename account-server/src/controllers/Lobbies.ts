import { AccountServer } from "../AccountServer";

export interface Game {
    id: string;
    lobby_id: string;
    started_by: string;
    game_settings: any;
    started_at: Date;
    ended_at: Date;
}

export class LobbiesController {
    constructor(public readonly server: AccountServer) {}

    async getUserGames(userId: string, before: Date, limit: number) {
        const { rows: foundGames } = await this.server.postgresClient.query(`
            SELECT DISTINCT ON (game.id) game.*
            FROM game
            LEFT JOIN player ON player.game_id = game.id
            WHERE player.user_id = $1 AND game.started_at < $2
            ORDER BY game.id, started_at DESC
            LIMIT $3;
        `, [ userId, before, limit ]);

        return foundGames as Game[];
    }
}