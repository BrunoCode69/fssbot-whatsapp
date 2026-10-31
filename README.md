# Rompot

Uma biblioteca para desenvolvimento de ChatBot multi-plataforma em JavaScript/TypeScript

## 🛠 Recursos

- [x] Simples uso
- [x] Criação de comandos
- [x] Resposta rápida
- [x] Tratamento de solicitações
- [x] Tratamento de conexão
- [x] Alta personalização
- [x] Suporte a Cluster (Beta)

| Plataformas            | Whatsapp | Telegram (Beta) |
| ----------------------- | -------- | --------------- |
| Recebimento de mensagem | ✅       | ✅              |
| Envio de texto          | ✅       | ✅              |
| Envio de mídia          | ✅       | ✅              |
| Envio de stickers       | ✅       | ✅              |
| Envio de lista          | ❌       | ❌              |
| Envio de botão          | ❌       | ❌              |
| Envio de enquete        | ✅       | ✅              |
| Criação de chats        | ✅       | 🔧              |
| Histórico de mensagens  | ✅       | ❌              |

### 🔧 Instalação

Instalando pacote

```sh
npm i rompot
```

Importando pacote

```ts
// TypeScript
import Client, { WhatsAppBot, TelegramBot } from "rompot";

// Javascript
const { Client, WhatsAppBot, TelegramBot } = require("rompot");
```

## WhatsApp

Após iniciar o bot um QR Code será emprimido no terminal, escane-o com seu WhatsApp para gerar uma nova conexão entre seu número e o Client. Essa conexão será guardada em `./path-to-auth`, para gerar uma nova delete-o ou se conecte com um novo caminho de sessão.

```ts
const client = new Client(new WhatsAppBot());
client.connect("./path-to-auth");

client.on("qr", (qr) => {
  console.log("Scan QR:", qr);
});
```

## Parear código

Necessita passar um método de autenticação personalizado incluindo o número do bot a ser conectado.

```ts
import Client, { WhatsAppBot, MultiFileAuthState } from "rompot";

const client = new Client(new WhatsAppBot());

client.on("code", (code) => {
  console.info("Código de pareamento gerado:", code);
});

const botPhoneNumber = "5511991234567";

const auth = new MultiFileAuthState("./path-to-auth", botPhoneNumber));

await client.connect(auth);
```

## Telegram (Beta)

