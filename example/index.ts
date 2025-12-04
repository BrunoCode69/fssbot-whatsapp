
import Client, {
  WhatsAppBot,
  Message,
  EmptyMessage,
  MultiFileAuthState,
  ListMessage,
  ButtonMessage,
  MessageHandler,
  ImageMessage,
} from '../src';
import { generateProductCard, generateProductCardDetailed } from './generateProductCard';
import { generateProfileImage } from './generateProfileImage';

const wbot = new WhatsAppBot({
  autoSyncHistory: false,
  useExperimentalServers: true,
});

const client = new Client(wbot, {
  disableAutoCommand: false,
  disableAutoCommandForOldMessage: true,
  disableAutoCommandForUnofficialMessage: true,
  disableAutoTyping: false,
  disableAutoRead: false,
});

client.on('open', (open: { isNewLogin: boolean }) => {
  if (open.isNewLogin) {
    console.info('Nova conexão');
  }
  console.info('Cliente conectado!');
});

client.on('close', (update) => {
  console.info(`Cliente desconectou! Motivo: ${update.reason}`);
});


client.on('connecting', () => {
  console.info('Tentando conectar cliente...');
});

client.on('stop', (update) => {
  if (update.isLogout) {
    console.info(`Cliente desligado!`);
  } else {
    console.info(`Cliente parado!`);
  }
});

client.on('reconnecting', () => {
  console.info('Reconectando...');
});


client.on('message', async (message: Message) => {
  if (EmptyMessage.isValid(message)) return;
  if (message.isOld) return;


  if (message.text === "button") {
    const btnMessage = new ButtonMessage(message.chat, "texto", "rodapé");
    btnMessage.addUrl("Link", "https://example.com");

    await client.send(btnMessage);
  }

  if (message.text === "list") {
    const listMessage = new ListMessage(message.chat, "texto", "botão", "titulo", "rodapé");
    const index1 = listMessage.addCategory("Categoria 1");
    const index2 = listMessage.addCategory("Categoria 2");

    listMessage.addItem(index1, "Item 1");
    listMessage.addItem(index1, "Item 2");

    listMessage.addItem(index2, "Abc 1");
    listMessage.addItem(index2, "Abc 2");

    await client.send(listMessage);
  }

  if (message.text === "await") {
    message.reply("Informe seu nome:");

    const response = await client.awaitMessage(message.chat, { patterns: [MessageHandler.ignoreMessageFromMe] });

    const description = await client.getUserDescription(message.chat.id)

    console.log(description)

    await message.reply(`Olá ${response.text}, tudo bem?\n\nSua descrição: ${description}`);
  }

  if (message.text === "avatar") {
    const userExample = {
      _id: {
        $oid: "685de25d95188f6eabed0a60"
      },
      id: "372a2ab8-2b57-4ebc-b4d5-8e04868f4f73",
      name: "Felipe Andrade Junqueira",
      email: "iamfelipeee123@gmail.com",
      artistName: "KubitoFelipe",
      bio: "FELEPO",
      avatarUrl: "https://cdn.univermusic.com/cdn/uploads/image/cd3e5b94-b0fc-4509-b98a-69dbdb8dc93c.png",
      status: "active",
      createdAt: {
        $date: "2025-06-27T00:14:21.491Z"
      }
    };



    console.log(await generateProfileImage(userExample, 23, 1))

    message.reply(new ImageMessage(message.chat, "Avatar", await generateProfileImage(userExample, 23, 1)));
  }

  if (message.text === "product") {
    // Exemplo de teste
    const productExample = {
      "_id": "685df96795188f6eabed0bf5",
      "id": "6a746a43-f68c-45f9-b1fc-4f57810ed5d0",
      "hash": "be72121a-0e04-4490-86d4-534237fead44",
      "name": "AUTOMOTIVO TICTAC INSIGNE",
      "description": "FL STUDIO PC",
      "price": 100,
      "imageUrl": "https://cdn.univermusic.com/cdn/uploads/image/0a9bfeb1-17a3-4126-8a77-68f5960fb9c2.jpg",
      "category": "flp",
      "artistId": "372a2ab8-2b57-4ebc-b4d5-8e04868f4f73",
      "status": "approved",
      "genre": "FUNK",
      "bpm": 130,
      "previewUrl": "https://cdn.univermusic.com/cdn/uploads/audio/151414c8-981f-4f2b-9304-bf93c1ceeef5.mp3",
      "__v": 0,
      "createdAt": "2025-06-30T19:47:14.562Z",
      "updatedAt": "2025-08-13T19:09:50.883Z",
      "collaborators": [
        {
          "id": "372a2ab8-2b57-4ebc-b4d5-8e04868f4f73",
          "artistName": "KubitoFelipe",
          "isMainArtist": true
        },
        {
          "id": "ecbe541e-e1da-45bc-80b5-93fede5fa079",
          "artistName": "Lekodj",
          "isMainArtist": false,
          "percentage": 50
        }
      ],
      "artistName": "KubitoFelipe"
    };

    const btnMessage = new ButtonMessage(message.chat, "texto", "rodapé");

    btnMessage.addReply("Ouvir prévia", "button-id-123");

    await client.send(btnMessage);

    const respo = await client.awaitMessage(message.chat, { patterns: [MessageHandler.ignoreMessageFromMe] });

    console.log("Resposta do botão:", respo);

    message.reply(new ImageMessage(message.chat, "Product", await generateProductCard(productExample)));
  }
});

client.on('new-call', async (call) => {
  console.info('Nova chamada:', call);

  await call.reject();

  await call.chat.send('Não aceitamos chamadas!');
});

client.on('error', (err: any) => {
  console.info('Um erro ocorreu:', err);
});

(async () => {
  //? Ao inserir o número do bot é ativado o pareamento por código
  const botPhoneNumber = '11979882614';

  await client.connect(
    new MultiFileAuthState('./example/sessions/whatsapp', botPhoneNumber),
  );
})();