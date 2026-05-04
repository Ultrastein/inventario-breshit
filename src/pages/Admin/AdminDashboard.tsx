import { useState, useEffect } from "react";
import {
  ShieldAlert, Users, Laptop, AlertTriangle, UserCog, UserPlus,
  Trash2, Edit, History, ShoppingCart, Key, LogOut, RefreshCw
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("alertas");
  const [pedidosPendientes, setPedidosPendientes] = useState<any[]>([]);
  const [historialPedidos, setHistorialPedidos] = useState<any[]>([]);
  const [usuariosDb, setUsuariosDb] = useState<any[]>([]);
  const [equiposDb, setEquiposDb] = useState<any[]>([]);
  const [comprasDb, setComprasDb] = useState<any[]>([]);
  const [filtroCompras, setFiltroCompras] = useState("Todos");
  const [nuevoArticulo, setNuevoArticulo] = useState("");
  const [loteCat, setLoteCat] = useState("docente");
  const [loteNombre, setLoteNombre] = useState("");
  const [loteCant, setLoteCant] = useState(1);
  const [excelRows, setExcelRows] = useState([{ id: 1, nombre: "", categoria: "docente" }]);
  const [altaMode, setAltaMode] = useState("lote");
  const [adminRole, setAdminRole] = useState(false);
  const [altaRapida, setAltaRapida] = useState({ nombre: '', email: '', password: 'Escuela2025!' });
  const [altaRapidaMsg, setAltaRapidaMsg] = useState({ text: '', ok: false });
  const [altaRapidaLoading, setAltaRapidaLoading] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  const generarClave = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    setAltaRapida(prev => ({ ...prev, password: Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') }));
  };

  const handleAltaRapida = async () => {
    setAltaRapidaMsg({ text: '', ok: false });
    const emailNorm = altaRapida.email.trim().toLowerCase();
    const nombreNorm = altaRapida.nombre.trim();
    if (!nombreNorm || !emailNorm || !altaRapida.password)
      return setAltaRapidaMsg({ text: 'Completá todos los campos.', ok: false });

    const usernameSug = emailNorm.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    setAltaRapidaLoading(true);
    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: emailNorm, password: altaRapida.password });
      const yaExiste = signUpError?.message?.toLowerCase().includes('already registered') || signUpError?.message?.toLowerCase().includes('already in use') || signUpError?.message?.toLowerCase().includes('email');
      const esRateLimit = signUpError?.message?.toLowerCase().includes('rate limit');
      if (signUpError && !yaExiste && !esRateLimit) throw signUpError;
      if (adminSession) await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
      const userId = signUpData?.user?.id;
      const { error: dbError } = await supabase.from('usuarios').upsert({ id: userId, email: emailNorm, nombre: nombreNorm, nombre_usuario: usernameSug, rol: 'docente', primer_login: true }, { onConflict: 'email' });
      if (dbError) throw dbError;
      let aviso = `✅ Docente creado. Usuario: "${usernameSug}" · Clave temporal: ${altaRapida.password}`;
      if (yaExiste) aviso = `⚠️ El correo ya estaba registrado. Se actualizó su perfil.`;
      else if (esRateLimit) aviso = `✅ Docente registrado. (Nota: límite de correos alcanzado, verificá en Supabase).`;
      setAltaRapidaMsg({ text: aviso, ok: !yaExiste });
      if (!yaExiste) setAltaRapida({ nombre: '', email: '', password: 'Escuela2025!' });
      fetchData();
    } catch (e: any) {
      setAltaRapidaMsg({ text: e.message || 'Error al crear el docente.', ok: false });
    } finally { setAltaRapidaLoading(false); }
  };

  const handleEliminarDocente = async (email: string, nombre: string) => {
    if (!confirm(`⚠️ ¿Eliminar a "${nombre}" (${email})?\n\nEsto borrará su perfil del sistema. Esta acción NO se puede deshacer.`)) return;
    try {
      const { error } = await supabase.from('usuarios').delete().eq('email', email);
      if (error) throw error;
      const { data: uData } = await supabase.from('usuarios').select('*');
      if (uData) setUsuariosDb(uData);
    } catch (e: any) { alert('Error al eliminar: ' + (e.message || e)); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { window.location.hash = '#/login'; return; }
      setAdminUser(session.user);
      supabase.from('usuarios').select('rol').eq('email', session.user.email).single().then(({ data }) => {
        if (data?.rol === 'admin') setAdminRole(true);
        else window.location.hash = '#/docente';
      });
    });
  }, []);

  const fetchData = async () => {
    const [pRes, hRes, uRes, eRes, cRes] = await Promise.all([
      supabase.from('pedidos').select('*').neq('estado', 'Devuelto'),
      supabase.from('pedidos').select('*').order('createdat', { ascending: false }),
      supabase.from('usuarios').select('*'),
      supabase.from('equipos').select('*'),
      supabase.from('compras').select('*').order('created_at', { ascending: false }),
    ]);
    if (pRes.data) setPedidosPendientes(pRes.data);
    if (hRes.data) setHistorialPedidos(hRes.data);
    if (uRes.data) setUsuariosDb(uRes.data);
    if (eRes.data) setEquiposDb(eRes.data);
    if (cRes.data) setComprasDb(cRes.data);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compras' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const marcarEntregado = async (id: string) => {
    await supabase.from('pedidos').update({ estado: "Entregado" }).eq('id', id);
  };

  const handleGuardarLote = async () => {
    try {
      if (loteCant < 1) return;
      const baseNombre = loteNombre.trim() || (loteCat === 'docente' ? 'Notebook Docente' : loteCat === 'alumnado' ? 'Notebook Alumno' : 'Equipo Aula');
      const existentes = equiposDb.filter((e: any) => e.categoria === loteCat).length;
      const equipos = Array.from({ length: loteCant }, (_, i) => ({
        nombre: `${baseNombre} ${existentes + i + 1}`,
        categoria: loteCat, estado: "Operativa", numero: existentes + i + 1
      }));
      const { error } = await supabase.from('equipos').insert(equipos);
      if (error) throw error;
      alert("Lote generado exitosamente.");
      setLoteNombre("");
    } catch { alert("Error al generar el lote."); }
  };

  const handleGuardarExcel = async () => {
    try {
      const validRows = excelRows.filter(r => r.nombre.trim());
      if (!validRows.length) return alert("No hay filas válidas.");
      const { error } = await supabase.from('equipos').insert(validRows.map(r => ({ nombre: r.nombre, categoria: r.categoria, estado: "Operativa" })));
      if (error) throw error;
      alert("Equipos registrados exitosamente.");
      setExcelRows([{ id: Date.now(), nombre: "", categoria: "docente" }]);
    } catch { alert("Error al guardar."); }
  };

  const handleAgregarCompra = async () => {
    if (!nuevoArticulo.trim()) return;
    await supabase.from('compras').insert({ articulo: nuevoArticulo, estado: 'Falta Pedir' });
    setNuevoArticulo("");
  };

  const handleEstadoCompra = async (id: string, nuevoEstado: string) => {
    const updateData: any = { estado: nuevoEstado };
    if (nuevoEstado === 'Recibido') updateData.fecha_recibido = new Date().toISOString();
    await supabase.from('compras').update(updateData).eq('id', id);
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`¿Enviar un correo de recuperación a ${email}?`)) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      alert(`Correo enviado a ${email}.`);
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const handleEliminarPedido = async (id: string, docente: string) => {
    if (!confirm(`¿Eliminar permanentemente el pedido de "${docente}"? Esta acción no se puede deshacer.`)) return;
    try {
      await supabase.from('pedidos').delete().eq('id', id);
    } catch { alert('Error al eliminar el pedido.'); }
  };

  if (!adminRole) return (
    <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
        <RefreshCw size={32} style={{ marginBottom: "1rem", animation: "spin 1s linear infinite" }} />
        <p>Verificando permisos…</p>
      </div>
    </div>
  );

  const usuariosPendientes = usuariosDb.filter(u => u.rol === 'pendiente');
  const usuariosActivos = usuariosDb.filter(u => u.rol !== 'pendiente');
  const comprasVisibles = comprasDb.filter(c => {
    if (filtroCompras !== "Todos" && c.estado !== filtroCompras) return false;
    if (c.estado === 'Recibido' && c.fecha_recibido && Date.now() - new Date(c.fecha_recibido).getTime() > 7 * 24 * 60 * 60 * 1000) return false;
    return true;
  });

  const sidebarItems = [
    { key: 'alertas',   icon: <ShieldAlert size={17} />, label: 'Alertas de Cierre', badge: pedidosPendientes.filter(p => p.estado === 'Entregado').length || null },
    { key: 'inventario', icon: <Laptop size={17} />,      label: 'Inventario' },
    { key: 'pedidos',   icon: <Users size={17} />,        label: 'Pedidos Activos', badge: pedidosPendientes.length || null },
    { key: 'historial', icon: <History size={17} />,      label: 'Historial' },
    { key: 'usuarios',  icon: <UserCog size={17} />,      label: 'Personal', badge: usuariosPendientes.length || null },
    { key: 'compras',   icon: <ShoppingCart size={17} />, label: 'Compras' },
  ];

  const labelStyle: React.CSSProperties = {
    display: "block", marginBottom: "0.35rem", fontSize: "0.75rem",
    fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase"
  };

  const inputStyle: React.CSSProperties = {
    padding: "0.65rem 0.875rem", borderRadius: "0.5rem",
    background: "rgba(0,0,0,0.3)", color: "white",
    border: "1px solid var(--border)", fontFamily: "inherit", width: "100%"
  };

  return (
    <div className="container" style={{ maxWidth: "1400px" }}>

      {/* Page header */}
      <div style={{ marginBottom: "2rem", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary-light)", marginBottom: "0.3rem" }}>
            Panel de Gestión
          </p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "800", letterSpacing: "-0.5px" }}>Administrador</h1>
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => { window.location.hash = '#/login'; })}
          className="btn btn-ghost"
          style={{ gap: "0.5rem" }}
        >
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* Sidebar */}
        <div className="glass-panel" style={{ padding: "1rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-subtle)", padding: "0.5rem 0.875rem", marginBottom: "0.25rem" }}>
            Navegación
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            {sidebarItems.map(item => (
              <button
                key={item.key}
                className={`sidebar-btn ${activeTab === item.key ? 'active' : ''}`}
                onClick={() => setActiveTab(item.key)}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge ? (
                  <span style={{ minWidth: "20px", height: "20px", borderRadius: "9999px", background: activeTab === item.key ? "rgba(99,102,241,0.25)" : "var(--danger-bg)", color: activeTab === item.key ? "var(--primary-light)" : "var(--danger)", fontSize: "0.7rem", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", marginTop: "1rem", paddingTop: "1rem" }}>
            <div style={{ padding: "0.5rem 0.875rem" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--text-subtle)", marginBottom: "0.1rem" }}>Conectado como</p>
              <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)", wordBreak: "break-all" }}>{adminUser?.email}</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div>

          {/* ── ALERTAS ── */}
          {activeTab === "alertas" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <div className="section-header">
                <div className="section-title" style={{ color: "var(--danger)" }}>
                  <AlertTriangle size={20} /> Equipos sin Devolver
                </div>
              </div>

              {pedidosPendientes.filter(p => p.estado === 'Entregado').length === 0 ? (
                <div className="empty-state">
                  <ShieldAlert size={48} />
                  <h3>Todo en orden</h3>
                  <p>No hay equipos pendientes de devolución.</p>
                </div>
              ) : (
                <>
                  <div className="alert alert-danger" style={{ marginBottom: "1.5rem" }}>
                    ⚠️ Hay <strong>{pedidosPendientes.filter(p => p.estado === 'Entregado').length}</strong> equipo(s) retirados que aún no fueron devueltos.
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Docente</th><th>Dispositivo</th><th>Hora de retiro</th><th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosPendientes.filter(p => p.estado === 'Entregado').map((p, i) => (
                        <tr key={p.id || i}>
                          <td style={{ fontWeight: "600" }}>{p.docente}</td>
                          <td>{p.equipo}</td>
                          <td style={{ color: "var(--text-muted)" }}>{p.inicio || '—'}</td>
                          <td>
                            <button
                              className="btn btn-secondary"
                              onClick={() => window.location.href = `mailto:${p.docente}?subject=Aviso: Devolución de Dispositivo&body=Estimado/a docente,%0A%0AEl sistema indica que tiene en su poder el dispositivo "${p.equipo}".%0APor favor, devuélvalo a preceptoría.%0A%0AGracias.`}
                            >
                              📧 Contactar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* ── INVENTARIO ── */}
          {activeTab === "inventario" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <div className="section-header">
                <div className="section-title">
                  <Laptop size={20} color="var(--primary)" /> Gestión de Inventario
                </div>
              </div>

              {/* Mode selector */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", background: "var(--surface-2)", padding: "0.35rem", borderRadius: "0.625rem", width: "fit-content" }}>
                {[{ v: "lote", l: "Carga en lote" }, { v: "excel", l: "Grilla detallada" }].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setAltaMode(opt.v)}
                    style={{
                      padding: "0.45rem 1rem", border: "none", borderRadius: "0.45rem", cursor: "pointer",
                      fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", transition: "all 0.15s",
                      background: altaMode === opt.v ? "var(--primary)" : "transparent",
                      color: altaMode === opt.v ? "white" : "var(--text-muted)",
                      boxShadow: altaMode === opt.v ? "0 4px 12px var(--primary-glow)" : "none"
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>

              {altaMode === "lote" && (
                <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.875rem" }}>
                  <h3 style={{ marginBottom: "1.25rem", fontSize: "0.95rem", fontWeight: "700" }}>Carga Rápida en Lote</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
                    <div>
                      <label style={labelStyle}>Nombre base</label>
                      <input type="text" placeholder="Ej. Notebook Lenovo..." value={loteNombre} onChange={e => setLoteNombre(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Categoría</label>
                      <input type="text" list="categorias-list" value={loteCat} onChange={e => setLoteCat(e.target.value)} placeholder="docente / alumnado..." style={inputStyle} />
                      <datalist id="categorias-list">
                        <option value="docente" />
                        <option value="alumnado" />
                        <option value="aula" />
                      </datalist>
                    </div>
                    <div>
                      <label style={labelStyle}>Cantidad</label>
                      <input type="number" value={loteCant} onChange={e => setLoteCant(Number(e.target.value))} min="1" max="50" style={inputStyle} />
                    </div>
                    <button className="btn btn-primary" onClick={handleGuardarLote}>Generar</button>
                  </div>
                </div>
              )}

              {altaMode === "excel" && (
                <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: "700", margin: 0 }}>Carga Detallada</h3>
                    <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }} onClick={() => setExcelRows([...excelRows, { id: Date.now(), nombre: "", categoria: "docente" }])}>
                      + Agregar fila
                    </button>
                  </div>
                  <table className="data-table" style={{ marginTop: 0 }}>
                    <thead><tr><th>#</th><th>Nombre / Etiqueta</th><th>Categoría</th><th></th></tr></thead>
                    <tbody>
                      {excelRows.map((row, index) => (
                        <tr key={row.id}>
                          <td style={{ color: "var(--text-subtle)", width: "40px" }}>{index + 1}</td>
                          <td><input type="text" placeholder="Ej. NB-Gobierno-2023-A" value={row.nombre} onChange={e => setExcelRows(excelRows.map(r => r.id === row.id ? { ...r, nombre: e.target.value } : r))} style={{ ...inputStyle, padding: "0.5rem 0.75rem" }} /></td>
                          <td><input type="text" list="categorias-list" value={row.categoria} onChange={e => setExcelRows(excelRows.map(r => r.id === row.id ? { ...r, categoria: e.target.value } : r))} style={{ ...inputStyle, padding: "0.5rem 0.75rem" }} /></td>
                          <td style={{ width: "50px" }}>
                            <button className="btn btn-danger" style={{ padding: "0.4rem" }} onClick={() => setExcelRows(excelRows.filter(r => r.id !== row.id))}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button className="btn btn-primary" onClick={handleGuardarExcel}>Guardar {excelRows.length} fila(s)</button>
                  </div>
                </div>
              )}

              <h3 style={{ marginBottom: "1.25rem", fontSize: "0.95rem", fontWeight: "700" }}>Equipos Registrados</h3>

              {equiposDb.length === 0 ? (
                <div className="empty-state"><Laptop size={48} /><h3>Sin equipos registrados</h3><p>Usá la carga en lote o la grilla para agregar equipos.</p></div>
              ) : [
                { key: 'docente',  label: '👨‍🏫 Material Docente',  altKeys: ['notebook_docentes', 'Notebook Docente'], color: '#6366f1', border: 'rgba(99,102,241,0.2)'  },
                { key: 'alumnado', label: '🎒 Material Alumnado', altKeys: ['notebook_alumnos', 'Notebook Alumno'],  color: '#06b6d4', border: 'rgba(6,182,212,0.2)'    },
                { key: 'aula',     label: '📽️ Material de Aula',  altKeys: [],                                       color: '#22c55e', border: 'rgba(34,197,94,0.2)'    },
              ].map(cat => {
                const items = equiposDb.filter((eq: any) => eq.categoria === cat.key || cat.altKeys.includes(eq.categoria));
                if (!items.length) return null;
                return (
                  <div key={cat.key} style={{ marginBottom: "1.5rem", border: `1px solid ${cat.border}`, borderRadius: "0.875rem", overflow: "hidden" }}>
                    <div style={{ padding: "0.75rem 1.25rem", background: `rgba(${cat.color === '#6366f1' ? '99,102,241' : cat.color === '#06b6d4' ? '6,182,212' : '34,197,94'},0.08)`, fontWeight: "700", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {cat.label}
                      <span style={{ fontWeight: "400", color: "var(--text-muted)", fontSize: "0.8rem" }}>({items.length} equipos)</span>
                    </div>
                    <table className="data-table" style={{ margin: 0 }}>
                      <thead><tr><th>ID</th><th>Dispositivo</th><th>Estado</th><th>Comentarios</th><th></th></tr></thead>
                      <tbody>
                        {items.map((eq: any) => (
                          <tr key={eq.id}>
                            <td style={{ color: "var(--text-subtle)", fontSize: "0.75rem", fontFamily: "monospace" }}>{String(eq.id).slice(-8).toUpperCase()}</td>
                            <td style={{ fontWeight: "600" }}>{eq.nombre}</td>
                            <td>
                              <select
                                value={eq.estado || 'Operativa'}
                                onChange={async e => { await supabase.from('equipos').update({ estado: e.target.value }).eq('id', eq.id); }}
                                style={{ ...inputStyle, width: "auto", padding: "0.35rem 0.6rem", fontSize: "0.8rem", color: eq.estado === 'Operativa' ? "var(--success)" : "var(--danger)", background: eq.estado === 'Operativa' ? "var(--success-bg)" : "var(--danger-bg)", border: `1px solid ${eq.estado === 'Operativa' ? 'var(--success-border)' : 'var(--danger-border)'}`, fontWeight: "700" }}
                              >
                                <option value="Operativa">Operativa</option>
                                <option value="En Reparación">En Reparación</option>
                                <option value="Rota">Rota / Baja</option>
                              </select>
                            </td>
                            <td>
                              <input type="text" defaultValue={eq.comentario || ""} placeholder="Observaciones…" onBlur={async e => { await supabase.from('equipos').update({ comentario: e.target.value }).eq('id', eq.id); }} style={{ ...inputStyle, padding: "0.4rem 0.6rem", fontSize: "0.8rem", background: "transparent", border: "1px solid transparent" }} onFocus={e => (e.target.style.borderColor = "var(--border)")} />
                            </td>
                            <td style={{ width: "50px" }}>
                              <button className="btn btn-danger" style={{ padding: "0.4rem" }} onClick={async () => { if (confirm(`¿Eliminar ${eq.nombre}?`)) await supabase.from('equipos').delete().eq('id', eq.id); }}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PEDIDOS ACTIVOS ── */}
          {activeTab === "pedidos" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <div className="section-header">
                <div className="section-title"><Users size={20} color="var(--primary)" /> Pedidos en Vivo</div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Sincronizado en tiempo real</span>
              </div>

              {pedidosPendientes.length === 0 ? (
                <div className="empty-state"><Users size={48} /><h3>Sin pedidos activos</h3><p>Los nuevos pedidos aparecerán aquí automáticamente.</p></div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Docente</th><th>Fecha</th><th>Horario</th><th>Equipo</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {pedidosPendientes.map((p: any, i: number) => (
                      <tr key={p.id || i}>
                        <td style={{ fontWeight: "600" }}>{p.docente}</td>
                        <td style={{ color: "var(--text-muted)" }}>{p.fecha}</td>
                        <td style={{ color: "var(--text-muted)" }}>{p.inicio} – {p.fin}</td>
                        <td>{p.equipo}</td>
                        <td>
                          <span className={`badge ${p.estado === 'Entregado' ? 'badge-warning' : 'badge-primary'}`}>{p.estado}</span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            {p.estado !== "Entregado" && (
                              <button className="btn btn-success" style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem" }} onClick={() => marcarEntregado(p.id)}>
                                ✓ Entregado
                              </button>
                            )}
                            {p.estado !== "Devuelto" && (
                              <button className="btn btn-secondary" style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem" }} onClick={async () => { await supabase.from('pedidos').update({ estado: 'Devuelto' }).eq('id', p.id); }}>
                                ↩ Devuelto
                              </button>
                            )}
                            <button className="btn btn-danger" style={{ padding: "0.35rem 0.5rem" }} onClick={() => handleEliminarPedido(p.id, p.docente || 'desconocido')}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── HISTORIAL ── */}
          {activeTab === "historial" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <div className="section-header">
                <div className="section-title"><History size={20} color="var(--primary)" /> Historial de Pedidos</div>
              </div>

              {historialPedidos.length === 0 ? (
                <div className="empty-state"><History size={48} /><h3>Sin historial</h3><p>Los pedidos completados aparecerán aquí.</p></div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Docente</th><th>Fecha</th><th>Horario</th><th>Equipo</th><th>Estado</th></tr></thead>
                  <tbody>
                    {historialPedidos.map((p: any, i: number) => (
                      <tr key={p.id || i}>
                        <td style={{ fontWeight: "600" }}>{p.docente}</td>
                        <td style={{ color: "var(--text-muted)" }}>{p.fecha}</td>
                        <td style={{ color: "var(--text-muted)" }}>{p.inicio} – {p.fin}</td>
                        <td>{p.equipo}</td>
                        <td>
                          <span className={`badge ${p.estado === 'Devuelto' ? 'badge-success' : p.estado === 'Entregado' ? 'badge-warning' : 'badge-primary'}`}>
                            {p.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── COMPRAS ── */}
          {activeTab === "compras" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <div className="section-header">
                <div className="section-title"><ShoppingCart size={20} color="var(--primary)" /> Lista de Compras</div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <input type="text" value={nuevoArticulo} onChange={e => setNuevoArticulo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAgregarCompra()} placeholder="Ej. 10x Cables HDMI, Pantalla táctil…" style={inputStyle} />
                <button onClick={handleAgregarCompra} className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>+ Agregar</button>
              </div>

              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                {['Todos', 'Falta Pedir', 'Pedido', 'Comprado', 'Recibido'].map(f => (
                  <button key={f} onClick={() => setFiltroCompras(f)}
                    style={{ padding: "0.35rem 0.875rem", border: `1px solid ${filtroCompras === f ? 'var(--primary)' : 'var(--border)'}`, borderRadius: "9999px", background: filtroCompras === f ? "rgba(99,102,241,0.12)" : "transparent", color: filtroCompras === f ? "var(--primary-light)" : "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", fontFamily: "inherit", transition: "all 0.15s" }}>
                    {f}
                  </button>
                ))}
              </div>

              {comprasVisibles.length === 0 ? (
                <div className="empty-state"><ShoppingCart size={48} /><h3>Sin artículos</h3><p>No hay compras para este filtro.</p></div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Artículo</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    {comprasVisibles.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: "600" }}>{c.articulo}</td>
                        <td>
                          <select value={c.estado} onChange={e => handleEstadoCompra(c.id, e.target.value)} style={{ ...inputStyle, width: "auto", padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}>
                            <option value="Falta Pedir">Falta Pedir</option>
                            <option value="Pedido">Pedido</option>
                            <option value="Comprado">Comprado</option>
                            <option value="Recibido">Recibido</option>
                          </select>
                        </td>
                        <td style={{ width: "50px" }}>
                          <button className="btn btn-danger" style={{ padding: "0.4rem" }} onClick={async () => { if (confirm(`¿Eliminar "${c.articulo}"?`)) await supabase.from('compras').delete().eq('id', c.id); }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p style={{ marginTop: "1rem", fontSize: "0.78rem", color: "var(--text-subtle)" }}>
                * Los artículos "Recibido" desaparecen automáticamente después de 1 semana.
              </p>
            </div>
          )}

          {/* ── USUARIOS ── */}
          {activeTab === "usuarios" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <div className="section-header">
                <div className="section-title"><UserCog size={20} color="var(--primary)" /> Control de Personal</div>
                <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "0.45rem 0.875rem" }} onClick={() => document.getElementById('alta-rapida-form')?.scrollIntoView({ behavior: 'smooth' })}>
                  <UserPlus size={15} /> Nuevo Docente
                </button>
              </div>

              {usuariosPendientes.length > 0 && (
                <div style={{ marginBottom: "2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                    <AlertTriangle size={16} color="var(--warning)" />
                    <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--warning)" }}>
                      {usuariosPendientes.length} usuario(s) pendiente(s) de aprobación
                    </span>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Nombre</th><th>Correo</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {usuariosPendientes.map(u => (
                        <tr key={u.email} style={{ background: "var(--warning-bg)" }}>
                          <td style={{ fontWeight: "600" }}>{u.nombre || "Sin nombre"}</td>
                          <td style={{ color: "var(--text-muted)" }}>{u.email}</td>
                          <td>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button className="btn btn-success" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }} onClick={async () => { await supabase.from('usuarios').update({ rol: 'docente' }).eq('email', u.email); }}>
                                ✓ Aprobar
                              </button>
                              <button className="btn btn-danger" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }} onClick={async () => { await supabase.from('usuarios').delete().eq('email', u.email); }}>
                                <Trash2 size={13} /> Rechazar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={{ marginBottom: "1rem", fontSize: "0.95rem", fontWeight: "700" }}>Personal Activo</h3>
              {usuariosActivos.length === 0 ? (
                <div className="empty-state"><Users size={48} /><h3>Sin usuarios activos</h3></div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {usuariosActivos.map(u => (
                      <tr key={u.email}>
                        <td style={{ fontWeight: "600" }}>{u.nombre || "Sin nombre"}</td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{u.email}</td>
                        <td>
                          <span className={`badge ${u.rol === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                            {u.rol === 'admin' ? 'Admin' : 'Docente'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <button className="btn btn-secondary" style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }} onClick={async () => { await supabase.from('usuarios').update({ rol: u.rol === 'admin' ? 'docente' : 'admin' }).eq('email', u.email); }}>
                              <Edit size={13} /> Rol
                            </button>
                            <button className="btn btn-ghost" style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem", color: "var(--warning)", borderColor: "var(--warning-border)" }} onClick={() => handleResetPassword(u.email)}>
                              <Key size={13} /> Clave
                            </button>
                            {u.rol !== 'admin' && (
                              <button className="btn btn-danger" style={{ padding: "0.35rem 0.5rem" }} onClick={() => handleEliminarDocente(u.email, u.nombre || u.email)}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Alta Rápida */}
              <div id="alta-rapida-form" style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
                <div style={{ marginBottom: "1.25rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <UserPlus size={17} color="var(--primary)" /> Alta Rápida de Docente
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    Crea la cuenta con una clave temporal. El docente deberá cambiarla en su primer ingreso.
                  </p>
                </div>

                {altaRapidaMsg.text && (
                  <div className={`alert ${altaRapidaMsg.ok ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: "1.25rem" }}>
                    {altaRapidaMsg.text}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
                  <div>
                    <label style={labelStyle}>Nombre completo</label>
                    <input type="text" placeholder="Prof. García, Luis" value={altaRapida.nombre} onChange={e => setAltaRapida({ ...altaRapida, nombre: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input type="email" placeholder="garcia@escuela.edu" value={altaRapida.email} onChange={e => setAltaRapida({ ...altaRapida, email: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Clave temporal</label>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <input type="text" value={altaRapida.password} onChange={e => setAltaRapida({ ...altaRapida, password: e.target.value })} style={{ ...inputStyle, flex: 1, fontFamily: "monospace", color: "var(--warning)", borderColor: "var(--warning-border)" }} />
                      <button onClick={generarClave} title="Generar clave" style={{ padding: "0.5rem 0.7rem", borderRadius: "0.5rem", background: "var(--warning-bg)", color: "var(--warning)", border: "1px solid var(--warning-border)", cursor: "pointer", fontSize: "1rem" }}>⟳</button>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={handleAltaRapida} disabled={altaRapidaLoading} style={{ whiteSpace: "nowrap" }}>
                    {altaRapidaLoading ? 'Creando…' : <><UserPlus size={15} /> Crear</>}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
