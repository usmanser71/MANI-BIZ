```js
const express = require('express');
const fs = require('fs');
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

const { state, saveState } = useSingleFileAuthState('./session.json');
app.use(express.static('public'));

let sock;
let latestQR = '';

async function startSock() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = await qrcode.toDataURL(qr);
      console.log('Scan QR from web UI or terminal');
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        startSock();
      }
    }

    if (connection === 'open') {
      console.log('WhatsApp connected successfully');
      latestQR = '';
    }
  });
  sock.ev.on('messages.upsert', async (m) => {
    if (!m.messages) return;
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation?.toLowerCase();
    const from = msg.key.remoteJid;

    let reply = "معذرت، میں سمجھ نہیں پایا۔";

    if (text.includes('hi') || text.includes('hello')) {
      reply = "السلام علیکم! کیسے مدد کر سکتا ہوں؟";
    } else if (text.includes('menu')) {
      reply = "ہمارے پراڈکٹس:\n1. Item A\n2. Item B\n3. Item C";
    } else if (text.includes('price')) {
      reply = "قیمتیں:\nItem A - ₹100\nItem B - ₹200\nItem C - ₹300";
    }

    await sock.sendMessage(from, { text: reply });
  });
}

startSock();

app.get('/', (req, res) => {
  res.send(`<h1>Scan this QR with WhatsApp</h1><img src="latestQR" />`);
);

app.listen(PORT, () => 
  console.log(`Server running on port{PORT}`);
});
