const express = require('express');
const qrcode = require('qrcode');
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;

const { state, saveState } = useSingleFileAuthState('./session.json');

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
      console.log('📱 Scan QR from browser');
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔄 Trying to reconnect...');
        startSock();
      } else {
        console.log('❌ Logged out from WhatsApp.');
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
    const from = message.key.remoteJid;
    const text = message.message.conversation?.toLowerCase() ||
                 message.message.extendedTextMessage?.text?.toLowerCase();

    if (!text) return;

    let reply = 'Maaf kijiye, samajh nahi aaya.';

    if (text.includes('menu')) {
      reply = 'Menu:\n1. Product A\n2. Product B\n3. Product C';
    }

    try {
      await sock.sendMessage(from, { text: reply });
    } catch (err) {
      console.error('❌ Message send failed:', err);
    }
  });
}

startSock();

app.get('/', (req, res) => {
  res.send(`<h2>MANI-BIZ-MD is running</h2><img src="/qr" width="250"/>`);
});

app.get('/qr', (req, res) => {
  if (latestQR) {
    res.type('html').send(`<img src="${latestQR}" />`);
  } else {
    res.send('QR not ready or already scanned.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
