// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from "public"
app.use(express.static(path.join(__dirname, 'public')));

// Example REST endpoint for fetching data
app.get('/data', (req, res) => {
  res.json({ message: 'Hello from the server!', time: new Date() });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('📡 New WebSocket connection');
  ws.send('✅ Connected to WebSocket server');

  ws.on('message', (msg, isBinary) => {
    if (isBinary) {
      console.log(`📷 Received a binary frame (${msg.length} bytes)`);

      // Broadcast binary to all other clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(msg, { binary: true });
        }
      });
    } else {
      const text = msg.toString();
      console.log('💬 Text message:', text);

      // Broadcast text to all clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(`Echo: ${text}`);
        }
      });
    }
  });
});

server.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
