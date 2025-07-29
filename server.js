const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const { state, saveState } = useSingleFileAuthState('./session.json');

app.use(express.static('public'));

let sock;

async function startSock() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if(qr) {
      console.log('Scan this QR to connect:', qr);
    }
    if(connection === 'close') {
      const reason = lastDisconnect.error?.output?.statusCode;
      if(reason !== DisconnectReason.loggedOut) {
        startSock();
      }
    }
    if(connection === 'open') {
      console.log('Connected');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    if(!m.messages) return;
    const msg = m.messages[0];
    if(!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const message = msg.message.conversation?.toLowerCase();

    if(!message) return;

    let reply = "Sorry, main samajh nahi paaya.";

    if(message.includes('menu')) {
      reply = "Hamare products:\n1. Product A\n2. Product B\n3. Product C";
    } else if(message.includes('price')) {
      reply = "Hamare daam:\nProduct A - ₹100\nProduct B - ₹200\nProduct C - ₹300";
    } else if(message.includes('address') || message.includes('location')) {
      reply = "Hamara pata: 123 Business Street, City";
    } else if(message.includes('hello') || message.includes('hi')) {
      reply = "Assalamualaikum! Kaise madad kar sakta hoon?";
    }

    await sock.sendMessage(from, { text: reply });
  });
}

startSock();

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
})
