import { ChannelType, Client, Collection, TextChannel, Webhook, WebhookClient } from "discord.js";
import { config } from "dotenv";
import { createConnection } from "mysql";
import { interserver } from './interserver';
import { query } from "./query";
import { WordGenerator } from './generator';

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
export const db = database;

export class InterserverManager {
    readonly client: Client;
    #cache: Collection<string, interserver> = new Collection<string, interserver>();;
    constructor(client: Client) {
        this.client = client;
    }
    public start() {
        this.fillCache();
        this.event();
    }
    public async createInterserver({ channel, frequence }: { channel: TextChannel, frequence?: string }) {
        return new Promise<interserver>(async(resolve, reject) => {
            if (frequence && !this.isMatchingFrequence(frequence)) return reject(this.error('Error: a frequence has been specified, but no channel is matching', '001'));
            if (frequence && !this.validChannelFrequence(channel, frequence)) return reject(this.error('Error: a frequence has been specified, but a channel in the server already has it', '002'));
            if (this.#cache.has(channel.id)) return reject(this.error('Error: The channel is already configured', '003'))

            const webhook = await this.createWebhook(channel);

            if (!webhook) return reject(this.error('Error: Webhook creation failure', '004'));
            let generated: string = '';
            if (!frequence) {
                const result = await this.generateUniqueFrequence().catch((error) => {
                    if (error.code === '004') return reject(error);
                })
                if (!result) return;
                generated = result;
            };

            const data: interserver = {
                guild_id: channel.guild.id,
                channel_id: channel.id,
                webhook: webhook.url,
                frequence: frequence ?? generated
            }
            await query(`INSERT INTO interserver (guild_id, channel_id, frequence, webhook) VALUES ('${data.guild_id}', '${data.channel_id}', '${data.frequence}', '${data.webhook}')`)
            this.#cache.set(channel.id, data);

            return resolve(data);
        });
    }
    public async removeInterserver(channel: TextChannel) {
        return new Promise<interserver>(async(resolve, reject) => {
            const data = this.#cache.get(channel.id);

            if (!data) return reject(this.error("Error: the channel isn't configured", '006'));
            const webhooks = await channel.fetchWebhooks();
            const webhook = webhooks.find((x) => x.url === data.webhook);

            if (webhook) webhook.delete().catch(() => {});
            this.#cache.delete(channel.id);
            await query(`DELETE FROM interserver WHERE channel_id='${channel.id}'`);
            
            resolve(data);
        });
    }
    private error(message: string, code: string) {
        return { message, code: code.toString() };
    }
    private isMatchingFrequence(frequence: string) {
        return this.#cache.filter((x) => x.frequence === frequence).size > 0;
    }
    private validChannelFrequence(channel: TextChannel, frequence: string) {
        const matches = this.#cache.filter((x) => x.guild_id === channel.guild.id && x.frequence === frequence);
        return matches.size === 0;
    }
    private createWebhook(channel: TextChannel) {
        return new Promise<Webhook>(async(resolve) => {
            resolve(await channel.createWebhook({
                name: 'Interserver',
                avatar: this.client.user?.avatarURL({ forceStatic: false }),
                reason: 'Need it for an interserver feature'
            }));
        })
    }
    private async generateUniqueFrequence() {
        return new Promise<string>((resolve, reject) => {
            let collisions = 0;
            const forbidden = this.#cache.map(x => x.frequence);
            
            const generator = new WordGenerator({ length: 16, special: true, letters: true });
            const tryFrequenceGeneration = (generator: WordGenerator, size?: number) => {
                let generated: string[] = [];
                for (let i = 0; i < (size ?? 5); i++) {
                    generated.push(generator.generate());
                };
    
                return generated;
            };
            const calculateColisions = () => {
                collisions = generated.length - generated.filter(x => !forbidden.includes(x)).length;
            };
            const generationOk = () => collisions === 0;
            
            let generated = tryFrequenceGeneration(generator);
            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            };

            generated = tryFrequenceGeneration(generator);
            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            }

            generated = tryFrequenceGeneration(generator);
            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            };

            const complexGenerator = new WordGenerator({ length: 18, letters: true, capitals: true, special: true });
            generated = tryFrequenceGeneration(complexGenerator, 10);

            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            }

            const veryComplexGenerator = new WordGenerator({ length: collisions * 6, letters: true, capitals: true, special: true, numbers: true });
            generated = tryFrequenceGeneration(veryComplexGenerator, 20);

            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            }

            reject(this.error('Error: No frequence has been generated', '005'));
        })
    }
    private async fillCache() {
        const data = await query<interserver>(`SELECT * FROM interserver`);

        this.#cache.clear();
        data.forEach((d) => {
            this.#cache.set(d.channel_id, d);
        });
    }
    private async event() {
        this.client.on('messageCreate', async ({ guild, author, webhookId, channel, content, member, embeds, system }) => {
            if (!guild || webhookId || author.bot || /<(@|@&|#|@!)(\d+)>/i.test(content) || system) return;

            const data = this.#cache.get(channel.id);
            if (!data) return;

            const frequence = data.frequence;
            const sendTo = this.#cache.filter((x) => x.channel_id !== channel.id && x.frequence === frequence);

            sendTo.forEach((inter) => {
                const webhook = new WebhookClient({ url: inter.webhook });
                if (webhook) {
                    webhook.send({
                        content,
                        embeds,
                        username: member?.nickname ?? author.username,
                        avatarURL: author.displayAvatarURL({ forceStatic: false })
                    }).catch(() => {});
                }
            })
        });
        this.client.on('webhookUpdate', async(channel) => {
            const data = this.#cache.get(channel.id);
            if (!data || channel.type !== ChannelType.GuildText) return;

            const webhooks = await channel.fetchWebhooks();
            if (!webhooks.find((x) => x.url === data.webhook)) {
                const webhook = await this.createWebhook(channel);
                if (webhook) {
                    data.webhook = webhook.url;
                    this.#cache.set(channel.id, data);
                    await query(`UPDATE channel_id SET webhook='${webhook.url}' WHERE channel_id='${channel.id}'`);
                }
            }
        })
    }
}
