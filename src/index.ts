import { ChannelType, Client, Collection, TextChannel, Webhook, WebhookClient } from "discord.js";
import { WordGenerator as Generator } from "./utils/generator";
import { Connection } from "mysql";

export type interserver = {
    guild_id: string;
    channel_id: string;
    webhook: string;
    frequence: string;
};

export class InterserverManager {
    readonly client: Client;
    private cache: Collection<string, interserver> = new Collection<string, interserver>();
    private database: Connection;

    constructor(client: Client, database: Connection) {
        this.client = client;
        this.database = database;
    }
    public get list() {
        return this.cache;
    }
    public start() {
        this.fillCache();
        this.event();
    }
    public async createInterserver({ channel, frequence }: { channel: TextChannel, frequence?: string }) {
        return new Promise<interserver>(async(resolve, reject) => {
            if (frequence && !this.isMatchingFrequence(frequence)) return reject(this.error('Error: a frequence has been specified, but no channel is matching', '001'));
            if (frequence && !this.validChannelFrequence(channel, frequence)) return reject(this.error('Error: a frequence has been specified, but a channel in the server already has it', '002'));
            if (this.cache.has(channel.id)) return reject(this.error('Error: The channel is already configured', '003'))

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
            await this.query(`INSERT INTO interserver (guild_id, channel_id, frequence, webhook) VALUES ('${data.guild_id}', '${data.channel_id}', '${data.frequence}', '${data.webhook}')`)
            this.cache.set(channel.id, data);

            return resolve(data);
        });
    }
    public async removeInterserver(channel: TextChannel) {
        return new Promise<interserver>(async(resolve, reject) => {
            const data = this.cache.get(channel.id);

            if (!data) return reject(this.error("Error: the channel isn't configured", '006'));
            const webhooks = await channel.fetchWebhooks();
            const webhook = webhooks.find((x) => x.url === data.webhook);

            if (webhook) webhook.delete().catch(() => {});
            this.cache.delete(channel.id);
            await this.query(`DELETE FROM interserver WHERE channel_id='${channel.id}'`);
            
            resolve(data);
        });
    }
    public async editFrequence({channel, frequence}: { channel: TextChannel, frequence: string }) {
        return new Promise<interserver>(async(resolve, reject) => {
            if (!this.isMatchingFrequence(frequence)) return reject(this.error('Error: There is no frequence matching this frequence', '001'));
            if (!this.validChannelFrequence(channel, frequence)) return reject(this.error('Error: There is already a channel configured with this frequence', '002'));

            const data = this.cache.get(channel.id);
            if (!data) return reject(this.error("Error: The channel isn't configured", '006'));

            data.frequence = frequence;
            this.cache.set(channel.id, data);
            await this.query(`UPDATE interserver SET frequence='${frequence}' WHERE channel_id='${channel.id}'`);

            resolve(data);
        });
    }
    private error(message: string, code: string) {
        return { message, code: code.toString() };
    }
    private isMatchingFrequence(frequence: string) {
        return this.cache.filter((x) => x.frequence === frequence).size > 0;
    }
    private validChannelFrequence(channel: TextChannel, frequence: string) {
        const matches = this.cache.filter((x) => x.guild_id === channel.guild.id && x.frequence === frequence);
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
            const forbidden = this.cache.map(x => x.frequence);
            
            const generator = new Generator({ length: 16, special: true, letters: true });
            const tryFrequenceGeneration = (generator: Generator, size?: number) => {
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

            const complexGenerator = new Generator({ length: 18, letters: true, capitals: true, special: true });
            generated = tryFrequenceGeneration(complexGenerator, 10);

            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            }

            const veryComplexGenerator = new Generator({ length: collisions * 6, letters: true, capitals: true, special: true, numbers: true });
            generated = tryFrequenceGeneration(veryComplexGenerator, 20);

            calculateColisions();
            if (generationOk()) {
                return resolve(generated[0]);
            }

            reject(this.error('Error: No frequence has been generated', '005'));
        })
    }
    private async fillCache() {
        await this.query(`CREATE TABLE IF NOT EXISTS interserver ( guild_id VARCHAR(255) NOT NULL, channel_id VARCHAR(255) NOT NULL, frequence VARCHAR(255) NOT NULL, webhook VARCHAR(255) NOT NULL )`);
        const data = await this.query<interserver>(`SELECT * FROM interserver`);

        this.cache.clear();
        data.forEach((d) => {
            this.cache.set(d.channel_id, d);
        });
    }
    private async event() {
        this.client.on('messageCreate', async ({ guild, author, webhookId, channel, content, member, embeds, system }) => {
            if (!guild || webhookId || author.bot || /<(@|@&|#|@!)(\d+)>/i.test(content) || system) return;

            const data = this.cache.get(channel.id);
            if (!data) return;

            const frequence = data.frequence;
            const sendTo = this.cache.filter((x) => x.channel_id !== channel.id && x.frequence === frequence);

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
            const data = this.cache.get(channel.id);
            if (!data || channel.type !== ChannelType.GuildText) return;

            const webhooks = await channel.fetchWebhooks();
            if (!webhooks.find((x) => x.url === data.webhook)) {
                const webhook = await this.createWebhook(channel);
                if (webhook) {
                    data.webhook = webhook.url;
                    this.cache.set(channel.id, data);
                    await this.query(`UPDATE channel_id SET webhook='${webhook.url}' WHERE channel_id='${channel.id}'`);
                }
            }
        })
    }
    private query<R = any>(sql: string): Promise<R[]> {
        return new Promise((resolve, reject) => {
            this.database.query(sql, (error, request) => {
                if (error) return reject(error);
                resolve(request);
            })
        })
    }
}