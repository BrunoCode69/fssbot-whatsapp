import { describe, expect, test } from 'bun:test';
import { extractAndMapLID, fixID } from '../src/wa/ID';
import { LIDMapper } from '../src/wa/LIDMapper';

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