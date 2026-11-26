import { describe, expect, test } from 'bun:test';
import { GatewayIntentBits } from 'discord.js';
import {
  ButtonMessage,
  ListMessage,
  PollMessage,
  TextMessage,
} from '../src/messages';
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
});
