const express = require('express');
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

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

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = qr;
      console.log('Scan QR:', qr);
    }

    if (connection === 'close') {
const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        startSock();
      }
    }

    if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
      latestQR = '';
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages?.[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const message = msg.message.conversation?.toLowerCase() || '';

    let reply = "Sorry, samajh nahi aaya.";

    if (message.includes('menu')) {
      reply = "Hamare products:\n1. A\n2. B\n3. C";
    } else if (message.includes('price')) {
      reply = "Price list:\nA - ₹100\nB - ₹200\nC - ₹300";
    } else if (message.includes('hello') || message.includes('hi')) {
      reply = "Assalamualaikum! Kaise madad kar sakta hoon?";
    }

    await sock.sendMessage(from, { text: reply });
  });
}

startSock();

app.get('/', (req, res) => {
  res.send('Bot server is running');
});

app.get('/qr-data', (req, res) => {
  res.send(latestQR || '');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
