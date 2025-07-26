const express = require('express');
const fs = require('fs');
const qrcode = require('qrcode');
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
const { state, saveState } = useSingleFileAuthState('./session.json');

let sock;
let latestQR = '';

app.use(express.static('public'));

async function startSock() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = await qrcode.toDataURL(qr);
      console.log('QR code generated');
    }

    if (connection === 'open') {
 console.log('✅ WhatsApp connected!');
      latestQR = '';
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnecting...');
        startSock();
      } else {
        console.log('❌ Logged out.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation?.toLowerCase() || '';
    const from = msg.key.remoteJid;

    let reply = 'معذرت، میں سمجھ نہیں پایا۔';
    if (text.includes('hi') || text.includes('hello')) reply = 'السلام علیکم! کیسے ہو؟';
    else if (text.includes('menu')) reply = '1. Item A\n2. Item B';
    else if (text.includes('price')) reply = 'Item A - Rs.100\nItem B - Rs.200';

    await sock.sendMessage(from, { text: reply });
  });
}

startSock();

app.get('/', (req, res) => {
  if (!latestQR) return res.send('No QR yet. Wait for it to generate...');
  res.send(`<h1>Scan QR to Connect</h1><img src="latestQR" />`);
);

app.listen(PORT, () => 
  console.log(`Server running on port PORT`)
});
