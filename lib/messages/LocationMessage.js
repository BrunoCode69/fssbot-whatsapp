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
const AddressService_1 = __importDefault(require("../services/AddressService"));
const Message_1 = __importStar(require("./Message"));
const Generic_1 = require("../utils/Generic");
/**
 * Representa uma mensagem de localização.
 */
class LocationMessage extends Message_1.default {
    /**
     * Cria uma nova instância de LocationMessage.
     * @param latitude - A latitude da localização (padrão é 0).
     * @param longitude - A longitude da localização (padrão é 0).
     * @param chat - O chat associado à mensagem de localização (opcional).
     * @param others - Outras propriedades da mensagem de localização (opcional).
     */
    constructor(chat, latitude = 0, longitude = 0, others = {}) {
        super(chat);
        /** O tipo da mensagem é sempre MessageType.Location. */
        this.type = Message_1.MessageType.Location;
        this.latitude = latitude;
        this.longitude = longitude;
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Define a localização da mensagem.
     * @param latitude - A nova latitude.
     * @param longitude - A nova longitude.
     */
    setLocation(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
    /**
     * @returns O endereço da localização
     */
    getAddress() {
        return AddressService_1.default.getByLocation(this.latitude, this.longitude);
    }
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON() {
        const data = {};
        for (const key of Object.keys(this)) {
            if (key == "toJSON")
                continue;
            data[key] = this[key];
        }
        return JSON.parse(JSON.stringify(data));
    }
    /**
     * Desserializa um objeto JSON em uma instância de LocationMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de LocationMessage.
     */
    static fromJSON(data) {
        return Message_1.default.fix(!data || typeof data != "object" ? new LocationMessage() : (0, Generic_1.injectJSON)(data, new LocationMessage()));
    }
    /**
     * Verifica se um objeto é uma instância válida de LocationMessage.
     * @param message - O objeto a ser verificado como uma instância de LocationMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de LocationMessage, caso contrário, falso.
     */
    static isValid(message) {
        return Message_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.Location;
    }
}
exports.default = LocationMessage;
//# sourceMappingURL=LocationMessage.js.map