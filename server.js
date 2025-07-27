const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const express = require("express");
const fs = require("fs");
const pino = require("pino");
const qrcode = require("qrcode-terminal");

const { state, saveState } = useSingleFileAuthState("./auth_info.json");

const app = express();
const PORT = process.env.PORT || 3000;

const startBot = async () => {
    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: true,
        auth: state
    });

    sock.ev.on("creds.update", saveState);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("connection closed due to", lastDisconnect.error, ", reconnecting", shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === "open") {
            console.log("✅ Bot connected");
        }
    });

    sock.ev.on("messages.upsert", async (msg) => {
        const m = msg.messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const text = m.message.conversation || m.message.extendedTextMessage?.text;

        if (text?.toLowerCase() === "hi") {
            await sock.sendMessage(from, { text: "Hello! This is your bot 🤖" });
        }
    });
};

// Start the Express server
app.get("/", (req, res) => {
    res.send("🤖 WhatsApp Bot is running.");
});

// Start Express + Baileys bot
app.listen(PORT, () => {
    console.log("✅ Express server running on port", PORT);
    startBot();
});
