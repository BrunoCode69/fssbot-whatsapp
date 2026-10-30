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
