"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeOrderedDictionary = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
const baileys_1 = require("@whiskeysockets/baileys");
// Funções auxiliares para chaves (baseadas na implementação original do Baileys)
const waChatKey = (includeReadOnly = false) => ({
    key: (c) => c.id,
    compare: (k1, k2) => k1.localeCompare(k2),
});
const waLabelAssociationKey = {
    key: (la) => `${la.chatId || la.messageId}:${la.labelId}`,
    compare: (k1, k2) => k1.localeCompare(k2),
};
const waMessageID = (m) => m.key.id || '';
// Classe para repositório de objetos
class ObjectRepository {
    constructor(initialData = {}) {
        this.data = {};
        this.data = { ...initialData };
    }
    upsertById(id, item) {
        this.data[id] = item;
    }
    getById(id) {
        return this.data[id];
    }
    getAll() {
        return { ...this.data };
    }
    deleteById(id) {
        if (this.data[id]) {
            delete this.data[id];
            return true;
        }
        return false;
    }
}
const predefinedLabels = Object.freeze({
    '1': {
        id: '1',
        name: 'New customer',
        predefinedId: '1',
        color: 1,
        deleted: false,
    },
    '2': {
        id: '2',
        name: 'New order',
        predefinedId: '2',
        color: 2,
        deleted: false,
    },
    '3': {
        id: '3',
        name: 'Pending payment',
        predefinedId: '3',
        color: 3,
        deleted: false,
    },
    '4': {
        id: '4',
        name: 'Paid',
        predefinedId: '4',
        color: 4,
        deleted: false,
    },
    '5': {
        id: '5',
        name: 'Order completed',
        predefinedId: '5',
        color: 5,
        deleted: false,
    },
});
function makeOrderedDictionary(idGetter, stdTTL) {
    const dictCache = new node_cache_1.default({ stdTTL: stdTTL || 60 * 60 });
    const get = (id) => dictCache.get(id);
    const update = (item) => {
        const id = idGetter(item);
        const array = dictCache.keys().map((k) => dictCache.get(k));
        const idx = array.findIndex((i) => idGetter(i) === id);
        if (idx >= 0) {
            dictCache.set(id, item);
            return true;
        }
        return false;
    };
    const upsert = (item, mode) => {
        try {
            const id = idGetter(item);
            if (get(id)) {
                update(item);
            }
            else {
                dictCache.set(id, JSON.parse(JSON.stringify(item || {}) || '{}'));
            }
        }
        catch (error) {
            // Handle error silently
        }
    };
    const remove = (item) => {
        const id = idGetter(item);
        const array = dictCache.keys().map((k) => dictCache.get(k));
        const idx = array.findIndex((i) => idGetter(i) === id);
        if (idx >= 0) {
            array.splice(idx, 1);
            dictCache.del(id);
            return true;
        }
        return false;
    };
    const array = dictCache.keys().map((k) => dictCache.get(k));
    return {
        array,
        dictCache,
        get,
        upsert,
        update,
        remove,
        updateAssign: (id, update) => {
            const item = get(id);
            if (item) {
                Object.assign(item, update);
                dictCache.del(id);
                dictCache.set(idGetter(item), item);
                return true;
            }
            return false;
        },
        clear: () => {
            dictCache.flushAll();
        },
        filter: (contain) => {
            const array = dictCache.keys().map((k) => dictCache.get(k));
            let i = 0;
            while (i < array.length) {
                if (!contain(array[i])) {
                    const id = idGetter(array[i]);
                    dictCache.del(id);
                    array.splice(i, 1);
                }
                else {
                    i += 1;
                }
            }
        },
        toJSON: () => dictCache.keys().map((k) => dictCache.get(k)),
        fromJSON: (newItems) => {
            const array = dictCache.keys().map((k) => dictCache.get(k));
            array.splice(0, array.length, ...newItems);
            dictCache.flushAll();
            newItems.forEach((item) => {
                const id = idGetter(item);
                dictCache.set(id, item);
            });
        },
    };
}
exports.makeOrderedDictionary = makeOrderedDictionary;
const makeMessagesDictionary = (stdTTL) => makeOrderedDictionary(waMessageID, stdTTL);
// Função principal para criar o store
function makeInMemoryStore({ logger: _logger, chatKey, labelAssociationKey, stdTTL, } = {}) {
    chatKey = chatKey || waChatKey(true);
    labelAssociationKey = labelAssociationKey || waLabelAssociationKey;
    stdTTL = stdTTL || 60 * 60;
    const logger = _logger;
    const KeyedDB = require('@adiwajshing/keyed-db').default;
    const chats = new KeyedDB(chatKey, (c) => c.id);
    const messages = {};
    const contacts = {};
    const groupMetadata = {};
    const presences = {};
    const state = { connection: 'close' };
    const labels = new ObjectRepository(predefinedLabels);
    const labelAssociations = new KeyedDB(labelAssociationKey, labelAssociationKey.key);
    const assertMessageList = (jid) => {
        if (!messages[jid]) {
            messages[jid] = makeMessagesDictionary(stdTTL);
        }
        return messages[jid];
    };
    const contactsUpsert = (newContacts) => {
        const oldContacts = new Set(Object.keys(contacts));
        for (const contact of newContacts) {
            oldContacts.delete(contact.id);
            contacts[contact.id] = Object.assign(contacts[contact.id] || {}, contact);
        }
        return oldContacts;
    };
    const labelsUpsert = (newLabels) => {
        for (const label of newLabels) {
            labels.upsertById(label.id, label);
        }
    };
    /**
     * binds to a BaileysEventEmitter.
     * It listens to all events and constructs a state that you can query accurate data from.
     * Eg. can use the store to fetch chats, contacts, messages etc.
     * @param ev typically the event emitter from the socket connection
     */
    const bind = (ev) => {
        ev.on('connection.update', (update) => {
            Object.assign(state, update);
        });
        ev.on('messaging-history.set', ({ chats: newChats, contacts: newContacts, messages: newMessages, isLatest, }) => {
            try {
                if (isLatest) {
                    chats.clear();
                    for (const id in messages) {
                        delete messages[id];
                    }
                }
                for (const msg of newMessages) {
                    const jid = msg.key.remoteJid;
                    const list = assertMessageList(jid);
                    list.upsert(msg, 'prepend');
                }
                logger === null || logger === void 0 ? void 0 : logger.debug({ messages: newMessages.length }, 'synced messages');
            }
            catch (error) {
                logger === null || logger === void 0 ? void 0 : logger.error(error, 'Failed to sync messaging history');
            }
        });
        ev.on('messages.upsert', ({ messages: newMessages, type }) => {
            try {
                switch (type) {
                    case 'append':
                    case 'notify':
                        for (const msg of newMessages) {
                            const jid = (0, baileys_1.jidNormalizedUser)(msg.key.remoteJid);
                            const list = assertMessageList(jid);
                            list.upsert(msg, 'append');
                            if (type === 'notify') {
                                if (!chats.get(jid)) {
                                    ev.emit('chats.upsert', [
                                        {
                                            id: jid,
                                            conversationTimestamp: (0, baileys_1.toNumber)(msg.messageTimestamp),
                                            unreadCount: 1,
                                        },
                                    ]);
                                }
                            }
                        }
                        break;
                }
            }
            catch (error) {
                logger === null || logger === void 0 ? void 0 : logger.error(error, 'Failed to upsert messages');
            }
        });
        ev.on('messages.update', (updates) => {
            try {
                for (const { update, key } of updates) {
                    const list = assertMessageList((0, baileys_1.jidNormalizedUser)(key.remoteJid));
                    if (update === null || update === void 0 ? void 0 : update.status) {
                        const message = list.get(key.id);
                        const listStatus = message === null || message === void 0 ? void 0 : message.status;
                        if (listStatus && (update === null || update === void 0 ? void 0 : update.status) <= listStatus) {
                            logger === null || logger === void 0 ? void 0 : logger.debug({ update, storedStatus: listStatus }, 'status stored newer then update');
                            delete update.status;
                            logger === null || logger === void 0 ? void 0 : logger.debug({ update }, 'new update object');
                        }
                    }
                    const result = list.updateAssign(key.id, update);
                    if (!result) {
                        logger === null || logger === void 0 ? void 0 : logger.debug({ update }, 'got update for non-existent message');
                    }
                }
            }
            catch (error) {
                logger === null || logger === void 0 ? void 0 : logger.error(error, 'Failed to update messages');
            }
        });
        ev.on('messages.delete', (item) => {
            try {
                if ('all' in item) {
                    const list = messages[item.jid];
                    if (list) {
                        list.clear();
                    }
                }
                else {
                    const jid = item.keys[0].remoteJid;
                    const list = messages[jid];
                    if (list) {
                        const idSet = new Set(item.keys.map((k) => k.id));
                        list.filter((m) => !idSet.has(m.key.id));
                    }
                }
            }
            catch (error) {
                logger === null || logger === void 0 ? void 0 : logger.error(error, 'Failed to delete messages');
            }
        });
    };
    const toJSON = () => ({
        chats,
        contacts,
        messages,
        labels,
        labelAssociations,
    });
    const fromJSON = (json) => {
        chats.upsert(...json.chats);
        labelAssociations.upsert(...(json.labelAssociations || []));
        contactsUpsert(Object.values(json.contacts));
        labelsUpsert(Object.values(json.labels || {}));
        for (const jid in json.messages) {
            const list = assertMessageList(jid);
            for (const msg of json.messages[jid]) {
                list.upsert(msg, 'append');
            }
        }
    };
    return {
        chats,
        contacts,
        messages,
        groupMetadata,
        state,
        presences,
        labels,
        labelAssociations,
        bind,
        /** loads messages from the store, if not found -- uses the legacy connection */
        loadMessages: async (jid, count, cursor) => {
            const list = assertMessageList(jid);
            const mode = !cursor || 'before' in cursor ? 'before' : 'after';
            const cursorKey = cursor
                ? 'before' in cursor
                    ? cursor.before
                    : cursor.after
                : undefined;
            const cursorValue = cursorKey ? list.get(cursorKey.id) : undefined;
            let messages;
            if (list && mode === 'before' && (!cursorKey || cursorValue)) {
                if (cursorValue) {
                    const msgs = list.dictCache.keys().map((k) => list.dictCache.get(k));
                    const msgIdx = msgs.findIndex((msg) => msg.key.id === (cursorKey === null || cursorKey === void 0 ? void 0 : cursorKey.id));
                    messages = msgs.slice(0, msgIdx);
                }
                else {
                    messages = list.dictCache.keys().map((k) => list.dictCache.get(k));
                }
                const diff = count - messages.length;
                if (diff < 0) {
                    messages = messages.slice(-count); // get the last X messages
                }
            }
            else {
                messages = [];
            }
            return messages;
        },
        /**
         * Get all available labels for profile
         *
         * Keep in mind that the list is formed from predefined tags and tags
         * that were "caught" during their editing.
         */
        getLabels: () => {
            return labels;
        },
        /**
         * Get labels for chat
         *
         * @returns Label IDs
         **/
        getChatLabels: (chatId) => {
            return labelAssociations.filter((la) => la.chatId === chatId).all();
        },
        /**
         * Get labels for message
         *
         * @returns Label IDs
         **/
        getMessageLabels: (messageId) => {
            const associations = labelAssociations
                .filter((la) => la.messageId === messageId)
                .all();
            return associations.map(({ labelId }) => labelId);
        },
        loadMessage: async (jid, id) => { var _a; return (_a = messages[jid]) === null || _a === void 0 ? void 0 : _a.get(id); },
        mostRecentMessage: async (jid) => {
            const messageList = messages[jid];
            if (!messageList)
                return undefined;
            const keys = messageList.dictCache.keys();
            if (keys.length === 0)
                return undefined;
            const message = messageList.get(keys.slice(-1)[0]);
            return message;
        },
        fetchImageUrl: async (jid, sock) => {
            const contact = contacts[jid];
            if (!contact) {
                return sock === null || sock === void 0 ? void 0 : sock.profilePictureUrl(jid);
            }
            if (typeof contact.imgUrl === 'undefined') {
                contact.imgUrl = await (sock === null || sock === void 0 ? void 0 : sock.profilePictureUrl(jid));
            }
            return contact.imgUrl;
        },
        fetchGroupMetadata: async (jid, sock) => {
            if (!groupMetadata[jid]) {
                const metadata = await (sock === null || sock === void 0 ? void 0 : sock.groupMetadata(jid));
                if (metadata) {
                    groupMetadata[jid] = metadata;
                }
            }
            return groupMetadata[jid];
        },
        fetchMessageReceipts: async ({ remoteJid, id }) => {
            const list = messages[remoteJid];
            const msg = list === null || list === void 0 ? void 0 : list.get(id);
            return msg === null || msg === void 0 ? void 0 : msg.userReceipt;
        },
        toJSON,
        fromJSON,
        writeToFile: (path) => {
            const { writeFileSync } = require('fs');
            writeFileSync(path, JSON.stringify(toJSON()));
        },
        readFromFile: (path) => {
            const { readFileSync, existsSync } = require('fs');
            if (existsSync(path)) {
                logger === null || logger === void 0 ? void 0 : logger.debug({ path }, 'reading from file');
                const jsonStr = readFileSync(path, { encoding: 'utf-8' });
                const json = JSON.parse(jsonStr);
                fromJSON(json);
            }
        },
    };
}
exports.default = makeInMemoryStore;
//# sourceMappingURL=makeInMemoryStore.js.map