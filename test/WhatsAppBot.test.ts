import { describe, expect, test } from 'bun:test';
import { extractAndMapLID, fixID } from '../src/wa/ID';
import { LIDMapper } from '../src/wa/LIDMapper';
import { TelegramUtils } from '../src/telegram/TelegramUtils';

describe('WhatsApp LID handling', () => {
  test('keeps a group destination when the sender uses a LID', () => {
    const mapper = new LIDMapper();

    const result = extractAndMapLID({
      key: {
        remoteJid: '120@g.us',
        participant: 'user:4@lid',
        participantAlt: '5511999999999@s.whatsapp.net',
      },
    }, mapper);

    expect(result).toEqual({ id: '120@g.us', lid: undefined });
    expect(mapper.getJID('user:4@lid')).toBe('5511999999999@s.whatsapp.net');
  });

  test('maps private LIDs and preserves their device suffix', () => {
    const mapper = new LIDMapper();

    const result = extractAndMapLID({
      key: {
        remoteJid: 'user:4@lid',
        remoteJidAlt: '5511999999999@s.whatsapp.net',
      },
    }, mapper);

    expect(result).toEqual({ id: 'user:4@lid', lid: 'user:4@lid' });
    expect(fixID('user:4@lid')).toBe('user:4@lid');
  });
});

describe('Telegram anonymous admin attribution', () => {
  test('recognizes GroupAnonymousBot messages sent on behalf of the current group', () => {
    const message = {
      chat: { id: -1001234567890, type: 'supergroup' },
      from: { id: 1087968824, is_bot: true, username: 'GroupAnonymousBot', first_name: 'Group' },
      sender_chat: { id: -1001234567890, type: 'supergroup' },
    } as any;

    expect(TelegramUtils.isAnonymousGroupAdminMessage(message)).toBe(true);
  });

  test('does not recognize messages attributed to a different chat', () => {
    const message = {
      chat: { id: -1001234567890, type: 'supergroup' },
      from: { id: 1087968824, is_bot: true, username: 'GroupAnonymousBot', first_name: 'Group' },
      sender_chat: { id: -1009876543210, type: 'supergroup' },
    } as any;

    expect(TelegramUtils.isAnonymousGroupAdminMessage(message)).toBe(false);
  });
});

