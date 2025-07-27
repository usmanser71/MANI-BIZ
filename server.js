const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode');
const fs = require('fs');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Auth setup
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

// WhatsApp Connection
async function startBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr } = update;
    if (qr) {
      console.log("QR Code received. Scan please.");
      await qrcode.toFile('./qr.png', qr);
    }
    if (connection === 'open') {
      console.log('✅ Bot is connected to WhatsApp!');
    } else if (connection === 'close') {
      console.log('❌ Connection closed. Reconnecting...');
      startBot();
    }
  });

  sock.ev.on('creds.update', saveState);
}

startBot();

// Simple endpoint for checking bot status
app.get('/', (req, res) => {
  res.send('🤖 Mani-Biz-MD Bot is running on Render!');
});

app.listen(port, () => {
  console.log(`🌐 Server running on port ${port}`);
});
