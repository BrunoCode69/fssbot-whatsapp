# Rompot (fssbot-whatsapp)

Biblioteca moderna para desenvolvimento de ChatBots multi-plataforma em TypeScript/JavaScript, com fachada unificada (`Client`) e suporte completo a:

- **WhatsApp** — motorizado por [**ZapoJS**](https://zapo.to/) com persistência em **SQLite** (`@zapo-js/store-sqlite`) e resolução canônica **PN ↔ LID**.
- **Telegram** — motorizado por `node-telegram-bot-api`, com Inline Keyboards, Web Apps, Álbuns, Tópicos de Fórum e moderação.
- **Discord** — motorizado por `discord.js` v14, com **Embeds**, **Botões**, **Select Menus**, **Modais**, **Slash Commands**, **Enquetes**, **Gestão de Servidores/Cargos/Canais/Voz** e Webhooks.

---

## 🛠 Recursos

- [x] Fachada única `Client` para **WhatsApp**, **Telegram** e **Discord**
- [x] Motor WhatsApp de alta performance com **ZapoJS 1.11+** e armazenamento unificado em **SQLite**
- [x] Resolução canônica de identidades **PN ↔ LID** no WhatsApp com persistência automática
- [x] Componentes interativos nativos: **Botões**, **Listas / Select Menus**, **Embeds**, **Modais** e **Slash Commands**
- [x] **Enquetes (Polls)** e captura unificada de votos (`pollUpdate`) nas três plataformas
- [x] Download seguro de mídias em memória (`downloadStreamMessage`) ou direto em disco via streaming (`downloadMediaToFile`) com `maxBytes`, `timeoutMs` e `AbortSignal`
- [x] Acesso direto aos clientes nativos quando necessário (`bot.native` no WhatsApp, `bot.bot` no Telegram e `bot.discord` no Discord)

| Recurso | WhatsApp (ZapoJS + SQLite) | Telegram | Discord (discord.js v14) |
| :--- | :---: | :---: | :---: |
| Recebimento de mensagens, menções e citações (`mention`) | ✅ | ✅ | ✅ |
| Envio e download em stream de mídias (imagem, vídeo, áudio, arquivos) | ✅ | ✅ | ✅ |
| Envio e recebimento de figurinhas / stickers | ✅ | ✅ | ✅ |
| Botões interativos (`ButtonMessage` / URL / estilos) | ✅ | ✅ (Inline + WebApp) | ✅ (5 estilos + Emoji + URL) |
| Listas / Menus de seleção (`ListMessage`) | ✅ (Single Select) | ❌ | ✅ (String, User, Role, Channel, Mentionable) |
| Embeds ricos (`discordEmbed` / `discordEmbeds`) | ❌ | ❌ | ✅ |
| Slash Commands, Modais e respostas efêmeras | ❌ | ❌ | ✅ |
| Enquetes (`PollMessage`) e captura de votos (`pollUpdate`) | ✅ | ✅ | ✅ |
| Reações em mensagens (`addReaction` / `removeReaction`) | ✅ | ✅ | ✅ |
| Edição de mensagens (`editMessage`) | ✅ (texto) | ✅ (texto e teclado) | ✅ (texto, embeds e componentes) |
| Fixação e desafixação de mensagens (`pinMessage` / `unpinMessage`) | ✅ | ✅ | ✅ |
| Gestão de grupos (membros, admins, convites) | ✅ | ✅ | — *(usa Servidores)* |
| Gestão de servidores, cargos, canais, threads e voz | — | 🔧 (Tópicos/Fórum) | ✅ |

---

## 📦 Instalação

```bash
# Com bun
bun add rompot

# Com npm
npm install rompot
```

Importação:

```ts
// TypeScript / ESM
import {
  Client,
  WhatsAppBot,
  TelegramBot,
  DiscordBot,
  SqliteAuthState,
  MultiFileAuthState,
} from "rompot";

// CommonJS
const {
  Client,
  WhatsAppBot,
  TelegramBot,
  DiscordBot,
  SqliteAuthState,
} = require("rompot");
```

---

## 🚀 WhatsApp (`WhatsAppBot`)

### Conexão via QR Code

Por padrão, a sessão é salva em um único banco SQLite (`session.sqlite`). Na primeira conexão, o evento `qr` emite a string para exibir no terminal ou gerar QR Code em imagem:

```ts
import { Client, WhatsAppBot, SqliteAuthState } from "rompot";

const bot = new WhatsAppBot();
const client = new Client(bot);

client.on("qr", (qr) => {
  console.log("Escaneie o QR Code:", qr);
});

client.on("open", () => {
  console.log("WhatsApp conectado com sucesso!");
});

const auth = new SqliteAuthState("./sessions");
await client.connect(auth);
```

### Conexão via Código de Pareamento (Phone Number)

Para conectar sem câmera usando o código de 8 dígitos do WhatsApp:

```ts
import { Client, WhatsAppBot, SqliteAuthState } from "rompot";

const bot = new WhatsAppBot();
const client = new Client(bot);

client.on("code", (code) => {
  console.info("Digite este código no seu celular:", code);
});

// Número em formato internacional (apenas dígitos)
const auth = new SqliteAuthState("./sessions", "5511991234567");
await client.connect(auth);
```

> **Compatibilidade:** `MultiFileAuthState("./sessions", botPhoneNumber)` permanece disponível e herda internamente de `SqliteAuthState`.

### Armazenamento SQLite & Identidades PN ↔ LID

O módulo utiliza o driver SQLite nativo (`bun:sqlite` no Bun ou `node:sqlite` no Node 22+):

- **Domínios ZapoJS**: `auth`, `signal`, `preKey`, `session`, `identity`, `senderKey`, `appState`, `privacyToken`, `messages`, `threads` e `contacts`.
- **Tabelas internas do Rompot**: `rompot_records` (chats, usuários e enquetes) e `rompot_lid_mapping` (mapeamentos permanentes `LID ↔ PN`).
- **ID Canônico**: `message.user.id` entrega sempre o **PN** (`5511999999999@s.whatsapp.net`) quando conhecido, ou o **LID** (`123456789@lid`) apenas se o número estiver oculto. Use `await client.resolveId(id)` e `await client.getUserIdentity(id)` para consultar todos os identificadores.
- **Cliente nativo**: `bot.native` expõe diretamente a instância tipada `WaClient` do ZapoJS (`message`, `newsletter`, `group`, `profile`, `privacy`).

---

## ✈️ Telegram (`TelegramBot`)

```ts
import { Client, TelegramBot, ButtonMessage } from "rompot";

const bot = new TelegramBot();
const client = new Client(bot);

client.on("open", () => {
  console.log("Bot Telegram conectado!");
});

client.on("message", async (msg) => {
  if (msg.fromMe) return;

  if (msg.text === "/start") {
    const menu = new ButtonMessage(msg.chat, "Bem-vindo ao bot!");
    menu.addReply("Ver Planos", "ver_planos");
    menu.addUrl("Documentação", "https://bdfw.com.br/doc");
    menu.addWebApp("Abrir Mini App", "https://app.exemplo.com");
    await client.send(menu);
  }
});

await client.connect("SEU_TELEGRAM_BOT_TOKEN");
```

Recursos adicionais expostos no `Client` para Telegram incluem: `answerCallbackQuery`, `banTelegramMember`, `unbanTelegramMember`, `muteTelegramMember`, `unmuteTelegramMember`, `sendDice`, `sendChatAction`, `sendMediaGroup` (álbuns), `createForumTopic`, `closeForumTopic`, `reopenForumTopic`, `deleteForumTopic`, `createInviteLink`, `approveChatJoinRequest` e `declineChatJoinRequest`.

---

## 🎮 Discord (`DiscordBot`)

### Conexão e Gateway Intents

O `DiscordBot` aceita uma lista de nomes de intents (`DiscordIntentKey[]`) ou um bitmask numérico via `resolveDiscordIntents`. Quando omitido, usa `DEFAULT_DISCORD_INTENTS`:

```ts
import { Client, DiscordBot } from "rompot";

const bot = new DiscordBot({
  intents: [
    "Guilds",
    "GuildMessages",
    "MessageContent",
    "GuildMembers",
    "GuildVoiceStates",
    "GuildMessageReactions",
    "GuildMessagePolls",
    "DirectMessages",
  ],
});
const client = new Client(bot);

client.on("open", () => {
  console.log("Bot Discord online como:", bot.name);
});

await client.connect("SEU_DISCORD_BOT_TOKEN");
```

> **Nota sobre Intents Privilegiadas:** `MessageContent`, `GuildMembers` e `GuildPresences` exigem ativação prévia no [Discord Developer Portal](https://discord.com/developers/applications) (*Bot → Privileged Gateway Intents*).

### Embeds, Botões, Select Menus, Slash Commands e Modais

```ts
import { ButtonMessage, ListMessage, Message } from "rompot";

// 1. Mensagem com Embed + Botões estilizados
const painel = new ButtonMessage(channelId, "Gerencie seu atendimento:");
painel.extra = {
  discordEmbed: {
    title: "Central de Suporte",
    description: "Clique em um dos botões abaixo para continuar.",
    color: "#5865F2",
    fields: [{ name: "Status", value: "Online", inline: true }],
    footer: "Rompot Discord",
    timestamp: true,
  },
};
painel.addReply("Abrir Ticket", "abrir_ticket", "success", "🎫");
painel.addReply("Cancelar", "cancelar", "danger", "✖️");
painel.addUrl("Site Oficial", "https://bdfw.com.br");
const enviada = await client.send(painel);

// Edição rica de mensagens no Discord (texto, embeds e componentes)
const atualizado = new Message(channelId, "");
atualizado.id = enviada.id;
atualizado.extra = {
  discordEmbed: { title: "Ticket iniciado!", color: "#57F287" },
};
await bot.editMessage(atualizado);

// 2. Select Menus (string, user, role, channel ou mentionable)
const menuCargos = new ListMessage(channelId, "Selecione os cargos:");
menuCargos.selectType = "role";
menuCargos.minValues = 1;
menuCargos.maxValues = 3;
await client.send(menuCargos);

// 3. Registro de Slash Commands (com suporte a opções tipadas e anexos)
await client.registerSlashCommands([
  {
    name: "decrypt",
    description: "Processa um arquivo enviado",
    options: [
      { name: "arquivo", description: "Anexo para análise", type: "attachment", required: false },
    ],
  },
]);

// 4. Respostas efêmeras e Modais em interações
client.on("discord-interaction", async (ev) => {
  if (ev.kind === "button" && ev.customId === "abrir_ticket") {
    await client.showDiscordModal(ev.interactionId, {
      id: "modal_ticket",
      title: "Novo Ticket",
      inputs: [
        { id: "assunto", label: "Assunto", style: "short", required: true },
        { id: "detalhes", label: "Descrição", style: "paragraph", required: true },
      ],
    });
  }
});

client.on("discord-modal", async (ev) => {
  await client.replyInteraction(
    ev.interactionId,
    "Ticket registrado: " + ev.fields.assunto,
    true, // ephemeral
  );
});
```

### Gestão de Servidores, Cargos, Canais, Moderação e Voz

No Discord, a administração de comunidades utiliza métodos dedicados de **Servidor (Guild)**:

- **Servidor**: `isServerAdmin`, `isServerMember`, `getServerMembers`, `getServerAdmins`, `getServerInvite`, `setServerName`, `setServerDescription`, `setServerIcon`, `leaveServer`.
- **Cargos e Permissões**: `addRoleToUser`, `removeRoleFromUser`, `userHasRole`, `getMemberRoles`, `createGuildRole`, `deleteGuildRole`, `userHasPermission`.
- **Moderação**: `timeoutMember`, `kickMember`, `banGuildMember`, `unbanGuildMember`, `setMemberNickname`, `purgeMessages`.
- **Canais, Threads e Webhooks**: `createGuildChannel`, `deleteGuildChannel`, `setChannelTopic`, `setChannelSlowmode`, `setChannelPermission`, `createThread`, `archiveThread`, `lockThread`, `sendDiscordWebhook`.
- **Voz e Presença**: `moveVoiceMember`, `muteVoiceMember`, `deafenVoiceMember`, `disconnectVoiceMember`, `setBotActivity`.
- **Cliente nativo**: `bot.discord` expõe a instância completa de `Client` do `discord.js`.

---

## 💬 Mensagens, Mídias e Download em Stream

As classes de mensagem são compartilhadas entre **WhatsApp**, **Telegram** e **Discord**:

```ts
import {
  Message,
  ImageMessage,
  VideoMessage,
  AudioMessage,
  FileMessage,
  StickerMessage,
  PollMessage,
} from "rompot";

// Texto, menções e citação (reply)
const msg = new Message(chat, "Olá!");
msg.mention = originalMessage;
await client.send(msg);

// Reações, fixação e exclusão
await client.addReaction(msg, "✅");
await client.pinMessage(msg);
await client.unpinMessage(msg);
await client.deleteMessage(msg);

// Envio de arquivos e mídias
const doc = new FileMessage(chat, "Segue o relatório", fileBuffer, {
  name: "relatorio.pdf",
  mimetype: "application/pdf",
});
await client.send(doc);

// Enquetes (WhatsApp, Telegram e Discord)
const poll = new PollMessage(chat, "Qual sua plataforma principal?");
poll.addOption("WhatsApp", "wa");
poll.addOption("Telegram", "tg");
poll.addOption("Discord", "dc");
await client.send(poll);

// Download de mídia recebida (memória ou streaming direto para arquivo com limite de bytes)
const buffer = await client.downloadStreamMessage(incomingMediaMsg, {
  maxBytes: 25 * 1024 * 1024,
  timeoutMs: 30_000,
});

await client.downloadMediaToFile(incomingMediaMsg, "./tmp/anexo.bin", {
  maxBytes: 50 * 1024 * 1024,
  timeoutMs: 60_000,
});
```

---

## 📡 Eventos do Cliente

```ts
// Ciclo de vida da conexão
client.on("connecting", () => {});
client.on("open", (info) => console.log("Conectado:", info));
client.on("reconnecting", () => console.log("Reconectando..."));
client.on("close", (info) => console.log("Conexão encerrada:", info));
client.on("stop", ({ isLogout }) => console.log("Parado. Logout:", isLogout));
client.on("error", (err) => console.error("Erro:", err));

// Autenticação WhatsApp
client.on("qr", (qr) => {});
client.on("code", (code) => {});

// Mensagens, botões, listas/selects e votos de enquete
client.on("message", async (message) => {
  if (message.fromMe) return;

  if (message.selected) {
    console.log("Item/botão selecionado:", message.selected);
  }
  if (message.type === "pollUpdate") {
    console.log("Voto de enquete:", message.text, message.action);
  }
});

// Comunidade e presença
client.on("user", ({ action, chat, user, fromUser }) => {});
client.on("presence", ({ chat, user, status }) => {});

// Específicos de WhatsApp
client.on("group-update", (ev) => {});
client.on("group-join-request", (ev) => {});
client.on("call", (call) => client.rejectCall(call));
client.on("id-mapping", ({ lid, pn, phoneNumber }) => {});

// Específicos de Discord
client.on("discord-interaction", (ev) => {});
client.on("discord-modal", (ev) => {});
client.on("voice-state", (ev) => {});
```

---

## 👥 Gestão de Grupos (WhatsApp & Telegram)

```ts
const admins = await client.getChatAdmins(chat);
const members = await client.getChatUsers(chat);
const leader = await client.getChatLeader(chat);

await client.setChatName(chat, "Novo Nome do Grupo");
await client.setChatDescription(chat, "Nova Descrição");
await client.setChatProfile(chat, imageBuffer);

await client.addUserInChat(chat, user);
await client.removeUserInChat(chat, user);
await client.promoteUserInChat(chat, user);
await client.demoteUserInChat(chat, user);

const invite = await client.getChatInvite(chat);

// Controles exclusivos de grupos WhatsApp
await client.setChatAnnounce(chat, true);
await client.setChatLocked(chat, true);
await client.setChatEphemeral(chat, 604800);
await client.setChatJoinApproval(chat, true);
```

---

## 🧪 Build e Testes

Sempre que alterar arquivos em `src/`, recompile `lib/` e rode a suíte de testes:

```bash
bun run clean && bun run tsc && bun test
```

---

## 📄 Licença

Este projeto está sob a licença MIT.
