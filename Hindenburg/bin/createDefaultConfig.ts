import { HindenburgConfig } from "../src";

export function createDefaultConfig(): HindenburgConfig {
    return {
        versions: ["2021.6.30"],
        clusterName: "Capybara",
        nodeId: 0,
        checkForUpdates: true,
        autoUpdate: false,
        exitConfirmation: true,
        defaultLanguage: "en",
        socket: {
            port: 22023,
            broadcastUnknownGamedata: false,
            messageOrdering: false,
            ip: "auto"
        },
        rateLimit: {
            maxPacketSizeBytes: 1024 * 4, // 4KB
            windowReliableMs: 4000,
            reliableNum: 20,
            windowUnreliableMs: 1000,
            unreliableNum: 10,
            warningsWindowMs: 120000,
            maxWarnings: 3
        },
        plugins: {
            loadDirectory: true
        },
        anticheat: {
            penalty: {
                action: "disconnect",
                strikes: 2,
                banAfterXDisconnects: 3,
                banDuration: 3600,
                disconnectMessage: "You have been banned for $duration."
            },
            rules: {}
        },
        logging: {
            hideSensitiveInfo: false,
            connections: {
                format: ["id", "ip", "ping", "room"]
            },
            rooms: {
                format: ["players", "map"]
            },
            players: {
                format: ["id", "ping", "ishost"]
            }
        },
        reactor: {
            blockClientSideOnly: true,
            mods: {},
            allowExtraMods: true,
            requireHostMods: true,
            allowNormalClients: true
        },
        rooms: {
            checkChatMode: false,
            chatCommands: true,
            plugins: {
                loadDirectory: true
            },
            gameCodes: "v2",
            enforceSettings: {},
            serverAsHost: false,
            serverPlayer: {
                name: "<color=yellow>[Server]</color>",
                color: "Yellow",
                hat: "None",
                skin: "None"
            },
            createTimeout: 10
        }
    };
}
