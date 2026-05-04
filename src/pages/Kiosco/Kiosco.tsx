import { useState, useEffect } from "react";
import { CheckCircle2, Clock, ArrowRight, RotateCcw } from "lucide-react";
import { supabase } from "../../lib/supabase";

const CATEGORIAS = [
  { key: 'docente',  emoji: '👨‍🏫', label: 'Material Docente',  desc: 'Notebooks de profesores',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.5)' },
  { key: 'alumnado', emoji: '🎒', label: 'Carros de Alumnos', desc: 'Notebooks del carro móvil',      color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)',   border: 'rgba(14,165,233,0.5)'  },
  { key: 'aula',     emoji: '📽️', label: 'Equipos de Aula',   desc: 'Proyectores y parlantes',        color: '#10b981', bg: 'rgba(16,185,129,0.15)',   border: 'rgba(16,185,129,0.5)'  },
];

export default function Kiosco() {
  const [retiros, setRetiros]           = useState<any[]>([]);
  const [docentes, setDocentes]         = useState<any[]>([]);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [horaActual, setHoraActual]     = useState(new Date());

  // wizard state
  const [paso, setPaso]                           = useState<1|2|3>(1);
  const [categoriaSeleccionada, setCatSel]        = useState<any>(null);
  const [modoRango, setModoRango]                 = useState(false);
  const [dispositivoNombre, setDispNombre]        = useState("");
  const [dispositivoId, setDispId]                = useState("");
  const [rangoDesde, setRangoDesde]               = useState(1);
  const [rangoHasta, setRangoHasta]               = useState(1);
  const [docente, setDocente]                     = useState("");
  const [confirmando, setConfirmando]             = useState(false);
  const [registroOk, setRegistroOk]               = useState<string|null>(null);

  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    const fetchData = async () => {
      const { data: pData } = await supabase.from("prestamos").select("*");
      if (pData) setRetiros(pData);
      const { data: uData } = await supabase.from("usuarios").select("*").eq('rol', 'docente');
      if (uData) setDocentes(uData);
      const { data: eData } = await supabase.from("equipos").select("*").eq('estado', 'Operativa');
      if (eData) setDispositivos(eData);
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
        if (!dispEnRango.length) { alert(`No hay dispositivos del N° ${rangoDesde} al ${rangoHasta}`); return; }
        await supabase.from("prestamos").insert(dispEnRango.map(d => ({
          dispositivoid: d.id, docente, horainicio: Date.now(), estado: "Faltante de entrega"
        })));
        setRegistroOk(`✅ ${dispEnRango.length} dispositivo(s) de Alumnado registrados en tránsito.`);
      } else {
        const match = dispositivos.find(d => d.nombre.toLowerCase() === dispositivoNombre.toLowerCase());
        const dispId2 = match?.id || dispositivoId;
        if (!dispId2) { alert("Dispositivo no válido"); return; }
        await supabase.from("prestamos").insert({ dispositivoid: dispId2, docente, horainicio: Date.now(), estado: "Faltante de entrega" });
        setRegistroOk(`✅ "${match?.nombre || dispositivoNombre}" registrado en tránsito por ${docente}.`);
      }
      setTimeout(() => resetWizard(), 3000);
    } catch (e) { console.error(e); alert("Error al registrar"); }
    finally { setConfirmando(false); }
  };

  const handleDevolver = async (id: string) => {
    await supabase.from("prestamos").update({ estado: "Devuelto" }).eq('id', id);
  };

  const enTransito = retiros.filter(r => r.estado !== "Devuelto");

  const iStyle: React.CSSProperties = {
    width: "100%", padding: "1.1rem 1.25rem", borderRadius: "0.75rem",
    background: "rgba(0,0,0,0.3)", color: "white", border: "1px solid var(--border)",
    fontSize: "1.15rem", fontFamily: "inherit"
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" }}>

      {/* ── HEADER ── */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "2.8rem", fontWeight: "800", letterSpacing: "-1px", marginBottom: "0.25rem" }}>
          Kiosco de Equipos
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.6rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <Clock size={26} /> {horaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        {enTransito.length > 0 && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.5)", color: "#f59e0b", padding: "0.4rem 1rem", borderRadius: "9999px", fontSize: "0.95rem", fontWeight: "600" }}>
            ⚠️ {enTransito.length} equipo(s) en tránsito sin devolver
          </div>
        )}
      </div>

      {/* ── SUCCESS BANNER ── */}
      {registroOk && (
        <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.6)", color: "#10b981", padding: "1.25rem 1.5rem", borderRadius: "1rem", textAlign: "center", fontSize: "1.1rem", fontWeight: "600", marginBottom: "2rem" }}>
          {registroOk}<br/><span style={{ fontSize: "0.85rem", fontWeight: "400", opacity: 0.8 }}>Redirigiendo en un momento…</span>
        </div>
      )}

      {/* ── WIZARD CARD ── */}
      {!registroOk && (
        <div className="glass-panel" style={{ padding: "2.5rem", marginBottom: "3rem" }}>

          {/* Progress bar */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
            {[1,2,3].map(n => (
              <div key={n} style={{ flex: 1, height: "4px", borderRadius: "9999px", background: paso >= n ? "var(--primary)" : "var(--border)", transition: "background 0.3s" }} />
            ))}
          </div>

          {/* PASO 1 — Categoría */}
          {paso === 1 && (
            <div>
              <p style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "1.5rem" }}>
                ¿Qué tipo de material vas a retirar?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                {CATEGORIAS.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => { setCatSel(cat); setModoRango(false); setDispNombre(""); setDispId(""); setPaso(2); }}
                    style={{
                      padding: "1.75rem 1.5rem", borderRadius: "1rem", textAlign: "center",
                      border: `2px solid ${cat.border}`, background: cat.bg,
                      color: "white", cursor: "pointer", fontFamily: "inherit",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = `0 8px 24px -4px ${cat.color}55`; }}
                    onMouseOut={e =>  { e.currentTarget.style.transform = "scale(1)";    e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>{cat.emoji}</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: "700", color: cat.color }}>{cat.label}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{cat.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2 — Dispositivo */}
          {paso === 2 && categoriaSeleccionada && (
            <div>
              <button onClick={() => setPaso(1)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.95rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                ← Volver
              </button>
              <p style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "0.5rem" }}>
                <span style={{ color: categoriaSeleccionada.color }}>{categoriaSeleccionada.emoji} {categoriaSeleccionada.label}</span>
              </p>
              <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>¿Qué equipo llevás?</p>

              {/* Modo rango para alumnado */}
              {categoriaSeleccionada.key === 'alumnado' && (
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  {[{ v: false, l: "Un solo equipo" }, { v: true, l: "Rango (Ej: PC 1 al 9)" }].map(opt => (
                    <button key={String(opt.v)} onClick={() => setModoRango(opt.v)}
                      style={{ flex: 1, padding: "0.75rem", borderRadius: "0.75rem", border: `2px solid ${modoRango === opt.v ? categoriaSeleccionada.color : 'var(--border)'}`, background: modoRango === opt.v ? categoriaSeleccionada.bg : 'transparent', color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              )}

              {modoRango ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", color: "var(--text-muted)", fontWeight: "600" }}>Desde PC N°</label>
                    <input type="number" min={1} value={rangoDesde} onChange={e => setRangoDesde(Number(e.target.value))} style={iStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.4rem", color: "var(--text-muted)", fontWeight: "600" }}>Hasta PC N°</label>
                    <input type="number" min={rangoDesde} value={rangoHasta} onChange={e => setRangoHasta(Number(e.target.value))} style={iStyle} />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontWeight: "600" }}>Buscar equipo</label>
                  <input
                    list="lista-dispositivos"
                    autoFocus
                    value={dispositivoNombre}
                    onChange={e => {
                      const n = e.target.value;
                      const match = dispositivos.find(d => d.nombre.toLowerCase() === n.toLowerCase());
                      setDispNombre(n); setDispId(match?.id || "");
                    }}
                    placeholder="Escribí el nombre o elegí de la lista…"
                    style={{ ...iStyle, fontSize: "1.25rem", padding: "1.25rem" }}
                  />
                  <datalist id="lista-dispositivos">
                    {dispFiltrados.map(d => <option key={d.id} value={d.nombre} />)}
                  </datalist>
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={() => setPaso(3)}
                disabled={!modoRango && !dispositivoNombre}
                style={{ width: "100%", padding: "1.1rem", fontSize: "1.15rem", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                Continuar <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* PASO 3 — Docente + Confirmar */}
          {paso === 3 && (
            <div>
              <button onClick={() => setPaso(2)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.95rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                ← Volver
              </button>
              <p style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "0.5rem" }}>¿Quién retira el equipo?</p>

              {/* Resumen del retiro */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1rem 1.25rem", marginBottom: "1.5rem", fontSize: "0.95rem", color: "var(--text-muted)", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <span>{categoriaSeleccionada?.emoji} <strong style={{ color: "white" }}>{categoriaSeleccionada?.label}</strong></span>
                {modoRango
                  ? <span>📦 PCs del <strong style={{ color: "white" }}>{rangoDesde}</strong> al <strong style={{ color: "white" }}>{rangoHasta}</strong></span>
                  : <span>🖥️ <strong style={{ color: "white" }}>{dispositivoNombre}</strong></span>
                }
                <span>🕐 <strong style={{ color: "white" }}>{horaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontWeight: "600" }}>Tu nombre</label>
                <input
                  list="lista-docentes"
                  autoFocus
                  value={docente}
                  onChange={e => setDocente(e.target.value)}
                  placeholder="Escribí tu nombre o elegí de la lista…"
                  style={{ ...iStyle, fontSize: "1.25rem", padding: "1.25rem" }}
                />
                <datalist id="lista-docentes">
                  {docentes.map(doc => <option key={doc.id} value={doc.nombre || doc.email} />)}
                </datalist>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleRetirar}
                disabled={!docente || confirmando}
                style={{ width: "100%", padding: "1.25rem", fontSize: "1.3rem", borderRadius: "0.75rem", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", letterSpacing: "0.5px" }}>
                {confirmando ? "Registrando…" : "✅ Confirmar Retiro"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── EQUIPOS EN TRÁNSITO ── */}
      <div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          Equipos en Tránsito {enTransito.length > 0 && <span style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.5)", borderRadius: "9999px", padding: "0.1rem 0.6rem", fontSize: "0.9rem" }}>{enTransito.length}</span>}
        </h2>

        {enTransito.length === 0 ? (
          <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <CheckCircle2 size={48} style={{ marginBottom: "1rem", opacity: 0.4 }} />
            <p style={{ fontSize: "1.1rem" }}>Todo devuelto. ¡Buen trabajo!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {enTransito.map(retiro => {
              const disp = dispositivos.find(d => d.id === retiro.dispositivoid);
              const nombre = disp?.nombre || retiro.dispositivoid || "Equipo";
              const hora = (() => { const d = new Date(Number(retiro.horainicio)); return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); })();
              return (
                <div key={retiro.id} className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <p style={{ fontWeight: "700", fontSize: "1.1rem", marginBottom: "0.2rem" }}>{nombre}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{retiro.docente} · Retiro: {hora}</p>
                  </div>
                  <span style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.5)", borderRadius: "9999px", padding: "0.3rem 0.9rem", fontSize: "0.85rem", fontWeight: "600", whiteSpace: "nowrap" }}>
                    ⚠️ En tránsito
                  </span>
                  <button
                    onClick={() => handleDevolver(retiro.id)}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", borderRadius: "0.6rem", background: "rgba(16,185,129,0.2)", color: "#10b981", border: "1px solid rgba(16,185,129,0.5)", cursor: "pointer", fontFamily: "inherit", fontWeight: "700", fontSize: "0.95rem", transition: "all 0.2s", whiteSpace: "nowrap" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(16,185,129,0.35)"}
                    onMouseOut={e =>  e.currentTarget.style.background = "rgba(16,185,129,0.2)"}>
                    <RotateCcw size={16} /> Devolver
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
