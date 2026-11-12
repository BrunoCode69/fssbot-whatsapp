# Rompot (fssbot-whatsapp)

Biblioteca moderna para desenvolvimento de ChatBots multi-plataforma em JavaScript/TypeScript, com suporte completo a **WhatsApp** (motorizado por [**ZapoJS**](https://zapo.to/) com persistência em **SQLite**) e **Telegram**.

---

## 🛠 Recursos

- [x] Motor WhatsApp de alta performance com **ZapoJS 1.11+**
- [x] Armazenamento unificado e eficiente em **SQLite** (`@zapo-js/store-sqlite`)
- [x] Suporte nativo a **Botões Interativos** (Quick Reply) e **Listas** (Single Select)
- [x] Descriptografia automática de **votos de enquetes**, **reações** e **edições** via `message_addon`
- [x] Resolução canônica de identidades **PN ↔ LID** com persistência no SQLite
- [x] Acesso direto ao cliente nativo tipado via `bot.native` (`WaClient`)
- [x] Módulo **Telegram** integrado
- [x] Sistema de comandos e mensagens estruturadas

| Recursos | WhatsApp (ZapoJS + SQLite) | Telegram |
| :--- | :---: | :---: |
| Recebimento de mensagens | ✅ | ✅ |
| Envio de texto e menções | ✅ | ✅ |
| Envio de mídias (imagem, vídeo, áudio/PTT, arquivos) | ✅ | ✅ |
| Envio de figurinhas / stickers com metadados | ✅ | ✅ |
| Envio de botões interativos (Quick Reply) | ✅ | ✅ (Inline Keyboard) |
| Envio de listas interativas (Single Select) | ✅ | ❌ |
| Envio de enquetes (Polls) e captura de votos | ✅ | ✅ |
| Reações em mensagens | ✅ | ❌ |
| Fixação e desafixação de mensagens (Pin) | ✅ | ✅ |
| Edição de mensagens | ✅ | ✅ |
| Gestão de grupos (membros, permissões, convites, aprovações) | ✅ | ✅ |
| Canais / Newsletters | ✅ (`bot.native.newsletter`) | 🔧 |

---

## 📦 Instalação

```bash
# Com npm
npm install rompot zapo-js @zapo-js/store-sqlite

# Com bun
bun add rompot zapo-js @zapo-js/store-sqlite
```

Importação:

```ts
// TypeScript
import Client, { WhatsAppBot, SqliteAuthState, MultiFileAuthState, TelegramBot } from "rompot";

// JavaScript
const { Client, WhatsAppBot, SqliteAuthState, MultiFileAuthState, TelegramBot } = require("rompot");
```

---

## 🚀 WhatsApp

### Conexão via QR Code

Por padrão, a sessão é salva em um banco SQLite (`session.sqlite`). Na primeira conexão, o evento `qr` emitirá a string para você exibir no terminal ou gerar a imagem:

```ts
import Client, { WhatsAppBot, SqliteAuthState } from "rompot";

const bot = new WhatsAppBot();
const client = new Client(bot);

client.on("qr", (qr) => {
  console.log("Escaneie o QR Code:", qr);
});

client.on("open", () => {
  console.log("WhatsApp conectado com sucesso!");
});

// Salva em ./sessions/session.sqlite
const auth = new SqliteAuthState("./sessions");
await client.connect(auth);
```

### Conexão via Código de Pareamento (Phone Number)

Para conectar sem câmera usando o código de 8 dígitos enviado pelo WhatsApp:

```ts
import Client, { WhatsAppBot, SqliteAuthState } from "rompot";

const bot = new WhatsAppBot();
const client = new Client(bot);

client.on("code", (code) => {
  console.info(`Digite este código no seu celular: ${code}`);
});

// Informe o número em formato internacional (apenas dígitos)
const botPhoneNumber = "5511991234567";
const auth = new SqliteAuthState("./sessions", botPhoneNumber);

await client.connect(auth);
```

> **Nota de Compatibilidade:** Se seu código usa `MultiFileAuthState("./sessions", botPhoneNumber)`, ele continua funcionando perfeitamente — internamente ele herda de `SqliteAuthState` e armazena os dados no SQLite de forma robusta e compacta.

---

## 🗄️ Armazenamento em SQLite

Diferente das versões antigas que geravam milhares de arquivos JSON em disco, o novo módulo utiliza o driver SQLite nativo (`bun:sqlite` no Bun ou `node:sqlite` no Node 22+):

- **Domínios ZapoJS**: `auth`, `signal`, `preKey`, `session`, `identity`, `senderKey`, `appState`, `privacyToken`, `messages`, `threads`, `contacts`.
- **Tabelas internas do Rompot**:
  - `rompot_records`: Armazena registros de chats (`chats-*`), usuários (`users-*`) e enquetes (`polls-*`).
  - `rompot_lid_mapping`: Armazena permanentemente os mapeamentos `LID ↔ PN` aprendidos.

---

## ⚡ Acesso Direto ao ZapoJS (`bot.native`)

Para recursos avançados ou futuros da BDFW, você pode acessar diretamente a instância de `WaClient` através de `bot.native`:

```ts
const bot = new WhatsAppBot();
const client = new Client(bot);
await client.connect(auth);

// Acesso aos coordinators nativos do ZapoJS:
const zapo = bot.native;

// Envio nativo
await zapo.message.send("5511999999999", "Olá!");

// Newsletters / Canais
const channel = await zapo.newsletter.queryMetadata("120363@newsletter");

// Grupos
const metadata = await zapo.group.queryGroupMetadata("120363@g.us");

// Perfil e Privacidade
await zapo.profile.setPushName("Meu Bot");
const blocklist = await zapo.privacy.getBlocklist();
```

---

## 💬 Mensagens

### Texto e Menções

```ts
import { Message } from "rompot";

// Envio simples
await client.sendMessage(chat, "Olá mundo!");

// Mensagem com menções e citação
const msg = new Message(chat, "Olá @5511999999999!");
msg.mentions = ["5511999999999@s.whatsapp.net"];
msg.mention = originalMessage; // citação / reply
await client.send(msg);

// Editar mensagem
await client.editMessage(msg, "Texto corrigido!");

// Apagar mensagem para todos (Revoke)
await client.deleteMessage(msg);

// Reagir
await client.addReaction(msg, "❤️");
await client.removeReaction(msg);

// Fixar mensagem (Pin)
await client.pinMessage(msg, 604800); // 24h (86400), 7d (604800) ou 30d (2592000)
```

### Mídias

```ts
import { ImageMessage, VideoMessage, AudioMessage, FileMessage, StickerMessage } from "rompot";

// Imagem
const image = new ImageMessage(chat, "Legenda da imagem", imageBuffer);
await client.send(image);

// Áudio / Nota de Voz (PTT)
const audio = new AudioMessage(chat, audioBuffer);
audio.isPTT = true; // envia como gravação de voz
await client.send(audio);

// Vídeo (ou GIF)
const video = new VideoMessage(chat, "Vídeo demonstrativo", videoBuffer);
video.isGIF = true; // reprodução contínua sem áudio
await client.send(video);

// Documento / Arquivo
const file = new FileMessage(chat, "Relatório PDF", fileBuffer);
file.name = "relatorio.pdf";
file.mimetype = "application/pdf";
await client.send(file);

// Figurinha / Sticker
const sticker = new StickerMessage(chat, stickerBuffer);
sticker.pack = "Meu Pack";
sticker.author = "Rompot Bot";
await client.send(sticker);

// Baixar mídia recebida
const buffer = await client.downloadStreamMessage(incomingMediaMessage);
```

### Botões Interativos (Quick Reply)

Os botões utilizam as mensagens interativas nativas do WhatsApp (`nativeFlowMessage`):

```ts
import { ButtonMessage } from "rompot";

const buttons = new ButtonMessage(chat, "Escolha uma opção:", "Rodapé opcional");
buttons.addReply("Opção 1", "btn_1");
buttons.addReply("Opção 2", "btn_2");
buttons.addReply("Suporte", "btn_support");

await client.send(buttons);
```

### Listas Interativas (Single Select)

```ts
import { ListMessage } from "rompot";

const list = new ListMessage(chat, "Selecione um produto do cardápio:", "Abrir Cardápio", "Cardápio", "Preços válidos hoje");
const lanches = list.addCategory("Lanches");
list.addItem(lanches, "X-Burger", "Pão, carne e queijo", "item_burger");
list.addItem(lanches, "X-Salada", "Com salada fresca", "item_salada");

const bebidas = list.addCategory("Bebidas");
list.addItem(bebidas, "Suco Natural", "Laranja ou Maracujá", "item_suco");

await client.send(list);
```

### Enquetes (Polls)

```ts
import { PollMessage } from "rompot";

const poll = new PollMessage(chat, "Qual seu framework favorito?");
poll.addOption("ZapoJS", "opt_zapo");
poll.addOption("Outro", "opt_outro");
poll.extra.selectableCount = 1; // 1 = escolha única

await client.send(poll);
```

---

## 👥 IDs no WhatsApp: PN e LID

No WhatsApp atual, um contato possui dois identificadores:
- **PN (Phone Number)**: `5511999999999@s.whatsapp.net`
- **LID (Linked Identity)**: `123456789@lid`

O Rompot padroniza tudo para **um único ID canônico**:
- O **PN** sempre que o número for conhecido;
- O **LID** apenas se o número estiver oculto (ex: grupos anônimos).

```ts
message.user.id;          // ID canônico (PN quando conhecido)
message.user.phoneNumber; // "5511999999999" (vazio se oculto)
message.user.lid;         // "123456789@lid"

// Resolução de ID
const pn = await client.resolveId("123456789@lid");
const identity = await client.getUserIdentity("5511999999999");
// -> { id, pn, lid, phoneNumber }
```

---

## 📡 Eventos do Cliente

```ts
// Conexão
client.on("open", ({ isNewLogin }) => console.log("Conectado! Novo login:", isNewLogin));
client.on("close", ({ reason }) => console.log("Desconectado:", reason));
client.on("stop", ({ isLogout, reason }) => console.log("Parado. Logout:", isLogout));
client.on("qr", (qr) => { ... });
client.on("code", (code) => { ... });

// Mensagens recebidas
client.on("message", async (message) => {
  if (message.fromMe) return;

  // Resposta a botões ou listas
  if (message.selected) {
    console.log(`Usuário clicou no item/botão ID: ${message.selected}`);
  }

  // Voto em enquete
  if (message.type === "pollUpdate") {
    console.log(`Voto alterado: ${message.text} (ação: ${message.action})`);
  }

  // Comando simples
  if (message.text === "!ping") {
    await message.reply("Pong via ZapoJS! 🏓");
  }
});

// Eventos de usuários em grupos
client.on("user", ({ action, event, chat, user, fromUser }) => {
  // action: 'join' | 'leave' | 'add' | 'remove' | 'promote' | 'demote'
});

// Configuração de grupo alterada
client.on("group-update", ({ action, changes, chat, fromUser }) => {
  // action: 'name' | 'description' | 'announce' | 'restrict' | 'inviteCode' | 'memberAddMode' | 'joinApprovalMode' | 'ephemeralDuration'
});

// Pedido de entrada em grupo com aprovação
client.on("group-join-request", ({ action, method, chat, user, fromUser }) => {
  // action: 'created' | 'revoked' | 'rejected'
});

// Presença e status
client.on("presence", ({ chat, user, status, lastSeen }) => {
  // status: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused'
});

// Chamadas
client.on("call", (call) => {
  console.log(`Chamada recebida de: ${call.user.id}`);
  // Rejeitar chamada se desejado:
  client.rejectCall(call);
});

// Lista de bloqueados
client.on("blocklist", ({ action, users }) => {
  console.log("Blocklist atualizada:", users);
});

// Mapeamento de LID aprendido
client.on("id-mapping", ({ lid, pn, phoneNumber }) => {
  console.log(`LID ${lid} mapeado para ${pn} (${phoneNumber})`);
});
```

---

## 🤖 Gestão de Grupos

```ts
// Informações do grupo
const admins = await client.getChatAdmins(chat);
const users = await client.getChatUsers(chat);
const leader = await client.getChatLeader(chat);

// Alterações administrativas
await client.setChatName(chat, "Novo Nome");
await client.setChatDescription(chat, "Nova Descrição");
await client.setChatProfile(chat, imageBuffer);
await client.setChatAnnounce(chat, true); // apenas admins enviam mensagens
await client.setChatLocked(chat, true);   // apenas admins alteram dados do grupo
await client.setChatEphemeral(chat, 604800); // mensagens temporárias de 7 dias
await client.setChatMemberAddMode(chat, false); // apenas admins adicionam membros
await client.setChatJoinApproval(chat, true); // entrada exige aprovação

// Membros
await client.addUserInChat(chat, user);
await client.removeUserInChat(chat, user);
await client.promoteUserInChat(chat, user);
await client.demoteUserInChat(chat, user);

// Pedidos de entrada
const requests = await client.getChatJoinRequests(chat);
await client.updateChatJoinRequests(chat, [user], "approve"); // ou "reject"

// Convites
const inviteCode = await client.getChatInvite(chat);
await client.revokeChatInvite(chat);
await client.joinChat("https://chat.whatsapp.com/CODIGO");
```

---

## ✈️ Telegram

O módulo Telegram permanece disponível para bots do Telegram:

```ts
import Client, { TelegramBot } from "rompot";

const bot = new TelegramBot();
const client = new Client(bot);

client.on("open", () => {
  console.log("Bot Telegram conectado!");
});

client.on("message", async (msg) => {
  if (msg.text === "/start") {
    await msg.reply("Olá pelo Telegram!");
  }
});

await client.connect("SEU_TELEGRAM_BOT_TOKEN");
```

---

## 📄 Licença

Este projeto está sob a licença MIT.
