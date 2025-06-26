"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessageFromJSON = void 0;
const PollUpdateMessage_1 = __importDefault(require("../messages/PollUpdateMessage"));
const Message_1 = __importStar(require("../messages/Message"));
const LocationMessage_1 = __importDefault(require("../messages/LocationMessage"));
const ReactionMessage_1 = __importDefault(require("../messages/ReactionMessage"));
const ContactMessage_1 = __importDefault(require("../messages/ContactMessage"));
const StickerMessage_1 = __importDefault(require("../messages/StickerMessage"));
const ButtonMessage_1 = __importDefault(require("../messages/ButtonMessage"));
const VideoMessage_1 = __importDefault(require("../messages/VideoMessage"));
const MediaMessage_1 = __importDefault(require("../messages/MediaMessage"));
const ImageMessage_1 = __importDefault(require("../messages/ImageMessage"));
const AudioMessage_1 = __importDefault(require("../messages/AudioMessage"));
const EmptyMessage_1 = __importDefault(require("../messages/EmptyMessage"));
const ErrorMessage_1 = __importDefault(require("../messages/ErrorMessage"));
const FileMessage_1 = __importDefault(require("../messages/FileMessage"));
const ListMessage_1 = __importDefault(require("../messages/ListMessage"));
const PollMessage_1 = __importDefault(require("../messages/PollMessage"));
const TextMessage_1 = __importDefault(require("../messages/TextMessage"));
function getMessageFromJSON(data) {
    if (!data || typeof data != 'object' || (data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Empty) {
        return EmptyMessage_1.default.fromJSON(data);
    }
    if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Audio) {
        var message = AudioMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Button) {
        var message = ButtonMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Contact) {
        var message = ContactMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Error) {
        var message = ErrorMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.File) {
        var message = FileMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Image) {
        var message = ImageMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.List) {
        var message = ListMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Location) {
        var message = LocationMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Media) {
        var message = MediaMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Text) {
        var message = TextMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Poll) {
        var message = PollMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.PollUpdate) {
        var message = PollUpdateMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Reaction) {
        var message = ReactionMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Sticker) {
        var message = StickerMessage_1.default.fromJSON(data);
    }
    else if ((data === null || data === void 0 ? void 0 : data.type) == Message_1.MessageType.Video) {
        var message = VideoMessage_1.default.fromJSON(data);
    }
    else {
        var message = Message_1.default.fromJSON(data);
    }
    if (message.mention) {
        message.mention = getMessageFromJSON(message.mention);
    }
    return message;
}
exports.getMessageFromJSON = getMessageFromJSON;
//# sourceMappingURL=MessageUtils.js.map