import { useState, useEffect } from "react";
import { Package, Send, CheckCircle, PackageSearch } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function DocenteDashboard() {
  const [activeTab, setActiveTab]               = useState("mis_prestamos");
  const [fechaSolicitud, setFechaSolicitud]     = useState("");
  const [fechaFin, setFechaFin]                 = useState("");
  const [horaSolicitud, setHoraSolicitud]       = useState("");
  const [horaFin, setHoraFin]                   = useState("");
  const [equipoSolicitado, setEquipoSolicitado] = useState("");
  const [pedidosPendientes, setPedidos]         = useState<any[]>([]);
  const [equiposDisponibles, setEquipos]        = useState<any[]>([]);
  const [user, setUser]                         = useState<any>(null);
  const [role, setRole]                         = useState<string | null>(null);
  const [primerLogin, setPrimerLogin]           = useState(false);
  const [nuevaClave, setNuevaClave]             = useState("");
  const [confirmClave, setConfirmClave]         = useState("");
  const [claveError, setClaveError]             = useState("");
  const [claveLoading, setClaveLoading]         = useState(false);

  const checkRole = async (u: any) => {
    const { data } = await supabase.from('usuarios').select('rol, primer_login').eq('email', u.email).single();
    if (data) {
      setRole(data.rol);
      setPrimerLogin(data.primer_login === true);
    } else {
      await supabase.from('usuarios').insert({ email: u.email, nombre: u.user_metadata?.full_name || u.email, rol: 'pendiente' });
      setRole('pendiente');
    }
  };

  const handleCambiarClave = async () => {
    setClaveError("");
    if (nuevaClave.length < 8) return setClaveError("La contraseña debe tener al menos 8 caracteres.");
    if (nuevaClave !== confirmClave) return setClaveError("Las contraseñas no coinciden.");
    setClaveLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nuevaClave });
      if (error) throw error;
      await supabase.from('usuarios').update({ primer_login: false }).eq('email', user.email);
      setPrimerLogin(false);
    } catch (e: any) {
      setClaveError(e.message || "Error al cambiar la contraseña.");
    } finally { setClaveLoading(false); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null; setUser(u); if (u) checkRole(u);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null; setUser(u); if (u) checkRole(u);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    supabase.from('equipos').select('nombre, categoria').eq('estado', 'Operativa').then(({ data }) => { if (data) setEquipos(data); });
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => { const { data } = await supabase.from('pedidos').select('*').eq('docenteid', user.id); if (data) setPedidos(data); };
    fetch();
    const ch = supabase.channel('pedidos-docente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `docenteid=eq.${user.id}` }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const marcarDevuelto = async (id: string) => {
    try { await supabase.from('pedidos').update({ estado: "Devuelto" }).eq('id', id); } catch (e) { console.error(e); }
  };

  const handleSolicitar = async () => {
    if (!fechaSolicitud || !fechaFin || !horaSolicitud || !horaFin || !equipoSolicitado) {
      alert("Por favor, complete todos los campos."); return;
    }
    if (!user) { alert("No estás autenticado correctamente."); return; }
    try {
      const { error } = await supabase.from('pedidos').insert({
        docenteid: user.id, docente: user.email,
        fecha: fechaSolicitud === fechaFin ? fechaSolicitud : `${fechaSolicitud} al ${fechaFin}`,
        inicio: horaSolicitud, fin: horaFin, equipo: equipoSolicitado,
        estado: "Pendiente", createdat: Date.now()
      });
      if (error) throw error;
      alert("✅ Pedido enviado con éxito.");
      setFechaSolicitud(""); setFechaFin(""); setHoraSolicitud(""); setHoraFin(""); setEquipoSolicitado("");
    } catch (e) { console.error(e); alert("Error al enviar la solicitud."); }
  };

  // ── PENDING ACCOUNT ──
  if (role === 'pendiente') {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", maxWidth: "480px" }}>
          <PackageSearch size={48} color="var(--warning)" style={{ marginBottom: "1rem" }} />
          <h2>Cuenta en revisión</h2>
          <p style={{ color: "var(--text-muted)", margin: "1rem 0 2rem" }}>
            Tu cuenta fue creada. Un administrador debe habilitarte antes de que puedas acceder.
          </p>
          <button onClick={() => supabase.auth.signOut()} className="btn btn-secondary">Cerrar Sesión</button>
        </div>
      </div>
    );
  }

  // ── FIRST LOGIN: FORCE PASSWORD CHANGE ──
  if (primerLogin) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", left: "10%", width: "40vw", height: "40vw", background: "rgba(139,92,246,0.2)", borderRadius: "50%", filter: "blur(100px)", zIndex: 0 }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: "40vw", height: "40vw", background: "rgba(14,165,233,0.2)", borderRadius: "50%", filter: "blur(100px)", zIndex: 0 }} />
        <div className="glass-panel" style={{ padding: "3rem", maxWidth: "440px", width: "100%", position: "relative", zIndex: 10 }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ display: "inline-flex", background: "linear-gradient(135deg, var(--warning), var(--primary))", padding: "1rem", borderRadius: "1rem", marginBottom: "1rem", boxShadow: "0 10px 25px -5px rgba(245,158,11,0.5)" }}>
              <span style={{ fontSize: "2rem" }}>🔑</span>
            </div>
            <h2 style={{ marginBottom: "0.5rem" }}>¡Bienvenido/a!</h2>
            <p style={{ color: "var(--text-muted)" }}>Es tu primer ingreso al sistema.<br/>Por seguridad, elegí una nueva contraseña personal.</p>
          </div>
          {claveError && (
            <div style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", padding: "0.75rem 1rem", borderRadius: "0.5rem", border: "1px solid rgba(239,68,68,0.4)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              {claveError}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: "500" }}>Nueva Contraseña</label>
              <input type="password" placeholder="Mínimo 8 caracteres" value={nuevaClave} onChange={e => setNuevaClave(e.target.value)}
                style={{ width: "100%", padding: "1rem", borderRadius: "0.75rem", background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid var(--border)", fontSize: "1rem", fontFamily: "inherit" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: "500" }}>Confirmar Contraseña</label>
              <input type="password" placeholder="Repite tu nueva contraseña" value={confirmClave} onChange={e => setConfirmClave(e.target.value)}
                style={{ width: "100%", padding: "1rem", borderRadius: "0.75rem", background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid var(--border)", fontSize: "1rem", fontFamily: "inherit" }} />
            </div>
            <button className="btn btn-primary" onClick={handleCambiarClave} disabled={claveLoading}
              style={{ padding: "1rem", borderRadius: "0.75rem", fontSize: "1.1rem", marginTop: "0.5rem" }}>
              {claveLoading ? "Guardando..." : "Guardar Nueva Contraseña"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD ──
  const misPrestamos = pedidosPendientes;
  const enMiPoder   = misPrestamos.filter(p => p.estado === 'Entregado');

  const iStyle: React.CSSProperties = {
    width: "100%", padding: "1rem 1.1rem", borderRadius: "0.75rem",
    background: "rgba(0,0,0,0.25)", color: "white", border: "1px solid var(--border)",
    fontSize: "1rem", fontFamily: "inherit"
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" }}>

      {/* Header */}
      <header style={{ marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "0.25rem" }}>
            👋 Hola, {user?.email?.split('@')[0] || "Docente"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Panel de Equipos Escolares</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "0.5rem 1rem", borderRadius: "0.5rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem" }}>
          Cerrar sesión
        </button>
      </header>

      {/* Alert: equipos en poder */}
      {enMiPoder.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: "0.75rem", padding: "0.75rem 1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#f59e0b", fontWeight: "600" }}>
            ⚠️ Tenés {enMiPoder.length} equipo(s) en tu poder. ¡Recordá devolverlo(s)!
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {enMiPoder.map((p, i) => (
              <div key={p.id || i} className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                <div style={{ fontSize: "2rem" }}>🖥️</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: "700", fontSize: "1.1rem", marginBottom: "0.1rem" }}>{p.equipo}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Retirado: {p.inicio} · <strong style={{ color: "#f59e0b" }}>{p.estado === 'Entregado' ? 'En tu poder' : p.estado}</strong></p>
                </div>
                {p.estado === 'Entregado' && (
                  <button onClick={() => marcarDevuelto(p.id)}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", borderRadius: "0.6rem", background: "rgba(16,185,129,0.2)", color: "#10b981", border: "1px solid rgba(16,185,129,0.5)", cursor: "pointer", fontFamily: "inherit", fontWeight: "700", fontSize: "0.95rem", whiteSpace: "nowrap" }}>
                    <CheckCircle size={16} /> Devolver
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.05)", borderRadius: "0.75rem", padding: "0.35rem" }}>
        {[{ key: 'mis_prestamos', label: '📋 Mis Retiros' }, { key: 'solicitar', label: '📅 Solicitar Material' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ flex: 1, padding: "0.65rem", borderRadius: "0.5rem", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: "600", fontSize: "0.95rem", transition: "all 0.2s",
              background: activeTab === t.key ? "var(--primary)" : "transparent",
              color: activeTab === t.key ? "white" : "var(--text-muted)"
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Mis Retiros */}
      {activeTab === "mis_prestamos" && (
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Package size={20} color="var(--primary)" /> Mis Retiros
          </h2>
          {misPrestamos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
              <Package size={40} style={{ marginBottom: "0.75rem", opacity: 0.4 }} />
              <p>No tenés retiros activos. ¡Hacé una solicitud!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {misPrestamos.map((p, i) => (
                <div key={p.id || i} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.9rem 1rem", background: "rgba(255,255,255,0.03)", borderRadius: "0.6rem", border: "1px solid var(--border)", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: "600" }}>{p.equipo}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: "0.75rem" }}>{p.inicio}</span>
                  </div>
                  <span style={{ padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.8rem", fontWeight: "600",
                    background: p.estado === 'Devuelto' ? "rgba(16,185,129,0.15)" : p.estado === 'Pendiente' ? "rgba(139,92,246,0.15)" : "rgba(245,158,11,0.15)",
                    color: p.estado === 'Devuelto' ? "#10b981" : p.estado === 'Pendiente' ? "#8b5cf6" : "#f59e0b",
                    border: `1px solid ${p.estado === 'Devuelto' ? 'rgba(16,185,129,0.4)' : p.estado === 'Pendiente' ? 'rgba(139,92,246,0.4)' : 'rgba(245,158,11,0.4)'}`
                  }}>
                    {p.estado === 'Entregado' ? 'En mi poder' : p.estado}
                  </span>
                  {p.estado === 'Entregado' && (
                    <button onClick={() => marcarDevuelto(p.id)}
                      style={{ padding: "0.35rem 0.8rem", borderRadius: "0.4rem", background: "rgba(16,185,129,0.2)", color: "#10b981", border: "1px solid rgba(16,185,129,0.4)", cursor: "pointer", fontFamily: "inherit", fontWeight: "600", fontSize: "0.85rem" }}>
                      Devolver
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Solicitar Material */}
      {activeTab === "solicitar" && (
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Send size={20} color="var(--secondary)" /> Nueva Solicitud
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Reservá material para una clase futura. Preceptoría recibirá tu pedido.
          </p>
          <form onSubmit={e => { e.preventDefault(); handleSolicitar(); }} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "580px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", color: "var(--text-muted)", fontWeight: "600", fontSize: "0.9rem" }}>Fecha de Retiro</label>
                <input type="date" value={fechaSolicitud} onChange={e => setFechaSolicitud(e.target.value)} style={iStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", color: "var(--text-muted)", fontWeight: "600", fontSize: "0.9rem" }}>Fecha de Devolución</label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={iStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", color: "var(--text-muted)", fontWeight: "600", fontSize: "0.9rem" }}>Hora Inicio</label>
                <input type="time" value={horaSolicitud} onChange={e => setHoraSolicitud(e.target.value)} style={iStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", color: "var(--text-muted)", fontWeight: "600", fontSize: "0.9rem" }}>Hora Fin</label>
                <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} style={iStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", color: "var(--text-muted)", fontWeight: "600", fontSize: "0.9rem" }}>Material solicitado</label>
              <select value={equipoSolicitado} onChange={e => setEquipoSolicitado(e.target.value)} style={iStyle}>
                <option value="">Seleccioná el equipo…</option>
                {equiposDisponibles.map((eq, i) => (
                  <option key={i} value={eq.nombre}>{eq.nombre}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: "1rem", fontSize: "1.05rem", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <Send size={18} /> Enviar Solicitud a Preceptoría
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
