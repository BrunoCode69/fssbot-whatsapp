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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
        /** Nome do local (opcional). */
        this.name = "";
        /** Endereço do local (opcional). */
        this.address = "";
        /** URL do mapa (opcional). */
        this.url = "";
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
        return this;
    }
    /**
     * Define o nome do local.
     * @param name - Nome do local.
     */
    setName(name) {
        this.name = name;
        return this;
    }
    /**
     * Define o endereço do local.
     * @param address - Endereço textual.
     */
    setAddress(address) {
        this.address = address;
        return this;
    }
    /**
     * Define a URL de mapa ou referência.
     * @param url - URL do mapa.
     */
    setUrl(url) {
        this.url = url;
        return this;
    }
    /**
     * @returns O endereço da localização
     */
    getAddress() {
        return this.address || AddressService_1.default.getByLocation(this.latitude, this.longitude);
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
        return Message_1.default.isValid(message) && message?.type == Message_1.MessageType.Location;
    }
}
exports.default = LocationMessage;
//# sourceMappingURL=LocationMessage.js.map