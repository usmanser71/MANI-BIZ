```js
const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const { state, saveState } = useSingleFileAuthState('./session.json');

const app = express();
const PORT = process.env.PORT || 3000;

let sock;
let latestQR = '';

app.use(express.static('public'));

async function startSock() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQR = qr;
      console.log('QR Code:', qr);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        startSock();
      } else {
        console.log('Logged out from WhatsApp');
      }
    }

    if (connection === 'open') {
      console.log('WhatsApp connected!');
      latestQR = '';
    }
    });

  sock.ev.on('messages.upsert', async (m) => {
    if (!m.messages) return;
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const text = msg.message.conversation?.toLowerCase();

    if (!text) return;

    let reply = "Sorry, main samajh nahi paaya.";

    if (text.includes('menu')) reply = "Hamare products:\n1. Product A\n2. Product B\n3. Product C";
    else if (text.includes('price')) reply = "Hamare daam:\nProduct A - ₹100\nProduct B - ₹200\nProduct C - ₹300";
    else if (text.includes('address') || text.includes('location')) reply = "Hamara pata: 123 Business Street, City";
    else if (text.includes('hello') || text.includes('hi')) reply = "Assalamualaikum! Kaise madad kar sakta hoon?";

    await sock.sendMessage(from, { text: reply });
  });
}

startSock();

app.get('/qr', async (req, res) => {
  if (!latestQR) return res.send('No QR code at the moment.');
  try {
    const img = await qrcode.toDataURL(latestQR);
    res.send('<h1>Scan this QR with WhatsApp</h1><img src="img" />');
  } catch (err) {
    res.status(500).send('Error generating QR');
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
console.log(`Server running on port{PORT}`);
});
```

---

2. `public/index.html` (simple page to show QR link):

```html
<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp Bot QR Scan</title>
</head>
<body>
  <h1>WhatsApp Bot</h1>
  <p><a href="/qr" target="_blank">Click here to open QR code for scanning</a></p>
  <p>Scan the QR code with WhatsApp linked devices to connect the bot.</p>
</body>
</html>
