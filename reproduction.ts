
import { Client } from "./lib";
import { WhatsAppBot } from "./lib/wa";

try {
    const bot = new WhatsAppBot();
    const client = new Client(bot);
    console.log("Client created successfully");
} catch (error) {
    console.error("Error creating client:", error);
}
