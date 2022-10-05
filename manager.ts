import { Client, Collection } from "discord.js";
import { config } from "dotenv";
import { createConnection } from "mysql";
import { interserver } from './interserver';
import { query } from "./query";

config();

export const database_informations = {
    host: process.env.DATABASE_H,
    password: process.env.DATABASE_P,
    user: process.env.DATABASE_U,
    database: process.env.DATABASE_D
};

const database = createConnection(database_informations);
database.connect((error) => {
    throw error;
});

export class InterserverManager {
    client: Client;
    #cache: Collection<string, interserver>;
    constructor(client: Client) {
        this.client = client;
    }
    public start() {
        this.fillCache();
        this.event();
    }
    private async fillCache() {
        const data = await query<interserver>(`SELECT * FROM interserver`);

        this.#cache.clear();
        data.forEach((d) => {
            this.#cache.set(d.channel_id, d);
        });
    }
    private async event() {
        this.client.on('messageCreate', (message) => {
            if (!message.guild || message.webhookId || message.author.bot) return;


        })
    }
}