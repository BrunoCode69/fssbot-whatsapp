import type Chat from '../modules/chat/Chat';
import type User from '../modules/user/User';

/** Alterações de configuração de um grupo. */
export type GroupUpdateChanges = {
  /** Novo nome do grupo */
  name?: string;
  /** Nova descrição do grupo */
  description?: string;
  /** `true` quando só administradores podem enviar mensagens */
  announce?: boolean;
  /** `true` quando só administradores podem editar os dados do grupo */
  restrict?: boolean;
  /** Novo código de convite */
  inviteCode?: string;
  /** `true` quando qualquer membro pode adicionar participantes */
  memberAddMode?: boolean;
  /** `true` quando a entrada exige aprovação de um administrador */
  joinApprovalMode?: boolean;
  /** Duração das mensagens temporárias em segundos (0 = desativado) */
  ephemeralDuration?: number;
};

/** Qual configuração do grupo mudou. */
export type GroupUpdateAction = keyof GroupUpdateChanges;

/** Evento `group-update`: configuração de um grupo alterada. */
export type GroupUpdateEvent = {
  /** Primeira configuração alterada (atalho para `changes`) */
  action: GroupUpdateAction;
  /** Todas as alterações recebidas */
  changes: GroupUpdateChanges;
  /** Grupo alterado */
  chat: Chat;
  /** Quem fez a alteração, quando informado pelo WhatsApp */
  fromUser?: User;
};

/** Evento `group-join-request`: pedido de entrada num grupo com aprovação. */
export type GroupJoinRequestEvent = {
  /** `created` = novo pedido, `revoked` = a pessoa cancelou, `rejected` = um admin recusou */
  action: 'created' | 'revoked' | 'rejected';
  /** Origem do pedido (`invite_link`, `linked_group_join`, `non_admin_add`) */
  method?: string;
  /** Grupo */
  chat: Chat;
  /** Pessoa que pediu para entrar */
  user: User;
  /** Quem executou a ação, quando informado */
  fromUser?: User;
};

/** Presença de um contato. */
export type PresenceStatus = 'available' | 'unavailable' | 'composing' | 'recording' | 'paused';

/** Evento `presence`: presença atualizada (requer `subscribePresence`). */
export type PresenceEvent = {
  chat: Chat;
  user: User;
  status: PresenceStatus;
  /** Último acesso em milissegundos, quando o WhatsApp informa */
  lastSeen?: number;
};

/** Evento `blocklist`: lista de bloqueados alterada. */
export type BlocklistEvent = {
  action: 'add' | 'remove' | 'set';
  /** IDs canônicos dos usuários */
  users: string[];
};

/** Evento `id-mapping`: o WhatsApp revelou que um LID e um número são a mesma pessoa. */
export type IdMappingEvent = {
  lid: string;
  pn: string;
  /** Número em dígitos */
  phoneNumber: string;
};

/** Tipo de confirmação recebida. O WhatsApp pode enviar outros valores (`inactive`, ...). */
export type ReceiptType = 'delivered' | 'read' | 'played' | (string & {});

/** Evento `receipt`: confirmação de entrega/leitura de mensagens enviadas. */
export type ReceiptEvent = {
  /** Chat (ID canônico) das mensagens confirmadas */
  chatId: string;
  /** Quem confirmou (ID canônico; em grupos é o participante) */
  userId: string;
  /** IDs das mensagens confirmadas (recibos em lote trazem várias) */
  messageIds: string[];
  /** Tipo bruto da confirmação */
  type: ReceiptType;
  /** Momento da confirmação em milissegundos */
  timestamp: number;
  /** `true` quando a confirmação veio de outro dispositivo da própria conta */
  fromSelfDevice: boolean;
};

/** Estado de digitação de um contato. */
export type ChatStateValue = 'composing' | 'recording' | 'paused';

/** Evento `chatstate`: contato digitando/gravando (requer `subscribePresence`). */
export type ChatStateEvent = {
  chat: Chat;
  user: User;
  state: ChatStateValue;
};

/**
 * Evento `message-unavailable`: o servidor entregou só um marcador sem conteúdo.
 * `reason`: `view_once` (visualização única já consumida), `hosted`, `bot` ou `other`.
 */
export type MessageUnavailableEvent = {
  chat: Chat;
  user: User;
  /** ID da mensagem */
  id: string;
  reason: string;
  /** `true` quando o reenvio foi pedido ao celular; o conteúdo chega depois no evento `message` */
  resendRequested: boolean;
  /** Momento da mensagem em milissegundos */
  timestamp: number;
};

