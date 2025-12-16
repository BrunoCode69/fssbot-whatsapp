import { Client, Message, TextMessage, ButtonMessage, ListMessage, Chat } from "../lib";
import { WhatsAppBot } from "../lib/wa";
import * as fs from "fs";
import * as path from "path";

// Caminho para salvar a autenticação
const authPath = "chrome";

async function main() {
    console.log("🚀 Iniciando cliente WhatsApp...");

    // Criar cliente WhatsApp
    const bot = new WhatsAppBot({ printQRInTerminal: true });

    const client = new Client(bot, {
        maxTimeout: 60000,
        maxReconnectTimes: 5,
    });

    // Eventos do cliente
    client.on("open", () => {
        console.log("✅ Cliente conectado ao WhatsApp!");
    });

    client.on("connecting", () => {
        console.log("🔄 Conectando ao WhatsApp...");
    });

    client.on("reconnecting", () => {
        console.log("🔄 Reconectando ao WhatsApp...");
    });

    client.on("close", () => {
        console.log("❌ Conexão fechada");
    });

    client.on("qr", (qrCode: string) => {
        console.log("📱 Escaneie o QR code abaixo com seu WhatsApp:")
        import("qrcode-terminal").then((QRCode) => {
            QRCode.generate(qrCode, { small: true });
        })
    });

    client.on("message", async (message: Message) => {
        try {
            console.log(`\n📨 Mensagem recebida de ${message.user.id}`);
            console.log(`   Chat: ${message.chat.id}`);
            console.log(`   Tipo: ${message.type}`);
            console.log(`   Texto: ${message.text}`);

            // Responder apenas se não for mensagem enviada pelo bot
            if (message.fromMe) return;

            // Echo simples
            if (message.text?.toLowerCase() === "oi") {
                await client.sendMessage(
                    message.chat,
                    `Olá ${message.user.id}! 👋`
                );
            }

            // Teste de botões
            if (message.text?.toLowerCase() === "botoes") {
                const buttonMsg = new ButtonMessage(
                    message.chat,
                    "Escolha uma opção abaixo:",
                    [
                        { type: "reply", text: "Opção 1", content: "op1" },
                        { type: "reply", text: "Opção 2", content: "op2" },
                        { type: "reply", text: "Opção 3", content: "op3" },
                    ],
                    { footer: "Use um dos botões acima" }
                );

                await client.send(buttonMsg);
                console.log("✅ Mensagem com botões enviada!");
            }

            // Teste de lista
            if (message.text?.toLowerCase() === "lista") {
                const listMsg = new ListMessage(message.chat, "Escolha um item:");
                listMsg.setTitle("Menu Principal");
                listMsg.setFooter("Toque para selecionar");

                // Adicionar categorias e itens
                listMsg.addCategory("Opções Principais");
                listMsg.addItem(0, "Item 1", "Descrição do item 1", "item_1");
                listMsg.addItem(0, "Item 2", "Descrição do item 2", "item_2");
                listMsg.addItem(0, "Item 3", "Descrição do item 3", "item_3");

                listMsg.addCategory("Opções Secundárias");
                listMsg.addItem(1, "Opção A", "Descrição da opção A", "opt_a");
                listMsg.addItem(1, "Opção B", "Descrição da opção B", "opt_b");

                await client.send(listMsg);
                console.log("✅ Mensagem com lista enviada!");
            }

            // Teste de reação
            if (message.text?.toLowerCase() === "reacao") {
                await client.addReaction(message, "👍");
                console.log("✅ Reação adicionada!");
            }

            // Teste de tipagem
            if (message.text?.toLowerCase() === "digitando") {
                //await client.changeChatStatus(message.chat, 1); // ChatStatus.Typing = 1
                await new Promise((resolve) => setTimeout(resolve, 3000));
                await client.sendMessage(message.chat, "Pronto! 😄");
                console.log("✅ Mensagem de tipagem enviada!");
            }

            // Listar chats
            if (message.text?.toLowerCase() === "chats") {
                const chats = await client.getChats();
                await client.sendMessage(
                    message.chat,
                    `Total de chats: ${chats.length}`
                );
            }

            // Informações do usuário
            if (message.text?.toLowerCase() === "info") {
                const user = await client.getUser(message.user);
                const infoText = `
📱 Informações do Usuário:
ID: ${user?.id}
Nome: ${user?.name}
Salvo: ${user?.savedName ? "✅ Sim" : "❌ Não"}
Descrição: ${user?.description || "Nenhuma"}
        `.trim();

                await client.sendMessage(message.chat, infoText);
            }

            // Menu de ajuda
            if (
                message.text?.toLowerCase() === "ajuda" ||
                message.text?.toLowerCase() === "menu"
            ) {
                const helpText = `
🤖 Comandos disponíveis:

📝 Mensagens:
• oi - Resposta simples
• botoes - Enviar mensagem com botões
• lista - Enviar mensagem com lista
• digitando - Simular digitação

🎨 Interações:
• reacao - Adicionar reação 👍

📊 Informações:
• chats - Mostrar total de chats
• info - Mostrar info do usuário
• ajuda - Mostrar este menu
        `.trim();

                await client.sendMessage(message.chat, helpText);
            }
        } catch (error) {
            console.error("❌ Erro ao processar mensagem:", error);
        }
    });

    client.on("error", (error) => {
        console.error("❌ Erro:", error);
    });

    client.connect(authPath)
}

main().catch((error) => {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
});
