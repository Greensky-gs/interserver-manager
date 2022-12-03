import { Client, Collection, TextChannel } from "discord.js";
import { Connection } from "mysql";
import { interserver } from "./dist";

export class InterserverManager {
    readonly client: Client;
    
    public constructor(client: Client, database: Connection);

    public start(): void;

    public createInterserver(options: { channel: TextChannel, frequence?: string }): Promise<interserver>;
    public removeInterserver(channel: TextChannel): Promise<interserver>;
    public editFrequence(options: { channel: TextChannel, frequence: string }): Promise<interserver>;

    get list(): Collection<string, interserver>;
}

export { interserver };