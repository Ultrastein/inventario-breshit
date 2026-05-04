import { useState, useEffect } from "react";
import { CheckCircle2, Clock, ArrowRight, RotateCcw, ChevronLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";

const CATEGORIAS = [
  { key: 'docente',  emoji: '👨‍🏫', label: 'Material Docente',  desc: 'Notebooks de profesores',   color: '#818cf8', bg: 'rgba(99,102,241,0.08)',   border: 'rgba(99,102,241,0.25)',  hoverBorder: 'rgba(99,102,241,0.55)',  glow: 'rgba(99,102,241,0.4)'  },
  { key: 'alumnado', emoji: '🎒',   label: 'Carro de Alumnos', desc: 'Notebooks del carro móvil', color: '#22d3ee', bg: 'rgba(6,182,212,0.08)',    border: 'rgba(6,182,212,0.25)',   hoverBorder: 'rgba(6,182,212,0.55)',   glow: 'rgba(6,182,212,0.4)'   },
  { key: 'aula',     emoji: '📽️',  label: 'Equipos de Aula',  desc: 'Proyectores y parlantes',   color: '#4ade80', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   hoverBorder: 'rgba(34,197,94,0.55)',   glow: 'rgba(34,197,94,0.4)'   },
];

export default function Kiosco() {
  const [retiros, setRetiros]           = useState<any[]>([]);
  const [docentes, setDocentes]         = useState<any[]>([]);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [horaActual, setHoraActual]     = useState(new Date());

  const [paso, setPaso]                    = useState<1|2|3>(1);
  const [categoriaSeleccionada, setCatSel] = useState<any>(null);
  const [modoRango, setModoRango]          = useState(false);
  const [dispositivoNombre, setDispNombre] = useState("");
  const [dispositivoId, setDispId]         = useState("");
  const [rangoDesde, setRangoDesde]        = useState(1);
  const [rangoHasta, setRangoHasta]        = useState(1);
  const [docente, setDocente]              = useState("");
  const [confirmando, setConfirmando]      = useState(false);
  const [registroOk, setRegistroOk]        = useState<string|null>(null);

  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    const fetchData = async () => {
      const [pRes, uRes, eRes] = await Promise.all([
        supabase.from("prestamos").select("*"),
        supabase.from("usuarios").select("*").eq('rol', 'docente'),
        supabase.from("equipos").select("*").eq('estado', 'Operativa'),
      ]);
      if (pRes.data) setRetiros(pRes.data);
      if (uRes.data) setDocentes(uRes.data);
      if (eRes.data) setDispositivos(eRes.data);
    };
    fetchData();
    const channel = supabase.channel('kiosco-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prestamos' }, () => supabase.from("prestamos").select("*").then(({ data }) => data && setRetiros(data)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' },   () => supabase.from("equipos").select("*").eq('estado','Operativa').then(({ data }) => data && setDispositivos(data)))
      .subscribe();
    return () => { clearInterval(timer); supabase.removeChannel(channel); };
  }, []);

  const dispFiltrados = categoriaSeleccionada
    ? dispositivos.filter(d =>
        d.categoria === categoriaSeleccionada.key ||
        (categoriaSeleccionada.key === 'docente'  && ['notebook_docentes','Notebook Docente'].includes(d.categoria)) ||
        (categoriaSeleccionada.key === 'alumnado' && ['notebook_alumnos','Notebook Alumno'].includes(d.categoria))
      )
    : dispositivos;

  const resetWizard = () => {
    setPaso(1); setCatSel(null); setModoRango(false);
    setDispNombre(""); setDispId(""); setDocente("");
    setRangoDesde(1); setRangoHasta(1); setRegistroOk(null);
  };

  const handleRetirar = async () => {
    if (!docente) return;
    setConfirmando(true);
    try {
      if (modoRango && categoriaSeleccionada?.key === 'alumnado') {
        const dispEnRango = dispFiltrados.filter(d => {
          const num = d.numero || parseInt((d.nombre || '').replace(/\D/g,'') || '0');
          return num >= rangoDesde && num <= rangoHasta;
        });
        if (!dispEnRango.length) { alert(`No hay dispositivos del N° ${rangoDesde} al ${rangoHasta}.`); return; }
        await supabase.from("prestamos").insert(dispEnRango.map(d => ({ dispositivoid: d.id, docente, horainicio: Date.now(), estado: "Faltante de entrega" })));
        setRegistroOk(`✅ ${dispEnRango.length} dispositivo(s) registrados en tránsito.`);
      } else {
        const match = dispositivos.find(d => d.nombre.toLowerCase() === dispositivoNombre.toLowerCase());
        const id2 = match?.id || dispositivoId;
        if (!id2) { alert("Dispositivo no válido."); return; }
        await supabase.from("prestamos").insert({ dispositivoid: id2, docente, horainicio: Date.now(), estado: "Faltante de entrega" });
        setRegistroOk(`✅ "${match?.nombre || dispositivoNombre}" registrado por ${docente}.`);
      }
      setTimeout(resetWizard, 3000);
    } catch (e) { console.error(e); alert("Error al registrar."); }
    finally { setConfirmando(false); }
  };

  const handleDevolver = async (id: string) => {
    await supabase.from("prestamos").update({ estado: "Devuelto" }).eq('id', id);
  };

  const enTransito = retiros.filter(r => r.estado !== "Devuelto");

  const iStyle: React.CSSProperties = {
    padding: "1rem 1.25rem", borderRadius: "0.75rem",
    background: "rgba(0,0,0,0.3)", color: "white",
    border: "1px solid var(--border)", fontSize: "1.1rem", fontFamily: "inherit", width: "100%"
  };

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

      {/* ── HEADER ── */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: "800", letterSpacing: "-1.5px", marginBottom: "0.5rem" }}>
          Kiosco de Equipos
        </h1>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "1.5rem", fontWeight: "300", letterSpacing: "0.05em" }}>
          <Clock size={22} style={{ opacity: 0.6 }} />
          {horaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        {enTransito.length > 0 && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginTop: "0.875rem", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", color: "var(--warning)", padding: "0.4rem 1rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: "600" }}>
            ⚠️ {enTransito.length} equipo(s) en tránsito
          </div>
        )}
      </div>

      {/* ── SUCCESS BANNER ── */}
      {registroOk && (
        <div className="alert alert-success" style={{ marginBottom: "2rem", textAlign: "center", fontSize: "1rem", fontWeight: "600" }}>
          {registroOk}<br />
          <span style={{ fontSize: "0.8rem", fontWeight: "400", opacity: 0.8 }}>Redirigiendo en un momento…</span>
        </div>
      )}

      {/* ── WIZARD ── */}
      {!registroOk && (
        <div className="glass-panel" style={{ padding: "2.5rem", marginBottom: "2.5rem" }}>

          {/* Step indicators */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2.5rem" }}>
            {[1,2,3].map((n, idx) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: n < 3 ? 1 : 0 }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: "800", flexShrink: 0, transition: "all 0.3s",
                  background: paso >= n ? "linear-gradient(135deg, var(--primary), var(--primary-dark))" : "var(--surface-2)",
                  color: paso >= n ? "white" : "var(--text-subtle)",
                  boxShadow: paso >= n ? "0 4px 12px var(--primary-glow)" : "none"
                }}>
                  {paso > n ? "✓" : n}
                </div>
                {idx < 2 && <div style={{ flex: 1, height: "2px", borderRadius: "9999px", background: paso > n ? "var(--primary)" : "var(--border)", transition: "background 0.3s" }} />}
              </div>
            ))}
          </div>

          {/* PASO 1 — Categoría */}
          {paso === 1 && (
            <div>
              <p style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "1.75rem", color: "var(--text)" }}>
                ¿Qué tipo de material vas a retirar?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>
                {CATEGORIAS.map(cat => (
                  <button key={cat.key}
                    onClick={() => { setCatSel(cat); setModoRango(false); setDispNombre(""); setDispId(""); setPaso(2); }}
                    style={{
                      padding: "2rem 1.5rem", borderRadius: "1rem", textAlign: "center",
                      border: `1.5px solid ${cat.border}`, background: cat.bg,
                      color: "white", cursor: "pointer", fontFamily: "inherit",
                      transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = `0 20px 40px -8px ${cat.glow}`; e.currentTarget.style.borderColor = cat.hoverBorder; }}
                    onMouseOut={e =>  { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "none";                                  e.currentTarget.style.borderColor = cat.border; }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "0.875rem" }}>{cat.emoji}</div>
                    <div style={{ fontSize: "1.05rem", fontWeight: "700", color: cat.color, marginBottom: "0.3rem" }}>{cat.label}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{cat.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2 — Dispositivo */}
          {paso === 2 && categoriaSeleccionada && (
            <div>
              <button onClick={() => setPaso(1)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", marginBottom: "1.5rem", padding: 0 }}>
                <ChevronLeft size={16} /> Volver
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.75rem" }}>{categoriaSeleccionada.emoji}</span>
                <p style={{ fontSize: "1.3rem", fontWeight: "700" }}>
                  <span style={{ color: categoriaSeleccionada.color }}>{categoriaSeleccionada.label}</span>
                </p>
              </div>
              <p style={{ color: "var(--text-muted)", marginBottom: "1.75rem", fontSize: "0.9rem" }}>¿Qué equipo llevás?</p>

              {categoriaSeleccionada.key === 'alumnado' && (
                <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1.5rem" }}>
                  {[{ v: false, l: "Un equipo" }, { v: true, l: "Rango (ej: PC 1 al 9)" }].map(opt => (
                    <button key={String(opt.v)} onClick={() => setModoRango(opt.v)} style={{
                      flex: 1, padding: "0.75rem", borderRadius: "0.75rem", fontFamily: "inherit", fontWeight: "600", cursor: "pointer", transition: "all 0.2s",
                      border: `1.5px solid ${modoRango === opt.v ? categoriaSeleccionada.color : 'var(--border)'}`,
                      background: modoRango === opt.v ? categoriaSeleccionada.bg : 'transparent', color: "white"
                    }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              )}

              {modoRango ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Desde PC N°</label>
                    <input type="number" min={1} value={rangoDesde} onChange={e => setRangoDesde(Number(e.target.value))} style={iStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Hasta PC N°</label>
                    <input type="number" min={rangoDesde} value={rangoHasta} onChange={e => setRangoHasta(Number(e.target.value))} style={iStyle} />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Buscar equipo</label>
                  <input
                    list="lista-dispositivos" autoFocus value={dispositivoNombre}
                    onChange={e => { const n = e.target.value; const match = dispositivos.find(d => d.nombre.toLowerCase() === n.toLowerCase()); setDispNombre(n); setDispId(match?.id || ""); }}
                    placeholder="Escribí el nombre o elegí de la lista…"
                    style={{ ...iStyle, fontSize: "1.15rem" }}
                  />
                  <datalist id="lista-dispositivos">
                    {dispFiltrados.map(d => <option key={d.id} value={d.nombre} />)}
                  </datalist>
                </div>
              )}

              <button className="btn btn-primary" onClick={() => setPaso(3)} disabled={!modoRango && !dispositivoNombre}
                style={{ width: "100%", padding: "1rem", fontSize: "1.05rem", borderRadius: "0.75rem", gap: "0.5rem" }}>
                Continuar <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* PASO 3 — Docente + Confirmar */}
          {paso === 3 && (
            <div>
              <button onClick={() => setPaso(2)} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", marginBottom: "1.5rem", padding: 0 }}>
                <ChevronLeft size={16} /> Volver
              </button>
              <p style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "1.25rem" }}>¿Quién retira el equipo?</p>

              {/* Resumen */}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", padding: "0.875rem 1.25rem", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.75rem", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
                <span>{categoriaSeleccionada?.emoji} <strong style={{ color: "var(--text)" }}>{categoriaSeleccionada?.label}</strong></span>
                {modoRango
                  ? <span>📦 PCs del <strong style={{ color: "var(--text)" }}>{rangoDesde}</strong> al <strong style={{ color: "var(--text)" }}>{rangoHasta}</strong></span>
                  : <span>🖥️ <strong style={{ color: "var(--text)" }}>{dispositivoNombre}</strong></span>
                }
                <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Clock size={13} /> {horaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Tu nombre</label>
                <input list="lista-docentes" autoFocus value={docente} onChange={e => setDocente(e.target.value)} placeholder="Escribí tu nombre o elegí de la lista…" style={{ ...iStyle, fontSize: "1.15rem" }} />
                <datalist id="lista-docentes">
                  {docentes.map(doc => <option key={doc.id} value={doc.nombre || doc.email} />)}
                </datalist>
              </div>

              <button className="btn btn-primary" onClick={handleRetirar} disabled={!docente || confirmando}
                style={{ width: "100%", padding: "1.25rem", fontSize: "1.2rem", borderRadius: "0.875rem", fontWeight: "800", letterSpacing: "0.02em" }}>
                {confirmando ? "Registrando…" : "✅ Confirmar Retiro"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── EQUIPOS EN TRÁNSITO ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Equipos en Tránsito</h2>
          {enTransito.length > 0 && (
            <span style={{ background: "var(--warning-bg)", color: "var(--warning)", border: "1px solid var(--warning-border)", borderRadius: "9999px", padding: "0.15rem 0.6rem", fontSize: "0.8rem", fontWeight: "700" }}>
              {enTransito.length}
            </span>
          )}
        </div>

        {enTransito.length === 0 ? (
          <div className="glass-panel">
            <div className="empty-state">
              <CheckCircle2 size={48} />
              <h3>Todo devuelto</h3>
              <p>¡Buen trabajo! No hay equipos en tránsito.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {enTransito.map(retiro => {
              const disp = dispositivos.find(d => d.id === retiro.dispositivoid);
              const nombre = disp?.nombre || "Equipo";
              const hora = (() => { const d = new Date(Number(retiro.horainicio)); return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); })();
              return (
                <div key={retiro.id} className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <p style={{ fontWeight: "700", fontSize: "1rem", marginBottom: "0.2rem" }}>{nombre}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      {retiro.docente} · <Clock size={11} style={{ display: "inline", verticalAlign: "middle" }} /> {hora}
                    </p>
                  </div>
                  <span style={{ background: "var(--warning-bg)", color: "var(--warning)", border: "1px solid var(--warning-border)", borderRadius: "9999px", padding: "0.3rem 0.875rem", fontSize: "0.8rem", fontWeight: "700", whiteSpace: "nowrap" }}>
                    ⚠️ En tránsito
                  </span>
                  <button onClick={() => handleDevolver(retiro.id)}
                    className="btn btn-success"
                    style={{ gap: "0.5rem", padding: "0.65rem 1.25rem", fontWeight: "700", whiteSpace: "nowrap" }}
                    onMouseOver={e => (e.currentTarget.style.background = "rgba(34,197,94,0.2)")}
                    onMouseOut={e =>  (e.currentTarget.style.background = "var(--success-bg)")}
                  >
                    <RotateCcw size={15} /> Devolver
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
