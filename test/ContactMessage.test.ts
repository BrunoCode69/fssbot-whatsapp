import { describe, expect, test } from 'bun:test';
import ContactMessage from '../src/messages/ContactMessage';
import ConvertToWAMessage from '../src/wa/ConvertToWAMessage';

describe('WhatsApp contact conversion', () => {
  test('sends a single contact payload without leaving its name as message text', () => {
    const contact = new ContactMessage('120@g.us', 'Ada Lovelace', ['5511999999999']);
    const converter = new ConvertToWAMessage({} as any, contact);
    converter.waMessage = { text: contact.text };

    converter.refactoryContactMessage(contact);

    expect(converter.waMessage.text).toBeUndefined();
    expect(converter.waMessage.contacts.displayName).toBe('Ada Lovelace');
    expect(converter.waMessage.contacts.contacts).toHaveLength(1);
    expect(converter.waMessage.contacts.contacts[0].displayName).toBe('Ada Lovelace');
    expect(converter.waMessage.contacts.contacts[0].vcard).toContain('FN:Ada Lovelace');
    expect(converter.waMessage.contacts.contacts[0].vcard).toContain('waid=5511999999999: 5511999999999');
  });
});