Altere o valor `BOT_TOKEN` para o token do seu bot para se conectar a ele, acaso não tenha consulte a documentação do [Telegram](https://core.telegram.org/bots/api) para gerar um.

```ts
const client = new Client(new TelegramBot());
client.connect("BOT_TOKEN");

client.on("open", () => {
  console.log("Bot conectado!");
});
```

## Configurações

```ts
type ConnectionConfig = {
  /** Desativa execução do comando automático */
  disableAutoCommand: boolean;
  /** Desativa os comandos para mensagem antiga */
  disableAutoCommandForOldMessage: boolean;
  /** Desativa a execução do comando automático para mensagens não oficiais */
  disableAutoCommandForUnofficialMessage: boolean;
  /** Desativa a digitação automatica */
  disableAutoTyping: boolean;
  /** Desativa a leitura automatica de uma mensagem */
  disableAutoRead: boolean;
  /** Máximo de reconexões possíveis */
  maxReconnectTimes: number;
  /** Tempo de aguarde para se reconectar */
  reconnectTimeout: number;
  /** Máximo de tentativas de solitação acaso a primeira falhe */
  maxRequests: number;
  /** Tempo necessário de aguardo para próxima tentativa de solicitação */
  requestsDelay: number;
  /** Tempo máximo de espera */
  maxTimeout: number;
};

client.config = config;
```

## ⚙️ Criando comandos

```ts
import { CMDKey, Command, Message } from "rompot";

// Cria um comando com o nome hello
// Ao ser executado envia a mensagem "Hello World!"
class HelloCommand extends Command {
  public onRead() {
    this.keys = [CMDKey("hello")];
  }

  public async onExec(message: Message) {
    await message.reply(`Hello World!`);
  }
}

// Listando comandos
const commands = [new HelloCommand(), new DateCommand()];

client.setCommands(commands);
```

## Eventos

### Conexão

```ts
client.on("open", (open) => {
  console.log("Cliente conectado!");
});

client.on("close", (update) => {
  console.info(`Cliente desconectou! Motivo: ${update.reason}`);
});

client.on("stop", (update) => {
  if (update.isLogout) {
    console.info(`Cliente desligado!`);
  } else {
    console.info(`Cliente parado!`);
  }
});

client.on("connecting", (conn) => {
  console.log("Conectando cliente...");
});

client.on("reconnecting", (conn) => {
  console.log("Reconectando cliente...");
});
```

### Mensagem

```ts
client.on("message", (message) => {
  console.log(`Mensagem recebida de "${message.user.name}"`);

  if (message.text == "Oi") {
    message.reply("Olá");
  }
});
```

### Usuários

```ts
client.on("user", async (update) => {
  if (update.action == "join") {
    await client.send(new Message(update.chat, `@${update.fromUser.id} entrou no grupo.`));
  }

  if (update.action == "leave") {
    await client.send(new Message(update.chat, `@${update.fromUser.id} saiu do grupo...`));
  }

  if (update.action == "add") {
    await client.send(new Message(update.chat, `Membro @${update.fromUser.id} adicionou o @${update.user.id} ao grupo!`));
  }

  if (update.action == "remove") {
    client.send(new Message(update.chat, `Membro @${update.fromUser.id} removeu o @${update.user.id} do grupo.`));
  }

  if (update.action == "promote") {
    client.send(new Message(update.chat, `Membro @${update.fromUser.id} promoveu o @${update.user.id} para admin!`));
  }

  if (update.action == "demote") {
    await client.send(new Message(update.chat, `Membro @${update.fromUser.id} removeu o admin do @${update.user.id}.`));
  }
});
```

### Erro interno

```ts
client.on("error", (err) => {
  console.error(`Um erro ocorreu: ${err}`);
});
```

## Mensagem

```ts
import { Message } from "rompot";

// Chat
const chat = new Chat("id12345");

// Criar mensagem
const msg = new Message(chat, "texto");

// Enviar mensagem
const saveMsg = await client.send(msg);

// Edita uma mensagem enviada
await client.editMessage(saveMsg, "novo texto");

// Mencionar usuário
msg.mentions.push("userId");

// Marcar mensagem
msg.mention = message;

// Responder mensagem
msg.reply(message);

// Visualiza uma mensagem recebida
msg.read();

// Reage a mensagem
msg.addReaction("❤");

// Remove a reação de uma mensagem
msg.removeReaction();
```

## Mensagem de mídia

```ts
import { ImageMessage, VideoMessage, AudioMessage, FileMessage, StickerMessage } from "rompot";

// Criar mensagem de audio
const audioMessage = new AudioMessage(chat, Buffer.from(""));

// Criar mensagem com imagem
const imageMessage = new ImageMessage(chat, "texto", Buffer.from(""));

// Criar mensagem com video
const videoMessage = new VideoMessage(chat, "texto", Buffer.from(""));

// Criar mensagem de arquivo
const fileMessage = new FileMessage(chat, "texto", Buffer.from(""));

// Criar mensagem de sticker
const stickerMessage = new StickerMessage(chat, Buffer.from(""));
```

## Outros tipos de mensagem

```ts
import { LocationMessage, ContactMessage, ButtonMessage, ListMessage, PollMessage } from "rompot";

// Criar mensagem de localiação
// Latitude, Longitude
const locationMessage = new LocationMessage(chat, 24.121231, 55.1121221);

// Obter dados do endereço da localização
const address = await locationMessage.getAddress();

// Criar mensagem com contatos
const contactMessage = new ContactMessage(chat, "nome", "userId");

// Criando botões
const btnMessage = new ButtonMessage(chat, "texto", "rodapé");
btnMessage.addCall("Call", "1234567890");
btnMessage.addUrl("Link", "https://example.com");
btnMessage.addReply("Texto", "button-id-123");

// Criar lista
const listMessage = new ListMessage(chat, "texto", "botão", "titulo", "rodapé");
const index1 = listMessage.addCategory("Categoria 1");
const index2 = listMessage.addCategory("Categoria 2");

listMessage.addItem(index1, "Item 1");
listMessage.addItem(index1, "Item 2");

listMessage.addItem(index2, "Abc 1");
listMessage.addItem(index2, "Abc 2");

// Criar enquete
const pollMessage = new PollMessage(chat, "Hello World!");

pollMessage.addOption("Hello", "id-hello-123");
pollMessage.addOption("Hey", "id-hey-123");
pollMessage.addOption("Hi", "id-hi-123");
```

## Mensagem personalizada

```ts
import { CustomMessage } from "rompot";

// Ex: conteúdo para baileys
const content = { text: "texto" }; 

// O conteúdo inserido será enviado diretamente para a plataforma
const customMessage = new CustomMessage(chat, content);

// Adicionando opções adicionais
// Essas alterações serão tratadas pelo processamento da plataforma

//? Na baileys utiliza o relayMessage invés de sendMessage
customMessage.extra = { isRelay: true }; 
```

## Lendo resposas de ButtonMessage, ListMessage e PollMessage

```ts
import { Command, Message, CMDKey, CMDRunType, isPollMessage } from "rompot";

class ButtonCommand extends Command {
  public onRead() {
    this.keys = [CMDKey("cmd-button")];
  }

  // Recebe uma resposta ao comando
  public async onReply(message: Message) {
    await message.reply(`Button Clicked!`);
  }
}

client.addCommand(new ButtonCommand());

client.on("message", async (message: Message) => {
  if (isPollMessage(message)) {
    // Não responde caso a votação da enquete for removida
    if (message.action == "remove") return;
  }

  // Verifica o ID passado na mensagem como opção
  if (message.selected == "button-id-123") {
    const cmd = client.getCommand("cmd-button");

    // Manda a resposta ao comando
    if (cmd) client.runCommand(cmd, message, CMDRunType.Reply);
  }
}):
```

## Bot

- Definir foto de perfil

```ts
client.setBotProfile(Buffer.from(""));
```

- Obter foto de perfil do bot

```ts
client.getBotProfile();
```

- Definir nome do bot

```ts
client.setBotName("Name");
```

- Definir descrição do bot

```ts
client.setBotDescription("Description");
```

- Obter descrição do bot

```ts
client.getBotDescription();
```

## Grupo

Você pode obter o chat em `message.chat` ou `client.getChat("id")`, o ID pode ser encontrado em `message.chat.id`

- Criar grupo

```ts
client.createChat("name");
```

- Sair de um grupo

```ts
client.leaveChat(chat);
```

- Definir imagem do grupo

```ts
client.setChatProfile(chat, Buffer.from(""));
```

- Obter imagem do grupo

```ts
client.getChatProfile(chat);
```

- Definir nome do grupo

```ts
client.setChatName(chat, "Name chat");
```

- Obter nome do grupo

```ts
client.getChatName(chat);
```

- Definir a descrição do grupo

```ts
client.setChatDescription(chat, "Chat description");
```

- Obter descrição do grupo

```ts
client.getChatDescription(chat);
```

- Adicionar membro
  - Você pode encontrar o user em `message.user`, o ID pode se encontrado em `message.user.id`

```ts
client.addUserInChat(chat, user);
```

- Remover membro

```ts
client.removeUserInChat(chat, user);
```

- Promover membro

```ts
client.promoteUserInChat(chat, user);
```

- Despromover membro

```ts
client.demoteUserInChat(chat, user);
```

- Rejeitar chamada
  - Você pode receber a chamada pelo evento `new-call` ou `call`, porém o evento `call` também recebe atualização de chamadas invez de somente o pedido dela.
```ts
client.rejectCall(call);
```

## IDs no WhatsApp (PN e LID)

O WhatsApp identifica a mesma pessoa de duas formas: pelo número (`5511999999999@s.whatsapp.net`, chamado PN) e pelo LID (`123456789@lid`), um ID que esconde o número. A partir do Baileys 7 as mensagens podem chegar com qualquer um dos dois.

O Rompot entrega **um único ID por pessoa** em `message.user.id`, `message.chat.id` (conversas privadas), `message.mentions`, eventos de grupo e chamadas:

- o PN, sempre que o número é conhecido;
- o LID, só quando o WhatsApp não revela o número (por exemplo, grupos com número oculto).

Os pares PN ↔ LID ficam salvos pelo Baileys na sessão (`lid-mapping-*`), então o ID continua o mesmo depois de reiniciar. Quando o Rompot descobre o número de alguém que só era conhecido pelo LID, os dados salvos com o LID são movidos para o PN e o evento `id-mapping` é emitido.

```ts
message.user.id; // "5511999999999@s.whatsapp.net"
message.user.phoneNumber; // "5511999999999" (vazio quando o número é oculto)
message.user.lid; // "123456789@lid" (quando conhecido)

await client.resolveId("123456789@lid"); // "5511999999999@s.whatsapp.net"
await client.getUserIdentity("5511999999999"); // { id, pn, lid, phoneNumber }

client.on("id-mapping", ({ lid, pn }) => {
  // migre aqui dados que você guardou com o LID
});
```

Qualquer método aceita número puro, PN ou LID, com ou sem sufixo de dispositivo.

## Recursos do WhatsApp (Baileys 7)

```ts
// Grupo
await client.setChatAnnounce(chat, true); // só admins enviam mensagens
await client.setChatLocked(chat, true); // só admins editam nome, descrição e foto
await client.setChatEphemeral(chat, 604800); // mensagens temporárias (0 desativa)
await client.setChatMemberAddMode(chat, false); // só admins adicionam membros
await client.setChatJoinApproval(chat, true); // entrada exige aprovação
await client.getChatJoinRequests(chat); // [{ user, requestedAt, method }]
await client.approveChatJoinRequests(chat, ["5511999999999"]);
await client.rejectChatJoinRequests(chat, ["5511999999999"]);
await client.getChatInviteInfo("https://chat.whatsapp.com/CODIGO");

// Mensagem
await client.pinMessage(message, 86400); // 86400, 604800 ou 2592000 segundos
await client.unpinMessage(message);
await client.starMessage(message, true);
await client.forwardMessage("5511999999999", message);

// Usuários e presença
await client.isOnWhatsApp("5511999999999"); // { exists, id }
await client.getBlockedUsers();
await client.subscribePresence(chat); // passa a emitir "presence"

// Use client.supports("pinMessage") para saber se a plataforma atual oferece o recurso.
```

### Eventos novos

```ts
client.on("group-update", ({ action, changes, chat, fromUser }) => {
  // action: name | description | announce | restrict | inviteCode | memberAddMode | joinApprovalMode | ephemeralDuration
});

client.on("group-join-request", ({ action, method, chat, user, fromUser }) => {
  // action: created | revoked | rejected
});

client.on("presence", ({ chat, user, status, lastSeen }) => {
  // status: available | unavailable | composing | recording | paused
});

client.on("blocklist", ({ action, users }) => {});
client.on("id-mapping", ({ lid, pn, phoneNumber }) => {});
client.on("call-ended", (call) => {}); // também emitido quando a chamada é encerrada (terminate)
```

### Desempenho

- Metadados de grupo ficam em cache (`groupMetadataCacheTTL`, padrão 5 min) e são atualizados pelos eventos de participantes, sem consultar o WhatsApp a cada envio.
- Mensagens recentes ficam em cache por ID (`messageCacheTTL`, padrão 30 min) para reenvio, votos de enquete, citação e encaminhamento.
- Registros de chats e usuários ficam em memória e são gravados no disco em lote.
- A versão do WhatsApp Web é buscada ao conectar (`autoFetchLatestVersion`, padrão `true`).
- O histórico completo só é pedido com `autoSyncHistory: true`.

## 📄 Licença

Este projeto está sob a licença MIT - veja o arquivo [LICENSE](https://github.com/Laxeder/rompot/blob/main/LICENSE) para mais detalhes.
