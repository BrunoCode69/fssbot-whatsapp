import { describe, expect, test } from 'bun:test';
import { extractAndMapLID, fixID } from '../src/wa/ID';
import { LIDMapper } from '../src/wa/LIDMapper';
import { TelegramUtils } from '../src/telegram/TelegramUtils';
import { createReactionKey } from '../src/wa/reaction-key';
import { createReactionMessageData } from '../src/wa/reaction-message-data';
import { createInteractiveListPayload } from '../src/wa/interactive-list-payload';
import { extractInteractiveListSelection } from '../src/wa/list-selection';
import { getPollCreationContent, getPollCreatorJid, getPollVoterId, getPollVoteChange } from '../src/wa/poll-content';
import ContactMessage from '../src/messages/ContactMessage';
import FileMessage from '../src/messages/FileMessage';
import AudioMessage from '../src/messages/AudioMessage';
import ConvertWAMessage from '../src/wa/ConvertWAMessage';
import ConvertToWAMessage, { normalizeWhatsAppAudioMimetype } from '../src/wa/ConvertToWAMessage';
import { resolveDownloadMediaInput } from '../src/wa/WhatsAppBot';
import ListMessage from '../src/messages/ListMessage';
import PollMessage from '../src/messages/PollMessage';
import Message from '../src/messages/Message';
import { BufferJSON } from '../src/wa/Auth';
import ButtonMessage from '../src/messages/ButtonMessage';
import { createButtonSendOptions, createInlineKeyboard } from '../src/telegram/inline-keyboard';

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

  test('maps private LIDs and drops the device suffix', () => {
    const mapper = new LIDMapper();

    const result = extractAndMapLID({
      key: {
        remoteJid: '123456:4@lid',
        remoteJidAlt: '5511999999999:4@s.whatsapp.net',
      },
    }, mapper);

    expect(result).toEqual({ id: '123456@lid', lid: '123456@lid' });
    expect(fixID('123456:4@lid')).toBe('123456@lid');
    expect(mapper.getJID('123456:7@lid')).toBe('5511999999999@s.whatsapp.net');
    expect(mapper.getLID('5511999999999@s.whatsapp.net')).toBe('123456@lid');
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

describe('Telegram inline button keyboard', () => {
  test('builds reply and URL buttons in Telegram inline keyboard format', () => {
    const message = new ButtonMessage('-100123', 'Choose');
    message.addReply('Help', 'help').addUrl('Docs', 'https://example.com');

    expect(createInlineKeyboard(message)).toEqual({
      inline_keyboard: [
        [{ text: 'Help', callback_data: 'help' }],
        [{ text: 'Docs', url: 'https://example.com' }],
      ],
    });
  });

  test('creates clean sendMessage options with reply_markup only', () => {
    const message = new ButtonMessage('-100123', 'Choose');
    message.addReply('Help', 'help');

    const options = createButtonSendOptions(message);
    expect(JSON.parse(options.reply_markup as string)).toEqual({
      inline_keyboard: [[{ text: 'Help', callback_data: 'help' }]],
    });
  });
});

describe('WhatsApp group reaction keys', () => {
  test('omits participant when reacting to the bot own sent message', () => {
    expect(createReactionKey(
      '120@g.us',
      'message-id',
      true,
      '5511999999999@s.whatsapp.net',
      '5511999999999@s.whatsapp.net',
      true,
    )).toEqual({
      remoteJid: '120@g.us',
      id: 'message-id',
      fromMe: true,
      participant: undefined,
    });
  });

  test('keeps participant when reacting to another group member message', () => {
    expect(createReactionKey(
      '120@g.us',
      'message-id',
      false,
      '5511888888888@s.whatsapp.net',
      '5511999999999@s.whatsapp.net',
      true,
    )).toEqual({
      remoteJid: '120@g.us',
      id: 'message-id',
      fromMe: false,
      participant: '5511888888888@s.whatsapp.net',
    });
  });
});

describe('WhatsApp incoming reaction conversion', () => {
  test('keeps reaction type and target message ID', () => {
    const data = createReactionMessageData(
      { type: 'text', chat: { id: '120@g.us' }, user: { id: '5511888888888@s.whatsapp.net' } },
      { text: 'ðŸ‘', key: { id: 'target-message-id' } },
    );

    expect(data).toMatchObject({
      type: 'reaction',
      text: 'ðŸ‘',
      id: 'target-message-id',
    });
  });
});

describe('WhatsApp helper-based list payload', () => {
  test('uses the baileys_helper single_select format and preserves selectable row IDs', () => {
    const list = new ListMessage('120@g.us', 'Pick an option');
    list.setTitle('Menu').setButton('Open').setFooter('Footer');
    list.addCategory('Category 1');
    list.addItem(0, 'Option 1', 'Description', 'option_1');

    const payload = createInteractiveListPayload(list);

    expect(payload.__useBaileysHelper).toBe(true);
    expect(payload.interactiveButtons[0]?.name).toBe('single_select');
    expect(JSON.parse(payload.interactiveButtons[0]?.buttonParamsJson || '{}')).toMatchObject({
      title: 'Open',
      sections: [{
        title: 'Category 1',
        rows: [{ title: 'Option 1', description: 'Description', id: 'option_1' }],
      }],
    });
    expect(payload.text).toBe('Pick an option');
    expect(payload.title).toBe('Menu');
    expect(payload.footer).toBe('Footer');
  });

  test('extracts the selected row ID from a native-flow response', () => {
    expect(extractInteractiveListSelection({
      nativeFlowResponseMessage: {
        name: 'single_select',
        paramsJson: JSON.stringify({ id: 'option_1' }),
      },
    })).toBe('option_1');
  });
});

describe('WhatsApp poll creation variants', () => {
  test('recognizes the pollCreationMessageV3 used for single-select polls', () => {
    const poll = { name: 'Hello World', options: [{ optionName: 'Hello' }] };

    expect(getPollCreationContent({ pollCreationMessageV3: poll })).toBe(poll);
    expect(getPollCreationContent({ pollCreationMessage: poll })).toBe(poll);
  });

  test('preserves the poll secret key through JSON persistence', () => {
    const poll = new PollMessage('120@g.us', 'Question');
    poll.secretKey = Buffer.from(Array.from({ length: 32 }, (_, index) => index + 1));

    const persisted = JSON.parse(JSON.stringify(poll.toJSON()));
    const restored = PollMessage.fromJSON(persisted);

    expect(restored.secretKey).toEqual(poll.secretKey);
  });

  test('preserves poll options, secret, and creator metadata through Rompot auth serialization', () => {
    const poll = new PollMessage('120@g.us', 'Question');
    poll.id = 'poll-id';
    poll.user.id = '558173146435:3@s.whatsapp.net';
    poll.extra.pollCreatorJid = '558173146435:3@s.whatsapp.net';
    poll.addOption('Hello', 'hello-id');
    poll.addOption('Hey', 'hey-id');
    poll.secretKey = Buffer.from(Array.from({ length: 32 }, (_, index) => index + 1));

    const persisted = JSON.parse(JSON.stringify(poll.toJSON(), BufferJSON.replacer), BufferJSON.reviver);
    const restored = PollMessage.fromJSON(persisted);

    const requiredMessageKeys = Object.keys(new Message());
    const missingMessageKeys = requiredMessageKeys.filter((key) => !(key in persisted));
    expect(missingMessageKeys).toEqual(['mention']);
    expect(PollMessage.isValid(persisted)).toBe(true);
    expect(restored.options).toEqual(poll.options);
    expect(restored.secretKey).toEqual(poll.secretKey);
    expect(restored.extra.pollCreatorJid).toBe(poll.extra.pollCreatorJid);
  });

  test('uses the alternate participant JID for vote decryption when available', () => {
    expect(getPollVoterId({
      key: {
        remoteJid: '120@g.us',
        participant: '12345@lid',
        participantAlt: '5511999999999:4@s.whatsapp.net',
      },
    }, 'bot@s.whatsapp.net')).toBe('5511999999999@s.whatsapp.net');
  });

  test('matches Baileys author precedence when participant and remote JID alternates coexist', () => {
    expect(getPollVoterId({
      key: {
        remoteJid: '120363412654066582@g.us',
        remoteJidAlt: '5511999999999:4@s.whatsapp.net',
        participant: '46609488420874@lid',
      },
    }, 'bot@s.whatsapp.net')).toBe('5511999999999@s.whatsapp.net');
  });

  test('drops the device suffix from the poll creator, like Baileys getKeyAuthor', () => {
    expect(getPollCreatorJid({ key: { fromMe: true } }, '5511999999999:7@s.whatsapp.net'))
      .toBe('5511999999999@s.whatsapp.net');
  });

  test('detects an added option when a voter switches their single-choice vote', () => {
    expect(getPollVoteChange(['Hello'], ['Hey'])).toEqual({ action: 'add', option: 'Hey' });
    expect(getPollVoteChange(['Hello'], [])).toEqual({ action: 'remove', option: 'Hello' });
  });
});

describe('WhatsApp AudioMessage conversion', () => {
  test('never forwards video/* mimetypes to Zapo audio payloads', () => {
    expect(normalizeWhatsAppAudioMimetype('video/mp4', false)).toBe('audio/mp4');
    expect(normalizeWhatsAppAudioMimetype('video/x-m4v', false)).toBe('audio/mp4');
    expect(normalizeWhatsAppAudioMimetype('video/webm', false)).toBe('audio/webm');
    expect(normalizeWhatsAppAudioMimetype('application/octet-stream', false)).toBe('audio/mp4');
    expect(normalizeWhatsAppAudioMimetype('audio/ogg', true)).toBe('audio/ogg; codecs=opus');
    expect(normalizeWhatsAppAudioMimetype('audio/mpeg', false)).toBe('audio/mpeg');
  });

  test('converts AudioMessage with mismatched video/mp4 mimetype to audio/mp4 in ConvertToWAMessage', async () => {
    const fakeBot = {
      resolveId: async (jid: string) => jid,
    } as any;
    const msg = new AudioMessage('5511999999999@s.whatsapp.net', Buffer.from('audio-bytes'), {
      mimetype: 'video/mp4',
      isPTT: false,
      duration: 185,
    });

    const converted = await new ConvertToWAMessage(fakeBot, msg).refactory();
    expect(converted.waMessage).toMatchObject({
      type: 'audio',
      ptt: false,
      mimetype: 'audio/mp4',
      seconds: 185,
    });
  });
});

describe('WhatsApp quoted media & mention conversion', () => {
  test('skips senderKeyDistributionMessage in group messages and extracts quoted .ehi FileMessage for Zapo media download', async () => {
    const { resolveMediaPayload } = require('../node_modules/zapo-js/dist/message/encode/media-payload.js');
    const fakeBot = {
      id: '5511000000000@s.whatsapp.net',
      resolveId: async (jid: string) => jid,
      canonicalId: (jid: string) => jid,
      extractAndMapLID: () => ({ id: '' }),
    } as any;

    const mediaKey = new Uint8Array(32).fill(7);
    const incomingGroupReply = {
      key: {
        remoteJid: '120363000000000000@g.us',
        participant: '5511999999999@s.whatsapp.net',
        id: 'reply-msg-1',
        fromMe: false,
      },
      message: {
        senderKeyDistributionMessage: {
          groupId: '120363000000000000@g.us',
          axolotlSenderKeyDistributionMessage: new Uint8Array([1, 2, 3]),
        },
        extendedTextMessage: {
          text: '/decrypt',
          contextInfo: {
            stanzaId: 'quoted-doc-id',
            participant: '5511888888888@s.whatsapp.net',
            mentionedJid: ['5511888888888@s.whatsapp.net'],
            quotedMessage: {
              documentWithCaptionMessage: {
                message: {
                  documentMessage: {
                    fileName: 'vivo.ehi',
                    mimetype: 'text/plain',
                    directPath: '/v/t62.7119-24/abc',
                    mediaKey,
                    fileLength: 256,
                  },
                },
              },
            },
          },
        },
      },
    };

    const converted = await new ConvertWAMessage(fakeBot, incomingGroupReply).get();
    expect(converted.text).toBe('/decrypt');
    expect(converted.mentions).toEqual(['5511888888888@s.whatsapp.net']);
    expect(FileMessage.isValid(converted.mention)).toBe(true);

    const quotedDoc = converted.mention as FileMessage;
    expect(quotedDoc.name).toBe('vivo.ehi');
    expect(quotedDoc.mimetype).toBe('text/plain');
    expect(quotedDoc.id).toBe('quoted-doc-id');

    const zapoInput = resolveDownloadMediaInput((quotedDoc.file as any).stream);
    const payload = resolveMediaPayload(zapoInput);
    expect(payload).not.toBeNull();
    expect(payload.mediaType).toBe('document');
    expect(payload.directPath).toBe('/v/t62.7119-24/abc');
  });

  test('unwraps deviceSentMessage and uses cached message fallback when quotedMessage is empty', async () => {
    const mediaKey = new Uint8Array(32).fill(9);
    const cachedOriginal = {
      key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'cached-id-1', fromMe: false },
      message: {
        deviceSentMessage: {
          destinationJid: '5511999999999@s.whatsapp.net',
          message: {
            documentMessage: {
              title: 'servidor.ehi',
              mimetype: 'application/octet-stream',
              directPath: '/v/t62.7119-24/cached',
              mediaKey,
            },
          },
        },
      },
    };
    const fakeBot = {
      id: '5511000000000@s.whatsapp.net',
      resolveId: async (jid: string) => jid,
      canonicalId: (jid: string) => jid,
      extractAndMapLID: () => ({ id: '' }),
      getCachedWAMessage: (id?: string) => (id === 'cached-id-1' ? cachedOriginal : undefined),
    } as any;

    const incoming = {
      key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'cmd-1', fromMe: false },
      message: {
        deviceSentMessage: {
          destinationJid: '5511999999999@s.whatsapp.net',
          message: {
            extendedTextMessage: {
              text: '/decrypt',
              contextInfo: {
                stanzaId: 'cached-id-1',
                participant: '5511999999999@s.whatsapp.net',
                quotedMessage: {},
              },
            },
          },
        },
      },
    };

    const converted = await new ConvertWAMessage(fakeBot, incoming).get();
    expect(converted.text).toBe('/decrypt');
    expect(FileMessage.isValid(converted.mention)).toBe(true);
    expect((converted.mention as FileMessage).name).toBe('servidor.ehi');
  });

  test('merges missing fileName, directPath, and mediaKey from cached message when quotedMessage is stripped', async () => {
    const { resolveMediaPayload } = require('../node_modules/zapo-js/dist/message/encode/media-payload.js');
    const mediaKey = new Uint8Array(32).fill(11);
    const cachedOriginal = {
      key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'orig-doc-1', fromMe: false },
      message: {
        documentWithCaptionMessage: {
          message: {
            documentMessage: {
              fileName: 'config_premium.ehi',
              mimetype: 'application/octet-stream',
              directPath: '/v/t62.7119-24/from-cache',
              mediaKey,
              fileLength: 512,
            },
          },
        },
      },
    };
    const fakeBot = {
      id: '5511000000000@s.whatsapp.net',
      lid: '100000000@lid',
      resolveId: async (jid: string) => jid,
      canonicalId: (jid: string) => jid,
      extractAndMapLID: () => ({ id: '' }),
      getCachedWAMessage: (id?: string) => (id === 'orig-doc-1' ? cachedOriginal : undefined),
    } as any;

    const incoming = {
      key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'cmd-partial-quote', fromMe: false },
      message: {
        extendedTextMessage: {
          text: '/decrypt',
          contextInfo: {
            stanzaId: 'orig-doc-1',
            participant: '100000000@lid',
            quotedMessage: {
              documentMessage: {
                mimetype: 'application/octet-stream',
              },
            },
          },
        },
      },
    };

    const converted = await new ConvertWAMessage(fakeBot, incoming).get();
    expect(FileMessage.isValid(converted.mention)).toBe(true);
    const quotedDoc = converted.mention as FileMessage;
    expect(quotedDoc.name).toBe('config_premium.ehi');
    expect(quotedDoc.fromMe).toBe(true);
    const payload = resolveMediaPayload(resolveDownloadMediaInput((quotedDoc.file as any).stream));
    expect(payload).not.toBeNull();
    expect(payload.directPath).toBe('/v/t62.7119-24/from-cache');
  });

  test('recovers quoted FileMessage via stanzaId cache even when quotedMessage is omitted', async () => {
    const mediaKey = new Uint8Array(32).fill(5);
    const cachedOriginal = {
      key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'stanza-only-1', fromMe: true },
      message: {
        documentMessage: {
          fileName: 'rota.ehi',
          mimetype: 'text/plain',
          directPath: '/v/t62.7119-24/stanza',
          mediaKey,
        },
      },
    };
    const fakeBot = {
      id: '5511000000000@s.whatsapp.net',
      resolveId: async (jid: string) => jid,
      canonicalId: (jid: string) => jid,
      extractAndMapLID: () => ({ id: '' }),
      getCachedWAMessage: (id?: string) => (id === 'stanza-only-1' ? cachedOriginal : undefined),
    } as any;

    const incoming = {
      key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'cmd-stanza-only', fromMe: false },
      message: {
        extendedTextMessage: {
          text: '/decrypt',
          contextInfo: {
            stanzaId: 'stanza-only-1',
          },
        },
      },
    };

    const converted = await new ConvertWAMessage(fakeBot, incoming).get();
    expect(FileMessage.isValid(converted.mention)).toBe(true);
    expect((converted.mention as FileMessage).name).toBe('rota.ehi');
    expect((converted.mention as FileMessage).fromMe).toBe(true);
  });
});

