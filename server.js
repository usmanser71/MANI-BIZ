const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const { state, saveState } = useSingleFileAuthState('./session.json');

const app = express();
const PORT = process.env.PORT || 3000;

let sock;

async function connectToWhatsApp() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrImage = await qrcode.toDataURL(qr);
      fs.writeFileSync('./qr.html', `<img src="${qrImage}" />`);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error = new Boom(lastDisconnect.error)).output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed due to', lastDisconnect.error, ', reconnecting', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp connected');
    }
  });

  sock.ev.on('messages.upsert', async (msg) => {
    const m = msg.messages[0];
    if (!m.message || m.key.fromMe) return;

    const sender = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text;

    if (text?.toLowerCase() === 'hi') {
      await sock.sendMessage(sender, { text: 'Hello! This is your WhatsApp bot 😊' });
    }
  });
}

connectToWhatsApp();

// Serve QR code
app.get('/', (req, res) => {
  const file = path.join(__dirname, 'qr.html');
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.send('QR not generated yet. Please wait...');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
