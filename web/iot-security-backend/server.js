const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Estado inicial
let systemState = { armed: false, lastEvent: null };
let events = [];
let clients = [];

// Ruta raíz de prueba
app.get("/", (req, res) => {
  res.send("🚀 Backend IoT Security funcionando. Usa /api/state o /api/events para interactuar.");
});

// SSE
app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.push(res);
  req.on("close", () => {
    clients = clients.filter(c => c !== res);
  });
});

function broadcastEvent(event) {
  clients.forEach(client =>
    client.write(`data: ${JSON.stringify(event)}\n\n`)
  );
}

// Estado actual
app.get("/api/state", (req, res) => {
  res.json(systemState);
});

// Armar/Desarmar
app.post("/api/arm", (req, res) => {
  const { armed } = req.body;
  systemState.armed = armed;
  res.json({ success: true, armed });
});

// Sirena
app.post("/api/siren", (req, res) => {
  const { on, seconds } = req.body;
  const event = {
    type: on ? "SIREN_ON" : "SIREN_OFF",
    timestamp: new Date().toISOString(),
    detail: on ? `Siren activated for ${seconds || "∞"} seconds` : "Siren deactivated",
    classification: "system",
  };
  events.unshift(event);
  broadcastEvent(event);
  res.json({ success: true });
});

// Eventos históricos
app.get("/api/events", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(events.slice(0, limit));
});

// Recibir eventos desde ESP32
app.post("/api/events", (req, res) => {
  const { type, detail, classification } = req.body;
  const event = {
    type,
    detail,
    classification: classification || "unclassified",
    timestamp: new Date().toISOString(),
  };
  systemState.lastEvent = event;
  events.unshift(event);
  broadcastEvent(event);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`✅ IoT Security backend corriendo en http://localhost:${PORT}`);
});
