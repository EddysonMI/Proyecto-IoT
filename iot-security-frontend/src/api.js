// src/api.js
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";

export async function getState() {
  const r = await fetch(`${API_BASE}/api/state`);
  return r.json();
}

export async function getEvents(limit = 100) {
  const r = await fetch(`${API_BASE}/api/events?limit=${limit}`);
  return r.json();
}

export async function setArmed(armed) {
  await fetch(`${API_BASE}/api/arm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ armed }),
  });
}

export async function triggerSiren(seconds = 5) {
  await fetch(`${API_BASE}/api/siren`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ on: true, seconds }),
  });
}

// Conexión en tiempo real (SSE)
export function openStream(onEvent) {
  const es = new EventSource(`${API_BASE}/api/stream`);
  es.onmessage = (ev) => {
    try { onEvent(JSON.parse(ev.data)); } catch {}
  };
  return es; // usa es.close() para cerrar
}
