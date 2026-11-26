import type { WaClient } from 'zapo-js';
import WhatsAppBot from './WhatsAppBot';
export default class ConfigWAEvents {
    wa: WhatsAppBot;
    constructor(wa: WhatsAppBot);
    configureAll(client?: WaClient): void;
    /** Momento do stanza (atributo `t`, em segundos) em milissegundos. */
    private stanzaTimestamp;
    private toChat;
    /**
     * Descarta mensagens de `status@broadcast` antes da descriptografia (o Zapo ainda envia o ack).
     * O filtro em `configMessages` continua como segurança caso o descarte não esteja disponível.
     */
    configIgnoreStatus(zapo: WaClient): void;
    private toUser;
    private toGroupChat;
    configAuth(zapo: WaClient): void;
    configConnection(zapo: WaClient): void;
    configMessages(zapo: WaClient): void;
    configGroup(zapo: WaClient): void;
    configPresence(zapo: WaClient): void;
    configCall(zapo: WaClient): void;
    configBlocklist(zapo: WaClient): void;
    /** Confirmações de entrega/leitura → evento `receipt`. */
    configReceipts(zapo: WaClient): void;
    /** Digitando/gravando → evento `chatstate` (requer `subscribePresence`). */
    configChatstate(zapo: WaClient): void;
    /** Mensagens sem conteúdo, mensagens de protocolo e cache das mensagens enviadas. */
    configMessageExtras(zapo: WaClient): void;
    /** Foto de perfil de contato/grupo alterada → evento `picture`. */
    configPicture(zapo: WaClient): void;
    configExtraEvents(zapo: WaClient): void;
}
