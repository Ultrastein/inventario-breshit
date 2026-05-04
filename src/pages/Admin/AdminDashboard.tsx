import { useState, useEffect } from "react";
import { ShieldAlert, Users, Laptop, AlertTriangle, UserCog, UserPlus, Trash2, Edit, History, ShoppingCart, Key } from "lucide-react";
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
  const [adminRole, setAdminRole] = useState<boolean>(false);
  const [altaRapida, setAltaRapida] = useState({ nombre: '', email: '', password: 'Escuela2025!' });
  const [altaRapidaMsg, setAltaRapidaMsg] = useState({ text: '', ok: false });
  const [altaRapidaLoading, setAltaRapidaLoading] = useState(false);

  const generarClave = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const pass = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setAltaRapida(prev => ({ ...prev, password: pass }));
  };

  const handleAltaRapida = async () => {
    setAltaRapidaMsg({ text: '', ok: false });
    const emailNormalizado = altaRapida.email.trim().toLowerCase();
    const nombreNormalizado = altaRapida.nombre.trim();
    
    if (!nombreNormalizado || !emailNormalizado || !altaRapida.password)
      return setAltaRapidaMsg({ text: 'Completa todos los campos.', ok: false });
      
    // Generar nombre de usuario sugerido (parte antes del @)
    const usernameSugerido = emailNormalizado.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');

    setAltaRapidaLoading(true);
    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();

      // 1. Crear en Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: emailNormalizado,
        password: altaRapida.password,
      });

      // Manejo de errores de Auth más específico
      const yaExiste = signUpError?.message?.toLowerCase().includes('already registered') || 
                      signUpError?.message?.toLowerCase().includes('already in use') ||
                      signUpError?.message?.toLowerCase().includes('email');
      
      const esRateLimit = signUpError?.message?.toLowerCase().includes('rate limit');

      if (signUpError && !yaExiste && !esRateLimit) throw signUpError;

      // 2. Restaurar sesión admin (siempre necesario tras signUp)
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });
      }

      // 3. Crear en la tabla pública usando el ID de Auth (si existe)
      const userId = signUpData?.user?.id;
      const { error: dbError } = await supabase.from('usuarios').upsert({
        id: userId, // VINCULO REAL POR ID
        email: emailNormalizado,
        nombre: nombreNormalizado,
        nombre_usuario: usernameSugerido,
        rol: 'docente',
        primer_login: true,
      }, { onConflict: 'email' });

      if (dbError) throw dbError;

      let aviso = `✅ Docente creado. Usuario rápido: "${usernameSugerido}". Clave temporal: ${altaRapida.password}`;
      
      if (yaExiste) {
        aviso = `⚠️ El correo ya estaba registrado. Se actualizó su perfil, pero si no conoce su clave deberá usar "Resetear Clave".`;
      } else if (esRateLimit) {
        aviso = `✅ Docente registrado en base de datos. (Nota: Hubo un límite de correos, verifique en Supabase).`;
      }

      setAltaRapidaMsg({ text: aviso, ok: !yaExiste });
      if (!yaExiste) setAltaRapida({ nombre: '', email: '', password: 'Escuela2025!' });
      fetchData(); // Recargar tabla
    } catch (e: any) {
      setAltaRapidaMsg({ text: e.message || 'Error al crear el docente.', ok: false });
    } finally {
      setAltaRapidaLoading(false);
    }
  };

  const handleEliminarDocente = async (email: string, nombre: string) => {
    const confirmar = window.confirm(
      `⚠️ ¿Eliminar a "${nombre}" (${email})?

Esto borrará su perfil y permisos del sistema. 
IMPORTANTE: El acceso (login) de Supabase no se puede borrar desde aquí. El usuario seguirá existiendo en el sistema de autenticación pero no tendrá acceso a las funciones de la escuela.
Esta acción NO se puede deshacer.`
    );
    if (!confirmar) return;
    try {
      const { error } = await supabase.from('usuarios').delete().eq('email', email);
      if (error) throw error;
      // Refrescar lista
      const { data: uData } = await supabase.from('usuarios').select('*');
      if (uData) setUsuariosDb(uData);
    } catch (e: any) {
      alert('Error al eliminar: ' + (e.message || e));
    }
  };


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        window.location.hash = '#/login';
        return;
      }
      supabase.from('usuarios').select('rol').eq('email', session.user.email).single().then(({ data }) => {
        if (data?.rol === 'admin') setAdminRole(true);
        else window.location.hash = '#/docente';
      });
    });
  }, []);

  const fetchData = async () => {
    const { data: pData } = await supabase.from('pedidos').select('*').neq('estado', 'Devuelto');
    if (pData) setPedidosPendientes(pData);

    const { data: hData } = await supabase.from('pedidos').select('*').order('createdat', { ascending: false });
    if (hData) setHistorialPedidos(hData);

    const { data: uData } = await supabase.from('usuarios').select('*');
    if (uData) setUsuariosDb(uData);

    const { data: eData } = await supabase.from('equipos').select('*');
    if (eData) setEquiposDb(eData);

    const { data: cData } = await supabase.from('compras').select('*').order('created_at', { ascending: false });
    if (cData) setComprasDb(cData);
  };

  useEffect(() => {
    fetchData();

    // Suscripciones Realtime
    const channel = supabase.channel('admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compras' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const marcarEntregado = async (id: string) => {
    try {
      await supabase.from('pedidos').update({ estado: "Entregado" }).eq('id', id);
    } catch(e) {
      console.error(e);
      alert("Error al marcar como entregado");
    }
  };

  const handleGuardarLote = async () => {
    try {
      if (loteCant < 1) return;
      const equipos = [];
      const categoriaLabel = loteNombre.trim() || (loteCat === 'docente' ? 'Notebook Docente' : loteCat === 'alumnado' ? 'Notebook Alumno' : 'Equipo Aula');
      const existentesDeCat = equiposDb.filter((e: any) => e.categoria === loteCat).length;
      for (let i = 0; i < loteCant; i++) {
        equipos.push({
          nombre: `${categoriaLabel} ${existentesDeCat + i + 1}`,
          categoria: loteCat,
          estado: "Operativa",
          numero: existentesDeCat + i + 1
        });
      }

      const { error } = await supabase.from('equipos').insert(equipos);
      if (error) throw error;

      alert("Lote generado exitosamente.");
      setLoteNombre("");
    } catch(e) { console.error(e); alert("Error"); }
  };

  const handleGuardarExcel = async () => {
    try {
      const validRows = excelRows.filter(r => r.nombre.trim());
      if (validRows.length === 0) return alert("No hay filas válidas para guardar.");
      
      const equipos = validRows.map(row => ({
        nombre: row.nombre,
        categoria: row.categoria,
        estado: "Operativa"
      }));

      const { error } = await supabase.from('equipos').insert(equipos);
      if (error) throw error;
      
      alert("Equipos registrados exitosamente.");
      setExcelRows([{ id: Date.now(), nombre: "", categoria: "notebook_docentes" }]);
    } catch(e) { console.error(e); alert("Error"); }
  };

  // handleAltaUsuario removed - registration is now self-service via the login screen


  if (!adminRole) return <div className="container" style={{ textAlign: "center", marginTop: "10vh" }}>Verificando permisos de Administrador...</div>;

  const usuariosPendientes = usuariosDb.filter(u => u.rol === 'pendiente');
  const usuariosActivos = usuariosDb.filter(u => u.rol !== 'pendiente');

  const comprasVisibles = comprasDb.filter(c => {
    if (filtroCompras !== "Todos" && c.estado !== filtroCompras) return false;
    if (c.estado === 'Recibido' && c.fecha_recibido) {
      const fechaRec = new Date(c.fecha_recibido).getTime();
      if (Date.now() - fechaRec > 7 * 24 * 60 * 60 * 1000) return false;
    }
    return true;
  });

  const handleAgregarCompra = async () => {
    if (!nuevoArticulo.trim()) return;
    try {
      await supabase.from('compras').insert({ articulo: nuevoArticulo, estado: 'Falta Pedir' });
      setNuevoArticulo("");
    } catch(e) { console.error(e); alert("Error al agregar compra"); }
  };

  const handleEstadoCompra = async (id: string, nuevoEstado: string) => {
    try {
      const updateData: any = { estado: nuevoEstado };
      if (nuevoEstado === 'Recibido') updateData.fecha_recibido = new Date().toISOString();
      await supabase.from('compras').update(updateData).eq('id', id);
    } catch(e) { console.error(e); }
  };

  const handleResetPassword = async (email: string) => {
    if(!confirm(`¿Enviar un correo a ${email} con un enlace para cambiar su contraseña?`)) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      alert(`Correo oficial de recuperación enviado exitosamente a ${email}.`);
    } catch(e: any) {
      console.error(e);
      alert(`Hubo un error al enviar el correo: ${e.message}`);
    }
  };

  const handleEliminarPedido = async (id: string, docente: string) => {
    if (!confirm(`¿Eliminar permanentemente el pedido de "${docente}"? Esta acción no se puede deshacer.`)) return;
    try {
      await supabase.from('pedidos').delete().eq('id', id);
    } catch(e) { console.error(e); alert('Error al eliminar el pedido'); }
  };

  return (
    <div className="container" style={{ maxWidth: "1400px" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ marginBottom: "0.5rem" }}>Panel del Administrador</h1>
          <p style={{ color: "var(--danger)", fontSize: "1.2rem", fontWeight: "600" }}>Modo Gestión Activo</p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "2rem" }}>
        
        {/* Sidebar */}
        <div className="glass-panel" style={{ padding: "1.5rem", alignSelf: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button className={`btn ${activeTab === 'alertas' ? 'btn-danger' : 'btn-secondary'} `} style={{ justifyContent: "flex-start", background: activeTab !== 'alertas' ? 'transparent' : undefined }} onClick={() => setActiveTab('alertas')}>
              <ShieldAlert size={20} /> Alertas de Cierre
            </button>
            <button className={`btn ${activeTab === 'inventario' ? 'btn-primary' : 'btn-secondary'} `} style={{ justifyContent: "flex-start", background: activeTab !== 'inventario' ? 'transparent' : undefined }} onClick={() => setActiveTab('inventario')}>
              <Laptop size={20} /> Inventario CRUD
            </button>
            <button className={`btn ${activeTab === 'pedidos' ? 'btn-primary' : 'btn-secondary'} `} style={{ justifyContent: "flex-start", background: activeTab !== 'pedidos' ? 'transparent' : undefined }} onClick={() => setActiveTab('pedidos')}>
              <Users size={20} /> Pedidos Activos
            </button>
            <button className={`btn ${activeTab === 'historial' ? 'btn-primary' : 'btn-secondary'} `} style={{ justifyContent: "flex-start", background: activeTab !== 'historial' ? 'transparent' : undefined }} onClick={() => setActiveTab('historial')}>
              <History size={20} /> Historial Docentes
            </button>
            <button className={`btn ${activeTab === 'usuarios' ? 'btn-primary' : 'btn-secondary'} `} style={{ justifyContent: "flex-start", background: activeTab !== 'usuarios' ? 'transparent' : undefined }} onClick={() => setActiveTab('usuarios')}>
              <UserCog size={20} /> Personal / Usuarios
            </button>
            <button className={`btn ${activeTab === 'compras' ? 'btn-primary' : 'btn-secondary'} `} style={{ justifyContent: "flex-start", background: activeTab !== 'compras' ? 'transparent' : undefined }} onClick={() => setActiveTab('compras')}>
              <ShoppingCart size={20} /> Lista de Compras
            </button>
          </div>
        </div>

        {/* Contenido Principal */}
        <div>
          
          {activeTab === "alertas" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", color: "var(--danger)" }}>
                <AlertTriangle size={28} /> 
                Reporte de Faltantes — Equipos sin Devolver
              </h2>

              {pedidosPendientes.filter(p => p.estado === 'Entregado').length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  <ShieldAlert size={48} style={{ marginBottom: "1rem", opacity: 0.4 }} />
                  <h3 style={{ marginBottom: "0.5rem" }}>Todo en orden</h3>
                  <p>No hay equipos pendientes de devolución en este momento.</p>
                </div>
              ) : (
                <>
                  <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)", borderRadius: "0.75rem", padding: "1.25rem 1.5rem", marginBottom: "2rem" }}>
                    <p style={{ margin: 0, fontSize: "1rem" }}>
                      <strong>⚠️ Atención:</strong> Hay {pedidosPendientes.filter(p => p.estado === 'Entregado').length} equipo(s) retirados que aún no fueron devueltos.
                    </p>
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Docente Responsable</th>
                        <th>Dispositivo</th>
                        <th>Hora de Retiro</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosPendientes.filter(p => p.estado === 'Entregado').map((p, i) => (
                        <tr key={p.id || i}>
                          <td style={{ fontWeight: "bold" }}>{p.docente}</td>
                          <td>{p.equipo}</td>
                          <td>{p.inicio || '-'}</td>
                          <td>
                            <button
                              className="btn btn-secondary"
                              onClick={() => window.location.href = `mailto:${p.docente}?subject=Aviso: Devolución de Dispositivo&body=Estimado/a docente,%0A%0AEl sistema indica que tiene en su poder el dispositivo "${p.equipo}".%0APor favor, devuélvalo a preceptoría.%0A%0AGracias.`}
                              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
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


          {activeTab === "inventario" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Laptop size={24} color="var(--primary)" /> 
                  Gestión de Inventario (CRUD)
                </h2>
              </div>

              {/* Selector de modo de alta */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <button 
                  className={`btn ${altaMode === "lote" ? "btn-primary" : "btn-secondary"}`} 
                  onClick={() => setAltaMode("lote")}
                  style={{ background: altaMode !== "lote" ? "var(--surface)" : undefined, padding: "0.5rem 1rem", fontSize: "0.9rem" }}>
                  Carga Rápida en Lote
                </button>
                <button 
                  className={`btn ${altaMode === "excel" ? "btn-primary" : "btn-secondary"}`} 
                  onClick={() => setAltaMode("excel")}
                  style={{ background: altaMode !== "excel" ? "var(--surface)" : undefined, padding: "0.5rem 1rem", fontSize: "0.9rem" }}>
                  Modo Grilla (Estilo Excel)
                </button>
              </div>

              {altaMode === "lote" && (
                <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "0.75rem" }}>
                  <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>Carga Rápida en Lote</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Nombre Base (ej. Notebook Lenovo)</label>
                      <input type="text" placeholder="Proyector Epson..." value={loteNombre} onChange={(e) => setLoteNombre(e.target.value)} style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Categoría</label>
                      <input 
                        type="text" 
                        list="categorias-list"
                        value={loteCat} 
                        onChange={(e) => setLoteCat(e.target.value)} 
                        placeholder="Ej. Robótica..."
                        style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }} 
                      />
                       <datalist id="categorias-list">
                         <option value="docente">Material Docente (Notebooks de Profesores)</option>
                         <option value="alumnado">Material Alumnado (Notebooks de Carros)</option>
                         <option value="aula">Material para Aula (Proyectores, Parlantes)</option>
                       </datalist>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Cantidad a registrar</label>
                      <input type="number" value={loteCant} onChange={(e) => setLoteCant(Number(e.target.value))} min="1" max="50" style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }} />
                    </div>
                    <button className="btn btn-primary" onClick={handleGuardarLote} style={{ padding: "0.75rem 1.5rem" }}>Generar Lote</button>
                  </div>
                  <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    * Si agregas más de uno, el sistema auto-generará los IDs alfabéticamente.
                  </p>
                </div>
              )}

              {altaMode === "excel" && (
                <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Carga Detallada (Como Excel)</h3>
                     <button 
                      className="btn btn-secondary" 
                      onClick={() => setExcelRows([...excelRows, { id: Date.now(), nombre: "", categoria: "docente" }])}
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                      + Insertar Fila
                    </button>
                  </div>
                  
                  <table className="data-table" style={{ marginTop: 0 }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Nombre / Etiqueta Exacta</th>
                        <th>Categoría</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelRows.map((row, index) => (
                        <tr key={row.id}>
                          <td style={{ color: "var(--text-muted)" }}>{index + 1}</td>
                          <td>
                            <input 
                              type="text" 
                              placeholder="Ej. NB-Gobierno-2023-A" 
                              value={row.nombre}
                              onChange={(e) => setExcelRows(excelRows.map(r => r.id === row.id ? { ...r, nombre: e.target.value } : r))}
                              style={{ width: "100%", padding: "0.5rem", background: "transparent", color: "white", border: "1px solid var(--border)", borderRadius: "0.25rem", fontFamily: "inherit" }} 
                            />
                          </td>
                          <td>
                            <input 
                              type="text" 
                              list="categorias-list"
                              value={row.categoria}
                              onChange={(e) => setExcelRows(excelRows.map(r => r.id === row.id ? { ...r, categoria: e.target.value } : r))}
                              placeholder="Categoría"
                              style={{ width: "100%", padding: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)", borderRadius: "0.25rem", fontFamily: "inherit" }}
                            />
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button 
                              className="btn" 
                              onClick={() => setExcelRows(excelRows.filter(r => r.id !== row.id))}
                              style={{ padding: "0.4rem 0.6rem", background: "transparent", color: "var(--text-muted)", border: "none" }}
                              onMouseOver={(e) => e.currentTarget.style.color = "var(--danger)"}
                              onMouseOut={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                              title="Eliminar fila">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button className="btn btn-primary" onClick={handleGuardarExcel} style={{ padding: "0.75rem 2rem" }}>
                      Guardar Todas las Filas ({excelRows.length})
                    </button>
                  </div>
                </div>
              )}

              <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>Equipos Registrados</h3>
              
              {equiposDb.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No hay equipos registrados.</div>
              ) : [
                { key: 'docente', label: '👨‍🏫 Material Docente', color: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.4)' },
                { key: 'alumnado', label: '🎒 Material Alumnado', color: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.4)' },
                { key: 'aula', label: '📽️ Material para Aula', color: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' },
              ].map(cat => {
                const equiposDeCat = equiposDb.filter((eq: any) => eq.categoria === cat.key || 
                  (cat.key === 'docente' && (eq.categoria === 'notebook_docentes' || eq.categoria === 'Notebook Docente')) ||
                  (cat.key === 'alumnado' && (eq.categoria === 'notebook_alumnos' || eq.categoria === 'Notebook Alumno'))
                );
                if (equiposDeCat.length === 0) return null;
                return (
                  <div key={cat.key} style={{ marginBottom: "2rem", border: `1px solid ${cat.border}`, borderRadius: "0.75rem", overflow: "hidden" }}>
                    <div style={{ padding: "0.75rem 1.25rem", background: cat.color, fontWeight: "700", fontSize: "1rem" }}>
                      {cat.label} <span style={{ fontWeight: "400", color: "var(--text-muted)", fontSize: "0.85rem" }}>({equiposDeCat.length} equipos)</span>
                    </div>
                    <table className="data-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>ID / Nº Ref.</th>
                          <th>Dispositivo</th>
                          <th>Estado</th>
                          <th>Comentarios</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equiposDeCat.map((eq: any) => (
                          <tr key={eq.id}>
                            <td style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{String(eq.id).slice(-8).toUpperCase()}</td>
                            <td style={{ fontWeight: "600" }}>{eq.nombre}</td>
                            <td>
                              <select 
                                value={eq.estado || 'Operativa'}
                                onChange={async (e) => {
                                  try {
                                    await supabase.from('equipos').update({ estado: e.target.value }).eq('id', eq.id);
                                  } catch(err) { console.error(err); alert("Error al cambiar estado"); }
                                }}
                                style={{ 
                                  padding: "0.4rem", 
                                  background: eq.estado === 'Operativa' ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", 
                                  color: eq.estado === 'Operativa' ? "var(--success)" : "var(--danger)", 
                                  border: `1px solid ${eq.estado === 'Operativa' ? "var(--success)" : "var(--danger)"}`, 
                                  borderRadius: "0.25rem", 
                                  fontWeight: "bold",
                                  fontFamily: "inherit" 
                                }}>
                                <option value="Operativa">Operativa</option>
                                <option value="En Reparación">En Reparación</option>
                                <option value="Rota">Rota / Baja</option>
                              </select>
                            </td>
                            <td>
                              <input 
                                type="text"
                                defaultValue={eq.comentario || ""}
                                placeholder="Ej. Falla el teclado..."
                                onBlur={async (e) => {
                                  try {
                                    await supabase.from('equipos').update({ comentario: e.target.value }).eq('id', eq.id);
                                  } catch(err) { console.error(err); }
                                }}
                                style={{ width: "100%", padding: "0.4rem", background: "transparent", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "0.25rem", fontFamily: "inherit" }}
                              />
                            </td>
                            <td>
                              <button 
                                className="btn" 
                                onClick={async () => {
                                  if(confirm(`¿Eliminar ${eq.nombre}?`)) {
                                    try {
                                      await supabase.from('equipos').delete().eq('id', eq.id);
                                    } catch(e) { console.error(e); }
                                  }
                                }}
                                style={{ padding: "0.4rem", background: "transparent", color: "var(--danger)", border: "none" }}
                                title="Eliminar equipo">
                                <Trash2 size={16} />
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

          {activeTab === "pedidos" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <Users size={24} color="var(--primary)" /> 
                Bandeja de Pedidos "En Vivo"
              </h2>
              <p style={{ color: "var(--text-muted)" }}>Aquí aparecerán (sincronizados con Supabase) los pedidos futuros que hagan los docentes desde su app.</p>
              
              {pedidosPendientes.length === 0 ? (
                <div style={{ padding: "2rem", border: "1px dashed var(--border)", borderRadius: "0.75rem", marginTop: "1rem", textAlign: "center" }}>
                  No hay pedidos nuevos por el momento.
                </div>
              ) : (
                <table className="data-table" style={{ marginTop: "1.5rem" }}>
                  <thead>
                    <tr>
                      <th>Docente</th>
                      <th>Fecha</th>
                      <th>Horario</th>
                      <th>Equipo Solicitado</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosPendientes.map((p: any, i: number) => (
                      <tr key={p.id || i}>
                        <td style={{ fontWeight: "600" }}>{p.docente}</td>
                        <td>{p.fecha}</td>
                        <td>{p.inicio} - {p.fin}</td>
                        <td>{p.equipo}</td>
                        <td>
                          <span className={`badge ${p.estado === 'Entregado' ? 'badge-success' : 'badge-warning'}`}>
                            {p.estado}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {p.estado !== "Entregado" && (
                              <button 
                                className="btn btn-primary" 
                                onClick={() => marcarEntregado(p.id)}
                                style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "var(--success)", border: "none" }}>
                                ✓ Marcar Entregado
                              </button>
                            )}
                            {p.estado !== "Devuelto" && (
                              <button
                                className="btn"
                                onClick={async () => {
                                  try {
                                    await supabase.from('pedidos').update({ estado: 'Devuelto' }).eq('id', p.id);
                                  } catch(e) { console.error(e); }
                                }}
                                style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "var(--secondary)", color: "white", border: "none", borderRadius: "0.25rem" }}>
                                ↩ Marcar Devuelto
                              </button>
                            )}
                            <button 
                              className="btn" 
                              onClick={() => handleEliminarPedido(p.id, p.docente || 'desconocido')}
                              style={{ padding: "0.4rem 0.6rem", background: "transparent", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "0.25rem" }}
                              title="Forzar eliminación del pedido">
                              <Trash2 size={14} />
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

          {activeTab === "historial" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <History size={24} color="var(--primary)" /> 
                Historial de Pedidos por Docente
              </h2>
              <p style={{ color: "var(--text-muted)" }}>Aquí se muestra el historial completo de todos los pedidos realizados, incluyendo los ya devueltos.</p>
              
              {historialPedidos.length === 0 ? (
                <div style={{ padding: "2rem", border: "1px dashed var(--border)", borderRadius: "0.75rem", marginTop: "1rem", textAlign: "center" }}>
                  No hay historial de pedidos.
                </div>
              ) : (
                <table className="data-table" style={{ marginTop: "1.5rem" }}>
                  <thead>
                    <tr>
                      <th>Docente</th>
                      <th>Fecha de Uso</th>
                      <th>Horario</th>
                      <th>Equipo Solicitado</th>
                      <th>Estado Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialPedidos.map((p: any, i: number) => (
                      <tr key={p.id || i}>
                        <td style={{ fontWeight: "600" }}>{p.docente}</td>
                        <td>{p.fecha}</td>
                        <td>{p.inicio} - {p.fin}</td>
                        <td>{p.equipo}</td>
                        <td>
                          <span className={`badge ${p.estado === 'Devuelto' ? 'badge-success' : p.estado === 'Entregado' ? 'badge-primary' : 'badge-warning'}`}>
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

          {activeTab === "compras" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <ShoppingCart size={24} color="var(--primary)" /> 
                Gestión de Compras
              </h2>
              
              <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
                <input 
                  type="text" 
                  value={nuevoArticulo}
                  onChange={e => setNuevoArticulo(e.target.value)}
                  placeholder="Ej. 10x Cables HDMI, Pantalla táctil..."
                  style={{ flex: 1, padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }} 
                />
                <button onClick={handleAgregarCompra} className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }}>Agregar a la Lista</button>
              </div>

              <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {['Todos', 'Falta Pedir', 'Pedido', 'Comprado', 'Recibido'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFiltroCompras(f)}
                    className={`btn ${filtroCompras === f ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: filtroCompras !== f ? "var(--surface)" : undefined }}>
                    {f}
                  </button>
                ))}
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Artículo / Herramienta</th>
                    <th>Estado de Compra</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {comprasVisibles.length === 0 ? (
                     <tr><td colSpan={3} style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)" }}>No hay compras que mostrar para este filtro.</td></tr>
                  ) : comprasVisibles.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: "bold" }}>{c.articulo}</td>
                      <td>
                        <select 
                          value={c.estado} 
                          onChange={(e) => handleEstadoCompra(c.id, e.target.value)}
                          style={{ width: "100%", padding: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)", borderRadius: "0.25rem", fontFamily: "inherit" }}>
                          <option value="Falta Pedir">Falta Pedir</option>
                          <option value="Pedido">Pedido</option>
                          <option value="Comprado">Comprado</option>
                          <option value="Recibido">Recibido</option>
                        </select>
                      </td>
                      <td>
                        <button 
                          className="btn" 
                          onClick={async () => {
                            if(confirm(`¿Eliminar ${c.articulo}?`)) {
                              await supabase.from('compras').delete().eq('id', c.id);
                            }
                          }}
                          style={{ padding: "0.4rem", background: "transparent", color: "var(--danger)", border: "none" }}
                          title="Eliminar registro">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                * Los artículos marcados como "Recibido" desaparecerán automáticamente después de 1 semana.
              </p>
            </div>
          )}

          {activeTab === "usuarios" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <UserCog size={24} color="var(--primary)" /> 
                  Control de Personal
                </h2>
                <button className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.95rem" }} onClick={() => document.getElementById('alta-rapida-form')?.scrollIntoView({ behavior: 'smooth' })}>
                  <UserPlus size={18} /> Nuevo Usuario
                </button>
              </div>

              <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Da de alta a nuevos docentes, edita sus permisos o dales de baja del plantel escolar.</p>

              {usuariosPendientes.length > 0 && (
                <div style={{ marginBottom: "3rem" }}>
                  <h3 style={{ color: "var(--warning)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <AlertTriangle size={20} /> Usuarios Pendientes de Aprobación
                  </h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nombre y Apellido</th>
                        <th>Correo Electrónico</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosPendientes.map((u) => (
                        <tr key={u.email} style={{ background: "rgba(245, 158, 11, 0.05)" }}>
                          <td style={{ fontWeight: "600" }}>{u.nombre || "Sin Nombre"}</td>
                          <td style={{ color: "var(--text-muted)" }}>{u.email}</td>
                          <td>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button 
                                className="btn btn-primary" 
                                onClick={async () => {
                                  try {
                                    await supabase.from('usuarios').update({ rol: 'docente' }).eq('email', u.email);
                                  } catch(e) { console.error(e); }
                                }}
                                style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "var(--success)" }}>
                                Aprobar como Docente
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                onClick={async () => {
                                  try {
                                    await supabase.from('usuarios').delete().eq('email', u.email);
                                  } catch(e) { console.error(e); }
                                }}
                                style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", color: "var(--danger)" }}>
                                <Trash2 size={16} /> Rechazar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={{ marginBottom: "1rem" }}>Personal Activo</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre y Apellido</th>
                    <th>Correo Electrónico</th>
                    <th>Tipo de Cuenta</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosActivos.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)" }}>No hay usuarios (entra con una cuenta para registrarte)</td></tr>
                  ) : usuariosActivos.map((u) => (
                    <tr key={u.email}>
                      <td style={{ fontWeight: "600" }}>{u.nombre || "Sin Nombre"}</td>
                      <td style={{ color: "var(--text-muted)" }}>{u.email}</td>
                      <td>
                        <span className={`badge ${u.rol === 'admin' ? 'badge-warning' : 'badge-success'}`} style={u.rol === 'admin' ? { color: "var(--warning)", border: "1px solid var(--warning)" } : {}}>
                          {u.rol === 'admin' ? 'Administrador' : 'Docente'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button 
                            className="btn btn-secondary" 
                            onClick={async () => {
                              try {
                                await supabase.from('usuarios').update({ rol: u.rol === 'admin' ? 'docente' : 'admin' }).eq('email', u.email);
                              } catch(e) { console.error(e); }
                            }}
                            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "rgba(255,255,255,0.1)" }}>
                            <Edit size={16} /> Cambiar Rol
                          </button>
                          <button 
                            className="btn" 
                            onClick={() => handleResetPassword(u.email)}
                            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "transparent", color: "var(--warning)", border: "1px solid var(--warning)", borderRadius: "0.25rem" }}
                            title="Enviar correo para cambiar contraseña">
                            <Key size={16} /> Resetear Clave
                          </button>
                          {u.rol !== 'admin' && (
                            <button 
                              onClick={() => handleEliminarDocente(u.email, u.nombre || u.email)}
                              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "0.25rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}
                              title="Eliminar docente del sistema">
                              <Trash2 size={14} /> Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div id="alta-rapida-form" style={{ marginTop: "2rem", padding: "1.5rem", borderTop: "1px solid var(--border)" }}>
                <h3 style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <UserPlus size={20} color="var(--primary)" /> Alta Rápida de Docente
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                  Crea la cuenta con una clave temporal. El docente deberá cambiarla en su primer ingreso.
                </p>

                {altaRapidaMsg.text && (
                  <div style={{ padding: "0.75rem 1rem", borderRadius: "0.5rem", border: `1px solid ${altaRapidaMsg.ok ? 'var(--success)' : 'var(--danger)'}`, background: altaRapidaMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: altaRapidaMsg.ok ? 'var(--success)' : 'var(--danger)', marginBottom: "1rem", fontSize: "0.9rem", fontWeight: altaRapidaMsg.ok ? "600" : "400" }}>
                    {altaRapidaMsg.text}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Nombre Completo</label>
                    <input
                      type="text"
                      placeholder="Prof. García, Luis"
                      value={altaRapida.nombre}
                      onChange={(e) => setAltaRapida({ ...altaRapida, nombre: e.target.value })}
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)", fontFamily: "inherit" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Email</label>
                    <input
                      type="email"
                      placeholder="garcia@escuela.edu"
                      value={altaRapida.email}
                      onChange={(e) => setAltaRapida({ ...altaRapida, email: e.target.value })}
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)", fontFamily: "inherit" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Clave Temporal</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        value={altaRapida.password}
                        onChange={(e) => setAltaRapida({ ...altaRapida, password: e.target.value })}
                        style={{ flex: 1, padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "var(--warning)", border: "1px solid var(--warning)", fontFamily: "monospace", fontWeight: "bold" }}
                      />
                      <button onClick={generarClave} title="Generar clave aleatoria" style={{ padding: "0.5rem 0.75rem", borderRadius: "0.5rem", background: "rgba(245,158,11,0.15)", color: "var(--warning)", border: "1px solid var(--warning)", cursor: "pointer", fontSize: "1.1rem" }}>&#8635;</button>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleAltaRapida}
                    disabled={altaRapidaLoading}
                    style={{ padding: "0.75rem 1.5rem", whiteSpace: "nowrap" }}>
                    {altaRapidaLoading ? 'Creando...' : <><UserPlus size={16} /> Crear Docente</>}
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
