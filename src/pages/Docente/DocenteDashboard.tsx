import { useState, useEffect } from "react";
import { Package, Send, CheckCircle, PackageSearch, LogOut, Clock, ArrowRight } from "lucide-react";
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
    if (data) { setRole(data.rol); setPrimerLogin(data.primer_login === true); }
    else {
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
    } catch (e: any) { setClaveError(e.message || "Error al cambiar la contraseña."); }
    finally { setClaveLoading(false); }
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
      alert("Por favor, completá todos los campos."); return;
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
    } catch { alert("Error al enviar la solicitud."); }
  };

  // ── PENDING ──
  if (role === 'pendiente') return (
    <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", maxWidth: "440px", width: "100%" }}>
        <div style={{ display: "inline-flex", padding: "1.25rem", borderRadius: "9999px", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", marginBottom: "1.5rem" }}>
          <PackageSearch size={36} color="var(--warning)" />
        </div>
        <h2 style={{ marginBottom: "0.75rem" }}>Cuenta en revisión</h2>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.65, marginBottom: "2rem" }}>
          Tu cuenta fue creada exitosamente. Un administrador debe habilitarte antes de que puedas acceder al sistema.
        </p>
        <button onClick={() => supabase.auth.signOut()} className="btn btn-ghost">
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  // ── FIRST LOGIN ──
  if (primerLogin) return (
    <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "5%", left: "5%", width: "50vw", height: "50vw", background: "rgba(99,102,241,0.12)", borderRadius: "50%", filter: "blur(130px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", right: "5%", width: "40vw", height: "40vw", background: "rgba(6,182,212,0.1)", borderRadius: "50%", filter: "blur(130px)", pointerEvents: "none" }} />
      <div className="glass-panel" style={{ padding: "2.5rem", maxWidth: "400px", width: "100%", position: "relative", zIndex: 10 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", padding: "1rem", borderRadius: "1rem", background: "linear-gradient(135deg, var(--warning), var(--primary))", marginBottom: "1.25rem", boxShadow: "0 10px 25px rgba(245,158,11,0.4)" }}>
            <span style={{ fontSize: "1.75rem" }}>🔑</span>
          </div>
          <h2 style={{ marginBottom: "0.4rem" }}>¡Bienvenido/a!</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Es tu primer ingreso. Por seguridad, elegí una contraseña personal.
          </p>
        </div>
        {claveError && <div className="alert alert-danger" style={{ marginBottom: "1.25rem" }}>{claveError}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Nueva contraseña</label>
            <input type="password" placeholder="Mínimo 8 caracteres" value={nuevaClave} onChange={e => setNuevaClave(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Confirmar contraseña</label>
            <input type="password" placeholder="Repetí la contraseña" value={confirmClave} onChange={e => setConfirmClave(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleCambiarClave} disabled={claveLoading} style={{ padding: "0.875rem", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            {claveLoading ? "Guardando…" : "Guardar nueva contraseña"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── MAIN ──
  const misPrestamos = pedidosPendientes;
  const enMiPoder   = misPrestamos.filter(p => p.estado === 'Entregado');

  const iStyle: React.CSSProperties = {
    width: "100%", padding: "0.875rem 1rem", borderRadius: "0.625rem",
    background: "rgba(0,0,0,0.25)", color: "white", border: "1px solid var(--border)",
    fontSize: "0.9rem", fontFamily: "inherit"
  };

  const labelStyle: React.CSSProperties = {
    display: "block", marginBottom: "0.4rem", fontSize: "0.78rem",
    fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase"
  };

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || "Docente";

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary-light)", marginBottom: "0.3rem" }}>
            Panel Docente
          </p>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", letterSpacing: "-0.5px" }}>
            Hola, {displayName} 👋
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {user?.email}
          </p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="btn btn-ghost">
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>

      {/* Equipment in possession alert */}
      {enMiPoder.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "0.75rem", marginBottom: "1rem", color: "var(--warning)", fontWeight: "600", fontSize: "0.875rem" }}>
            ⚠️ Tenés {enMiPoder.length} equipo(s) en tu poder — ¡recordá devolverlos!
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {enMiPoder.map((p, i) => (
              <div key={p.id || i} className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", padding: "0.875rem", borderRadius: "0.875rem", background: "var(--warning-bg)", border: "1px solid var(--warning-border)" }}>
                  <Package size={22} color="var(--warning)" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: "700", fontSize: "1rem", marginBottom: "0.15rem" }}>{p.equipo}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Clock size={12} /> Retirado: {p.inicio} <span style={{ color: "var(--warning)", fontWeight: "600" }}>· En tu poder</span>
                  </p>
                </div>
                <button onClick={() => marcarDevuelto(p.id)} className="btn btn-success" style={{ gap: "0.5rem" }}>
                  <CheckCircle size={15} /> Devolver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", background: "var(--surface-2)", borderRadius: "0.75rem", padding: "0.3rem" }}>
        {[{ key: 'mis_prestamos', label: '📋 Mis Retiros' }, { key: 'solicitar', label: '📅 Solicitar Material' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem", border: "none", cursor: "pointer",
            fontFamily: "inherit", fontWeight: "600", fontSize: "0.875rem", transition: "all 0.2s",
            background: activeTab === t.key ? "var(--primary)" : "transparent",
            color: activeTab === t.key ? "white" : "var(--text-muted)",
            boxShadow: activeTab === t.key ? "0 4px 12px var(--primary-glow)" : "none"
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Mis Retiros */}
      {activeTab === "mis_prestamos" && (
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: "700", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Package size={18} color="var(--primary)" /> Mis Retiros
          </h2>

          {misPrestamos.length === 0 ? (
            <div className="empty-state">
              <Package size={44} />
              <h3>Sin retiros activos</h3>
              <p>Usá la pestaña "Solicitar Material" para hacer tu primer pedido.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {misPrestamos.map((p, i) => {
                const estadoColor = p.estado === 'Devuelto' ? 'var(--success)' : p.estado === 'Pendiente' ? 'var(--primary-light)' : 'var(--warning)';
                const estadoBg   = p.estado === 'Devuelto' ? 'var(--success-bg)' : p.estado === 'Pendiente' ? 'rgba(99,102,241,0.1)' : 'var(--warning-bg)';
                const estadoBorder = p.estado === 'Devuelto' ? 'var(--success-border)' : p.estado === 'Pendiente' ? 'rgba(99,102,241,0.25)' : 'var(--warning-border)';
                return (
                  <div key={p.id || i} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1rem", background: "var(--surface-2)", borderRadius: "0.625rem", border: "1px solid var(--border)", flexWrap: "wrap", transition: "border-color 0.15s" }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{p.equipo}</span>
                      {p.inicio && <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginLeft: "0.625rem" }}>{p.inicio}</span>}
                    </div>
                    <span style={{ padding: "0.2rem 0.65rem", borderRadius: "9999px", fontSize: "0.72rem", fontWeight: "700", letterSpacing: "0.03em", background: estadoBg, color: estadoColor, border: `1px solid ${estadoBorder}` }}>
                      {p.estado === 'Entregado' ? 'En mi poder' : p.estado}
                    </span>
                    {p.estado === 'Entregado' && (
                      <button onClick={() => marcarDevuelto(p.id)} className="btn btn-success" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
                        Devolver
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Solicitar Material */}
      {activeTab === "solicitar" && (
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: "700", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Send size={18} color="var(--secondary)" /> Nueva Solicitud
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.75rem", lineHeight: 1.6 }}>
            Reservá material para una clase futura. Preceptoría recibirá tu pedido al instante.
          </p>

          <form onSubmit={e => { e.preventDefault(); handleSolicitar(); }} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "560px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Fecha de retiro</label>
                <input type="date" value={fechaSolicitud} onChange={e => setFechaSolicitud(e.target.value)} style={iStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fecha de devolución</label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={iStyle} />
              </div>
              <div>
                <label style={labelStyle}>Hora inicio</label>
                <input type="time" value={horaSolicitud} onChange={e => setHoraSolicitud(e.target.value)} style={iStyle} />
              </div>
              <div>
                <label style={labelStyle}>Hora fin</label>
                <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} style={iStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Material solicitado</label>
              <select value={equipoSolicitado} onChange={e => setEquipoSolicitado(e.target.value)} style={iStyle}>
                <option value="">Seleccioná el equipo…</option>
                {equiposDisponibles.map((eq, i) => (
                  <option key={i} value={eq.nombre}>{eq.nombre}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: "0.875rem", fontSize: "0.95rem", marginTop: "0.25rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <Send size={16} /> Enviar Solicitud a Preceptoría <ArrowRight size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
