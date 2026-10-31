import { describe, expect, test } from 'bun:test';
import { extractAndMapLID, fixID } from '../src/wa/ID';
import { LIDMapper } from '../src/wa/LIDMapper';
import { TelegramUtils } from '../src/telegram/TelegramUtils';
import { createReactionKey } from '../src/wa/reaction-key';
import { createReactionMessageData } from '../src/wa/reaction-message-data';
import { createInteractiveListPayload } from '../src/wa/interactive-list-payload';
import { extractInteractiveListSelection } from '../src/wa/list-selection';
import { getPollCreationContent, getPollCreatorJid, getPollVoterId, getPollVoteChange } from '../src/wa/poll-content';
import ListMessage from '../src/messages/ListMessage';
import PollMessage from '../src/messages/PollMessage';
import Message from '../src/messages/Message';
import { BufferJSON } from 'baileys';
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