/**
 * Evento `message-protocol`: `protocolMessage` bruto recebido (apagar, editar, mensagens
 * temporárias, sincronização...). Apagadas e editadas também chegam no evento `message`
 * (`isDeleted` / `isEdited`); este evento serve para os demais tipos e diagnóstico.
 */
export type MessageProtocolEvent = {
  /** Chat (ID canônico) */
  chatId: string;
  /** Autor (ID canônico) */
  userId: string;
  /** ID da mensagem de protocolo */
  id: string;
  /** ID da mensagem alvo, quando houver (ex.: a mensagem apagada/editada) */
  targetId?: string;
  /** Valor numérico de `proto.Message.ProtocolMessage.Type` */
  type: number;
  /** Nome do tipo (`REVOKE`, `MESSAGE_EDIT`, `EPHEMERAL_SETTING`, ...) */
  typeName?: string;
  fromMe: boolean;
  /** Conteúdo bruto do `protocolMessage` */
  protocolMessage: unknown;
};

/** Evento `picture`: foto de perfil de um contato/grupo/comunidade alterada. */
export type PictureEvent = {
  /** Contato/grupo alterado (ID canônico) */
  id: string;
  /** `set`, `delete`, `request`, `set_avatar` ou outro valor bruto */
  action: string;
  /** Quem fez a alteração, quando diferente de `id` */
  authorId?: string;
  /** ID da nova foto (somente em `set`) */
  pictureId?: number;
  /** Momento da alteração em milissegundos */
  timestamp: number;
  /** Evento bruto do Zapo */
  raw: unknown;
};

/** Evento `inline-query` do Telegram (usuário digitou `@bot consulta`). */
export type InlineQueryEvent = {
  id: string;
  query: string;
  offset: string;
  user: User;
};

/** Evento `pre-checkout-query` do Telegram (confirmação antes de concluir pagamento). */
export type PreCheckoutQueryEvent = {
  id: string;
  currency: string;
  totalAmount: number;
  invoicePayload: string;
  user: User;
};

/** Evento `payment-success` do Telegram (pagamento concluído / Telegram Stars). */
export type PaymentSuccessEvent = {
  chat: Chat;
  user: User;
  messageId: string;
  currency: string;
  totalAmount: number;
  invoicePayload: string;
  telegramChargeId: string;
  providerChargeId: string;
};

/** Evento `message-reaction` (reação em mensagem via Telegram `message_reaction`). */
export type MessageReactionEvent = {
  chat: Chat;
  user: User;
  messageId: string;
  emoji: string;
  added: string[];
  removed: string[];
};

/** Evento `newsletter` (atualizações em canais do WhatsApp). */
export type NewsletterEvent = {
  id: string;
  action: string;
  raw: unknown;
};

/** [Discord] Interação de barra (`/comando`), botão ou select menu. */
export type DiscordInteractionEvent = {
  interactionId: string;
  kind: 'slash' | 'button' | 'select';
  commandName?: string;
  subcommand?: string;
  customId?: string;
  values?: string[];
  options?: Record<string, any>;
  guildId?: string;
  channelId: string;
  chat: Chat;
  user: User;
  raw?: unknown;
};

/** [Discord] Submissão de modal (`ModalBuilder`). */
export type DiscordModalEvent = {
  interactionId: string;
  modalId: string;
  fields: Record<string, string>;
  guildId?: string;
  channelId: string;
  chat: Chat;
  user: User;
  raw?: unknown;
};

/** [Discord] Mudança em canal de voz (`voiceStateUpdate`). */
export type DiscordVoiceEvent = {
  action: 'join' | 'leave' | 'switch' | 'update';
  guildId: string;
  channelId: string;
  oldChannelId?: string;
  selfMute: boolean;
  selfDeaf: boolean;
  serverMute: boolean;
  serverDeaf: boolean;
  chat: Chat;
  user: User;
};

/** [Discord] Mensagem apagada (`messageDelete`). */
export type DiscordMessageDeleteEvent = {
  messageId: string;
  channelId: string;
  guildId?: string;
  text: string;
  chat: Chat;
  user: User;
};

/** [Discord] Cargo criado, atualizado ou excluído. */
export type DiscordRoleUpdateEvent = {
  action: 'create' | 'update' | 'delete';
  guildId: string;
  guildName?: string;
  guildIcon?: string;
  guildMemberCount?: number;
  guildOwnerId?: string;
  roleId: string;
  roleName: string;
  color: string;
  role: { id: string; name: string; color: string };
  chat: Chat;
};
