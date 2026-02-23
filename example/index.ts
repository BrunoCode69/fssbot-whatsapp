import { Client, Message, TextMessage, ButtonMessage, ListMessage, Chat } from "../lib";
import { MultiFileAuthState, WhatsAppBot } from "../lib/wa";

async function main() {
    console.log("🚀 Iniciando cliente WhatsApp...");

    const bot = new WhatsAppBot({ printQRInTerminal: true });

    const client = new Client(bot, {
        maxTimeout: 60000,
        maxReconnectTimes: 5,
    });

    client.on("message", async (message: Message) => {

        // Ignora mensagens enviadas pelo próprio bot para evitar loop infinito
        if (message.fromMe) return;

        console.log(message)

        if (message.text == "teste") {
            message.reply("teste")
        }
    });

    client.on("code", code => {
        console.log(code)
    })

    client.on("error", (error) => {
        console.error("❌ Erro:", error);
    });

    client.connect(new MultiFileAuthState('session', '5516988747166'))
}

main().catch((error) => {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
});