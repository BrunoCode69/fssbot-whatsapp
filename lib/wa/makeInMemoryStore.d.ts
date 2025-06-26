import type KeyedDB from '@adiwajshing/keyed-db';
import NodeCache from 'node-cache';
import { Logger } from 'pino';
import { type BaileysEventEmitter, type Chat, type ConnectionState, type Contact, type GroupMetadata, type PresenceData, WAMessage, WAMessageCursor, WASocket, WAMessageKey, proto } from '@whiskeysockets/baileys';
import { Comparable } from '@adiwajshing/keyed-db/lib/Types';
interface Label {
    id: string;
    name: string;
    predefinedId?: string;
    color: number;
    deleted: boolean;
}
interface LabelAssociation {
    chatId?: string;
    messageId?: string;
    labelId: string;
}
declare class ObjectRepository<T> {
    private data;
    constructor(initialData?: Record<string, T>);
    upsertById(id: string, item: T): void;
    getById(id: string): T | undefined;
    getAll(): Record<string, T>;
    deleteById(id: string): boolean;
}
export declare type BaileysInMemoryStoreConfig = {
    chatKey?: Comparable<Chat, string>;
    labelAssociationKey?: Comparable<LabelAssociation, string>;
    logger?: Logger;
    stdTTL?: number;
};
export declare function makeOrderedDictionary<T>(idGetter: (item: T) => string, stdTTL?: number): {
    array: T[];
    dictCache: NodeCache;
    get: (id: string) => T | undefined;
    upsert: (item: T, mode: 'append' | 'prepend') => void;
    update: (item: T) => boolean;
    remove: (item: T) => boolean;
    updateAssign: (id: string, update: Partial<T>) => boolean;
    clear: () => void;
    filter: (contain: (item: T) => boolean) => void;
    toJSON: () => T[];
    fromJSON: (newItems: T[]) => void;
};
export default function makeInMemoryStore({ logger: _logger, chatKey, labelAssociationKey, stdTTL, }?: BaileysInMemoryStoreConfig): {
    chats: KeyedDB<Chat, string>;
    contacts: {
        [_: string]: Contact;
    };
    messages: {
        [_: string]: {
            array: proto.IWebMessageInfo[];
            dictCache: NodeCache;
            get: (id: string) => proto.IWebMessageInfo | undefined;
            upsert: (item: proto.IWebMessageInfo, mode: "append" | "prepend") => void;
            update: (item: proto.IWebMessageInfo) => boolean;
            remove: (item: proto.IWebMessageInfo) => boolean;
            updateAssign: (id: string, update: Partial<proto.IWebMessageInfo>) => boolean;
            clear: () => void;
            filter: (contain: (item: proto.IWebMessageInfo) => boolean) => void;
            toJSON: () => proto.IWebMessageInfo[];
            fromJSON: (newItems: proto.IWebMessageInfo[]) => void;
        };
    };
    groupMetadata: {
        [_: string]: GroupMetadata;
    };
    state: ConnectionState;
    presences: {
        [id: string]: {
            [participant: string]: PresenceData;
        };
    };
    labels: ObjectRepository<Label>;
    labelAssociations: KeyedDB<LabelAssociation, string>;
    bind: (ev: BaileysEventEmitter) => void;
    /** loads messages from the store, if not found -- uses the legacy connection */
    loadMessages: (jid: string, count: number, cursor: WAMessageCursor) => Promise<proto.IWebMessageInfo[]>;
    /**
     * Get all available labels for profile
     *
     * Keep in mind that the list is formed from predefined tags and tags
     * that were "caught" during their editing.
     */
    getLabels: () => ObjectRepository<Label>;
    /**
     * Get labels for chat
     *
     * @returns Label IDs
     **/
    getChatLabels: (chatId: string) => LabelAssociation[];
    /**
     * Get labels for message
     *
     * @returns Label IDs
     **/
    getMessageLabels: (messageId: string) => string[];
    loadMessage: (jid: string, id: string) => Promise<proto.IWebMessageInfo | undefined>;
    mostRecentMessage: (jid: string) => Promise<proto.IWebMessageInfo | undefined>;
    fetchImageUrl: (jid: string, sock: WASocket) => Promise<string | null | undefined>;
    fetchGroupMetadata: (jid: string, sock: WASocket) => Promise<GroupMetadata>;
    fetchMessageReceipts: ({ remoteJid, id }: WAMessageKey) => Promise<proto.IUserReceipt[] | null | undefined>;
    toJSON: () => {
        chats: KeyedDB<Chat, string>;
        contacts: {
            [_: string]: Contact;
        };
        messages: {
            [_: string]: {
                array: proto.IWebMessageInfo[];
                dictCache: NodeCache;
                get: (id: string) => proto.IWebMessageInfo | undefined;
                upsert: (item: proto.IWebMessageInfo, mode: "append" | "prepend") => void;
                update: (item: proto.IWebMessageInfo) => boolean;
                remove: (item: proto.IWebMessageInfo) => boolean;
                updateAssign: (id: string, update: Partial<proto.IWebMessageInfo>) => boolean;
                clear: () => void;
                filter: (contain: (item: proto.IWebMessageInfo) => boolean) => void;
                toJSON: () => proto.IWebMessageInfo[];
                fromJSON: (newItems: proto.IWebMessageInfo[]) => void;
            };
        };
        labels: ObjectRepository<Label>;
        labelAssociations: KeyedDB<LabelAssociation, string>;
    };
    fromJSON: (json: {
        chats: Chat[];
        contacts: {
            [id: string]: Contact;
        };
        messages: {
            [id: string]: proto.IWebMessageInfo[];
        };
        labels: {
            [labelId: string]: Label;
        };
        labelAssociations: LabelAssociation[];
    }) => void;
    writeToFile: (path: string) => void;
    readFromFile: (path: string) => void;
};
export {};
