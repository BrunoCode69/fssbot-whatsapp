"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramUtils = void 0;
const ChatType_1 = __importDefault(require("../modules/chat/ChatType"));
var TelegramUtils;
(function (TelegramUtils) {
    function getId(data) {
        if (!data || typeof data != "object") {
            return "";
        }
        return `${data.id || data.user_id || ""}`;
    }
    TelegramUtils.getId = getId;
    function getName(data) {
        if (!data || typeof data != "object") {
            return "";
        }
        if (data.first_name && data.last_name) {
            return `${data.first_name} ${data.last_name}`;
        }
        if (data.first_name) {
            return `${data.first_name}`;
        }
        if (data.username) {
            return `${data.username}`;
        }
        return "";
    }
    TelegramUtils.getName = getName;
    function getNickname(data) {
        if (!data || typeof data != "object") {
            return "";
        }
        return `${data.username || ""}`;
    }
    TelegramUtils.getNickname = getNickname;
    function getChatType(chat) {
        if (!chat || typeof chat != "object") {
            return ChatType_1.default.PV;
        }
        return chat.type == "private" ? ChatType_1.default.PV : ChatType_1.default.Group;
    }
    TelegramUtils.getChatType = getChatType;
    function getPhoneNumber(id) {
        return `${id}`.replace(/\D+/g, "") || "0";
    }
    TelegramUtils.getPhoneNumber = getPhoneNumber;
    function isAnonymousGroupAdminMessage(msg) {
        var _a, _b, _c, _d, _e;
        return ((_a = msg === null || msg === void 0 ? void 0 : msg.from) === null || _a === void 0 ? void 0 : _a.is_bot) === true
            && msg.from.username === 'GroupAnonymousBot'
            && String((_c = (_b = msg.sender_chat) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : '') === String((_e = (_d = msg.chat) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : '');
    }
    TelegramUtils.isAnonymousGroupAdminMessage = isAnonymousGroupAdminMessage;
    function getText(msg) {
        if (!msg || typeof msg != "object") {
            return "";
        }
        return `${msg.text || msg.caption || ""}`;
    }
    TelegramUtils.getText = getText;
    function getMention(text, entity) {
        if (!text || !entity || typeof entity != "object") {
            return "";
        }
        if (entity.type != "mention") {
            return "";
        }
        const start = Number(entity.offset || -1) + 1;
        const end = start + Number(entity.length || 0);
        if (end >= text.length) {
            return "";
        }
        return `${text.slice(start, end)}`;
    }
    TelegramUtils.getMention = getMention;
    function getMentions(text, entities) {
        if (!text || !entities) {
            return [];
        }
        if (!Array.isArray(entities)) {
            entities = [entities];
        }
        return entities.reduce((mentions, entity) => {
            const mention = getMention(text, entity);
            if (mention) {
                mentions.push(mention);
            }
            return mentions;
        }, []);
    }
    TelegramUtils.getMentions = getMentions;
    function getMessageMentions(msg) {
        return getMentions(getText(msg), msg.entities);
    }
    TelegramUtils.getMessageMentions = getMessageMentions;
    async function downloadFileFromURL(url) {
        return Buffer.from(await (await fetch(url)).arrayBuffer());
    }
    TelegramUtils.downloadFileFromURL = downloadFileFromURL;
})(TelegramUtils = exports.TelegramUtils || (exports.TelegramUtils = {}));
//# sourceMappingURL=TelegramUtils.js.map