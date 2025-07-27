const express = require('express');
const qrcode = require('qrcode');
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

console.log("✅ Bot update test - Mani Khan");

const app = express();
const PORT = process.env.PORT || 3000;

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

let sock;
let latestQR = '';

async function startSock() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = await qrcode.toDataURL(qr);
      console.log('📸 Scan the QR to connect!');
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnecting...');
        startSock();
      } else {
        console.log('🚫 Logged out from WhatsApp');
      }
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp Connected!');
      latestQR = '';
    }
  });

  sock.ev.on('messages.upsert', async (msg) => {
    if (!msg.messages || !msg.messages[0].message) return;

    const message = msg.messages[0];
    const text = message.message.conversation?.toLowerCase();
    const from = message.key.remoteJid;

    if (!text) return;

    let reply = '🤖 معذرت! میں آپ کی بات نہیں سمجھ پایا۔';

    if (text.includes('menu')) {
      reply = '📋 Menu:\n1. Product A\n2. Product B\n3. Product C';
    }

    await sock.sendMessage(from, { text: reply });
  });
}

startSock();

// Homepage
app.get('/', (req, res) => {
  res.send(`<h2>🤖 MANI-BIZ-MD is running</h2><img src="/qr" width="250"/>`);
});

// QR Route
app.get('/qr', (req, res) => {
  if (latestQR) {
    res.type('html').send(`<img src="${latestQR}" />`);
  } else {
    res.send('QR not ready or already scanned.');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
