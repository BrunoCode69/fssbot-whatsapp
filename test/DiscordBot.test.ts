import { describe, expect, test } from 'bun:test';
import { GatewayIntentBits } from 'discord.js';
import {
  ButtonMessage,
  FileMessage,
  ListMessage,
  PollMessage,
  TextMessage,
} from '../src/messages';
import Client from '../src/client/Client';
import { BotStatus } from '../src/bot/BotStatus';
import { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DiscordBot,
  buildDiscordPayload,
  resolveDiscordIntents,
  toDiscordEmbed,
} from '../src/discord';

describe('DiscordIntents e buildDiscordPayload', () => {
  test('resolveDiscordIntents resolve lista de nomes e bitmask numérico com fallback padrão', () => {
    const fromNames = resolveDiscordIntents(['Guilds', 'GuildMessages', 'MessageContent', 'GuildExpressions']);
    expect(fromNames).toEqual([
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      (GatewayIntentBits as any).GuildExpressions ?? GatewayIntentBits.GuildEmojisAndStickers,
    ]);

    const mask = Number(GatewayIntentBits.Guilds) | Number(GatewayIntentBits.DirectMessages);
    const fromMask = resolveDiscordIntents(mask);
    expect(fromMask).toContain(GatewayIntentBits.Guilds);
    expect(fromMask).toContain(GatewayIntentBits.DirectMessages);

    const defaults = resolveDiscordIntents([]);
    expect(defaults).toContain(GatewayIntentBits.Guilds);
    expect(defaults).toContain(GatewayIntentBits.MessageContent);
  });

  test('buildDiscordPayload converte Embed, ButtonMessage, ListMessage (select) e PollMessage para discord.js', () => {
    const embed = toDiscordEmbed({
      title: 'Painel VIP',
      description: 'Escolha abaixo',
      color: '#5865F2',
      fields: [{ name: 'Plano', value: 'Pro', inline: true }],
      footer: 'BDFW Discord',
      timestamp: true,
    });
    expect(embed.data.title).toBe('Painel VIP');
    expect(embed.data.color).toBe(0x5865f2);
    expect(embed.data.fields?.length).toBe(1);

    const btnMsg = new ButtonMessage('12345', 'Menu');
    btnMsg.extra = {
      discordEmbed: { title: 'Menu', color: '#57F287' },
    };
    btnMsg.addReply('Aceitar', 'ok', 'success', '✅');
    btnMsg.addUrl('Site', 'https://bdfw.dev');
    const btnPayload = buildDiscordPayload(btnMsg);
    expect(btnPayload.content).toBe('Menu');
    expect(btnPayload.embeds?.length).toBe(1);
    expect(btnPayload.components?.length).toBe(1);
    expect(btnPayload.components[0].components.length).toBe(2);

    const listMsg = new ListMessage('12345', 'Escolha');
    listMsg.button = 'Abrir cargos';
    listMsg.addCategory('Cargos');
    listMsg.addItem(0, 'Developer', 'Canal de devs', 'dev');
    const listPayload = buildDiscordPayload(listMsg);
    expect(listPayload.components?.length).toBe(1);
    expect(listPayload.components[0].components[0].options?.length).toBe(1);

    const roleSelect = new ListMessage('12345', 'Escolha membros');
    roleSelect.selectType = 'user';
    roleSelect.minValues = 1;
    roleSelect.maxValues = 3;
    const rolePayload = buildDiscordPayload(roleSelect);
    expect(rolePayload.components?.length).toBe(1);

    const pollMsg = new PollMessage('12345', 'Qual framework?', [{ id: '1', name: 'Discord.js' }, { id: '2', name: 'Rompot' }]);
    const pollPayload = buildDiscordPayload(pollMsg);
    expect(pollPayload.poll?.question?.text).toBe('Qual framework?');
    expect(pollPayload.poll?.answers?.length).toBe(2);
  });

  test('DiscordBot inicializa com platform=discord e intents personalizadas', () => {
    const bot = new DiscordBot({ intents: ['Guilds', 'GuildMessages'] });
    expect(bot.platform).toBe('discord');
    expect(bot.discord).toBeDefined();
    const txt = new TextMessage('999', 'Olá Discord');
    expect(buildDiscordPayload(txt).content).toBe('Olá Discord');
  });
  test('convertIncomingMessage e Client.downloadMediaToFile baixam anexos .ehi do Discord sem ENOENT', async () => {
    const ehiBytes = Buffer.from([0x00, 0x04, 0x45, 0x48, 0x49, 0x21, 0xaa, 0xbb, 0xcc, 0xdd]);
    const server = Bun.serve({
      port: 0,
      fetch() {
        return new Response(ehiBytes, {
          headers: {
            'content-type': 'application/octet-stream',
            'content-length': String(ehiBytes.length),
          },
        });
      },
    });
    const fileUrl = `http://127.0.0.1:${server.port}/attachments/123/456/TIM_EXPIRADO_2.ehi?ex=abc`;
    const tmpFile = path.join(os.tmpdir(), `rompot-discord-ehi-${Date.now()}.bin`);

    try {
      const bot = new DiscordBot({ intents: ['Guilds', 'GuildMessages'] });
      bot.status = BotStatus.Online;
      const client = new Client(bot);

      const fakeDiscordMsg: any = {
        id: '1999888777',
        content: '/decrypt',
        channelId: '777666555',
        createdTimestamp: Date.now(),
        channel: { id: '777666555', name: 'geral', isDMBased: () => false, isThread: () => false },
        guild: { id: '111222333', name: 'Servidor Teste', memberCount: 10 },
        author: { id: '444555666', username: 'bruno', tag: 'bruno#0001', bot: false },
        member: null,
        mentions: { users: new Map() },
        attachments: {
          first: () => ({
            url: fileUrl,
            proxyURL: fileUrl,
            name: 'TIM_EXPIRADO_2.ehi',
            contentType: 'application/octet-stream',
            size: ehiBytes.length,
          }),
        },
        stickers: { first: () => undefined },
      };

      const rompotMsg = await (bot as any).convertIncomingMessage(fakeDiscordMsg);
      expect(rompotMsg).toBeInstanceOf(FileMessage);
      expect(typeof (rompotMsg as any).file).toBe('object');
      expect((rompotMsg as any).file.stream.url).toBe(fileUrl);
      expect((rompotMsg as any).name).toBe('TIM_EXPIRADO_2.ehi');

      await client.downloadMediaToFile(rompotMsg as any, tmpFile, { maxBytes: 1024 * 1024 });
      const saved = await fsp.readFile(tmpFile);
      expect(Buffer.compare(saved, ehiBytes)).toBe(0);

      const streamed = await client.downloadStreamMessage(rompotMsg as any, { maxBytes: 1024 * 1024 });
      expect(Buffer.compare(streamed, ehiBytes)).toBe(0);

      await expect(
        client.downloadMediaToFile(rompotMsg as any, tmpFile, { maxBytes: 4 }),
      ).rejects.toThrow(/limite/i);
    } finally {
      server.stop(true);
      await fsp.rm(tmpFile, { force: true }).catch(() => {});
    }
  });

  test('handleInteraction converte slash command com anexo em FileMessage com slashOptions', async () => {
    const bot = new DiscordBot({ intents: ['Guilds'] });
    let emittedMsg: any = null;
    bot.on('message', (m) => { emittedMsg = m; });

    await (bot as any).handleInteraction({
      id: '987654321',
      channelId: '777666555',
      createdTimestamp: Date.now(),
      channel: { id: '777666555', name: 'geral', isDMBased: () => false, isThread: () => false },
      guild: { id: '111222333', name: 'Servidor' },
      user: { id: '444555666', username: 'bruno' },
      member: null,
      isChatInputCommand: () => true,
      isButton: () => false,
      isAnySelectMenu: () => false,
      isModalSubmit: () => false,
      commandName: 'decrypt',
      options: {
        data: [{
          name: 'arquivo',
          type: 11,
          attachment: {
            url: 'https://cdn.discordapp.com/attachments/1/2/TIM_EXPIRADO_2.ehi',
            name: 'TIM_EXPIRADO_2.ehi',
            contentType: 'application/octet-stream',
            size: 128,
          },
        }],
        getSubcommand: () => null,
      },
    });

    expect(emittedMsg).toBeInstanceOf(FileMessage);
    expect(emittedMsg.text).toBe('/decrypt');
    expect(emittedMsg.name).toBe('TIM_EXPIRADO_2.ehi');
    expect(emittedMsg.extra?.slashOptions?.arquivo).toBeInstanceOf(FileMessage);
  });
});
