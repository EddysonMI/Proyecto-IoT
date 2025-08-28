// src/App.js
import { useEffect, useState } from "react";
import { getState, getEvents, setArmed, triggerSiren, openStream } from "./api";

export default function App() {
  const [armed, setArmedState] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carga inicial
  useEffect(() => {
    let closed = false;
    async function load() {
      try {
        const [state, evs] = await Promise.all([getState(), getEvents(100)]);
        if (!closed) {
          setArmedState(Boolean(state.armed));
          setEvents(evs);
        }
      } finally {
        if (!closed) setLoading(false);
      }
    }
    load();

    // Tiempo real
    const es = openStream((evt) => {
      setEvents((prev) => [evt, ...prev].slice(0, 200));
    });

    return () => {
      closed = true;
      es.close();
    };
  }, []);

  async function toggleArm() {
    const next = !armed;
    await setArmed(next);
    setArmedState(next);
  }

  async function siren(seconds) {
    await triggerSiren(seconds);
  }

  return (
    <div style={{ fontFamily: "system-ui, Arial", padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1>🔐 Seguridad IoT</h1>

      <section style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <span>
          Estado:&nbsp;
          <strong style={{ color: armed ? "green" : "gray" }}>
            {armed ? "Armado" : "Desarmado"}
          </strong>
        </span>
        <button onClick={toggleArm} style={{ padding: "8px 12px" }}>
          {armed ? "Desarmar" : "Armar"}
        </button>
        <button onClick={() => siren(5)} style={{ padding: "8px 12px" }}>
          Sirena 5s
        </button>
        <button onClick={() => siren(10)} style={{ padding: "8px 12px" }}>
          Sirena 10s
        </button>
      </section>

      <h2>📋 Eventos</h2>
      {loading && <div>Cargando…</div>}
      {!loading && events.length === 0 && <div>Sin eventos aún.</div>}
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {events.map((e, i) => (
          <li key={i} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <div><strong>{e.type}</strong> — {e.detail || e.note || ""}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{e.timestamp || e.ts}</div>
            {e.classification && (
              <div style={{ fontSize: 12 }}>
                Clasificación: <em>{e.classification}</em>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
