import { useState, useEffect } from "react";
import { ShieldAlert, Users, Database, ArrowUpFromLine, Laptop, AlertTriangle, UserCog, UserPlus, Trash2, Edit, History } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("alertas");
  const [pedidosPendientes, setPedidosPendientes] = useState<any[]>([]);
  const [historialPedidos, setHistorialPedidos] = useState<any[]>([]);
  const [usuariosDb, setUsuariosDb] = useState<any[]>([]);
  const [equiposDb, setEquiposDb] = useState<any[]>([]);
  
  const [loteCat, setLoteCat] = useState("notebook_docentes");
  const [loteCant, setLoteCant] = useState(1);
  const [excelRows, setExcelRows] = useState([{ id: 1, nombre: "", categoria: "notebook_docentes" }]);
  const [altaMode, setAltaMode] = useState("lote");
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", email: "", rol: "docente" });

  const fetchData = async () => {
    const { data: pData } = await supabase.from('pedidos').select('*').neq('estado', 'Devuelto');
    if (pData) setPedidosPendientes(pData);

    const { data: hData } = await supabase.from('pedidos').select('*').order('createdat', { ascending: false });
    if (hData) setHistorialPedidos(hData);

    const { data: uData } = await supabase.from('usuarios').select('*');
    if (uData) setUsuariosDb(uData);

    const { data: eData } = await supabase.from('equipos').select('*');
    if (eData) setEquiposDb(eData);
  };

  useEffect(() => {
    fetchData();

    // Suscripciones Realtime
    const channel = supabase.channel('admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' }, () => fetchData())
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
      let count = equiposDb.length + 1;
      for (let i = 0; i < loteCant; i++) {
        equipos.push({
          nombre: `${loteCat === 'notebook_docentes' ? 'Notebook Docente' : loteCat === 'notebook_alumnos' ? 'Notebook Alumno' : 'Equipo'} ${count + i}`,
          categoria: loteCat,
          estado: "Operativa"
        });
      }
      
      const { error } = await supabase.from('equipos').insert(equipos);
      if (error) throw error;
      
      alert("Lote generado exitosamente.");
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

  const handleAltaUsuario = async () => {
    if (!nuevoUsuario.email || !nuevoUsuario.nombre) return alert("Complete todos los campos requeridos");
    try {
      // Como el email es Unique o Primary Key en la DB
      const { error } = await supabase.from('usuarios').upsert({
        email: nuevoUsuario.email.toLowerCase(),
        nombre: nuevoUsuario.nombre,
        rol: nuevoUsuario.rol
      });
      if (error) throw error;
      
      alert("Instructor dado de alta o modificado exitosamente.");
      setNuevoUsuario({ nombre: "", email: "", rol: "docente" });
    } catch(e) {
      console.error(e);
      alert("Error guardando cuenta maestra.");
    }
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
            <button className={`btn ${activeTab === 'importar' ? 'btn-primary' : 'btn-secondary'} `} style={{ justifyContent: "flex-start", background: activeTab !== 'importar' ? 'transparent' : undefined }} onClick={() => setActiveTab('importar')}>
              <Database size={20} /> Comparar Maestro
            </button>
          </div>
        </div>

        {/* Contenido Principal */}
        <div>
          
          {activeTab === "alertas" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", color: "var(--danger)" }}>
                <AlertTriangle size={28} /> 
                Reporte de Faltantes - Cierre del Día
              </h2>
              
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", borderRadius: "0.75rem", padding: "1.5rem", marginBottom: "2rem" }}>
                <p style={{ margin: 0, fontSize: "1.1rem" }}>
                  <strong>¡Atención!</strong> Faltan entregar 1 dispositivo(s) que fueron retirados hoy. Verifique con el docente responsable.
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
                  <tr>
                    <td style={{ fontWeight: "bold" }}>Prof. Gómez, Ana</td>
                    <td>Notebook Lenovo 1</td>
                    <td>08:15 AM</td>
                    <td>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          alert("Enviando aviso push a la app de Prof. Gómez, Ana...");
                          window.location.href = "mailto:docente@test.com?subject=Aviso Urgente: Devolución de Dispositivo&body=Estimada Prof. Gómez,%0A%0AEl sistema indica que tiene en su poder el dispositivo Notebook Lenovo 1 y el turno escolar ha cerrado.%0APor favor, devuélvalo a preceptoría inmediatamente.%0A%0AGracias.";
                        }}
                      >
                        Contactar Docente
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
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
                      <input type="text" placeholder="Proyector Epson..." style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Categoría</label>
                      <select value={loteCat} onChange={(e) => setLoteCat(e.target.value)} style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }}>
                        <option value="notebook_docentes">Notebook Docentes</option>
                        <option value="notebook_alumnos">Notebook Alumnos</option>
                        <option value="proyector">Proyector</option>
                        <option value="periferico">Periférico (Audio/Mouse)</option>
                      </select>
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
                      onClick={() => setExcelRows([...excelRows, { id: Date.now(), nombre: "", categoria: "notebook_docentes" }])}
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
                            <select 
                              value={row.categoria}
                              onChange={(e) => setExcelRows(excelRows.map(r => r.id === row.id ? { ...r, categoria: e.target.value } : r))}
                              style={{ width: "100%", padding: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)", borderRadius: "0.25rem", fontFamily: "inherit" }}>
                              <option value="notebook_docentes">Notebook Docente</option>
                              <option value="notebook_alumnos">Notebook Alumnos</option>
                              <option value="proyector">Proyector</option>
                              <option value="periferico">Periférico</option>
                            </select>
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
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID / Nº Referencia</th>
                    <th>Dispositivo</th>
                    <th>Estado de Máquina</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {equiposDb.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)" }}>No hay equipos registrados</td></tr>
                  ) : equiposDb.map((eq) => (
                    <tr key={eq.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{eq.id.slice(-8).toUpperCase()}</td>
                      <td style={{ fontWeight: "600" }}>{eq.nombre}</td>
                      <td>
                        <span className={`badge ${eq.estado === 'Operativa' ? 'badge-success' : 'badge-danger'}`}>
                          {eq.estado}
                        </span>
                      </td>
                      <td>
                        <button className="btn" style={{ padding: "0.4rem", background: "transparent", color: "text-muted", border: "none" }}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                          {p.estado !== "Entregado" && (
                            <button 
                              className="btn btn-primary" 
                              onClick={() => marcarEntregado(p.id)}
                              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "var(--success)", border: "none" }}>
                              Marcar Entregado
                            </button>
                          )}
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

          {activeTab === "importar" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <Database size={24} color="var(--primary)" /> 
                Auditoría contra Lista Maestra
              </h2>
              <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Suba un archivo (.csv o .xlsx) exportado desde su sistema de patrimonio genérico para que nuestra plataforma contraste los equipos reales del Kiosco contra esa lista teórica y detecte discrepancias (faltantes, equipos de más, etc).</p>
              
              <div style={{ border: "2px dashed var(--primary)", borderRadius: "1rem", padding: "4rem", textAlign: "center", cursor: "pointer", background: "rgba(99, 102, 241, 0.05)" }}>
                <ArrowUpFromLine size={48} color="var(--primary)" style={{ marginBottom: "1rem" }} />
                <h3>Arrastre su archivo Excel/CSV aquí</h3>
                <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Soporta .csv y .xls</p>
              </div>
            </div>
          )}

          {activeTab === "usuarios" && (
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <UserCog size={24} color="var(--primary)" /> 
                  Control de Personal
                </h2>
                <button className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.95rem" }}>
                  <UserPlus size={18} /> Nuevo Usuario
                </button>
              </div>

              <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Da de alta a nuevos docentes, edita sus permisos o dales de baja del plantel escolar.</p>

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
                  {usuariosDb.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)" }}>No hay usuarios (entra con una cuenta para registrarte)</td></tr>
                  ) : usuariosDb.map((u) => (
                    <tr key={u.email}>
                      <td style={{ fontWeight: "600" }}>{u.nombre || "Sin Nombre"}</td>
                      <td style={{ color: "var(--text-muted)" }}>{u.email}</td>
                      <td>
                        <span className={`badge ${u.rol === 'admin' ? 'badge-warning' : 'badge-success'}`} style={u.rol === 'admin' ? { color: "var(--warning)", border: "1px solid var(--warning)" } : {}}>
                          {u.rol === 'admin' ? 'Administrador' : 'Docente'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* MOCK Formulario Agregar Personal rápio */}
              <div style={{ marginTop: "3rem", padding: "1.5rem", borderTop: "1px solid var(--border)" }}>
                <h3 style={{ marginBottom: "1rem" }}>Alta Rápida de Docente</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
                  <div>
                     <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Nombre</label>
                     <input type="text" value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} placeholder="Ej. Prof. Pérez" style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }} />
                  </div>
                  <div>
                     <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Correo Escolar</label>
                     <input type="email" value={nuevoUsuario.email} onChange={(e) => setNuevoUsuario({...nuevoUsuario, email: e.target.value})} placeholder="perez@escuela.com" style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }} />
                  </div>
                  <div>
                     <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Rol Inicial</label>
                     <select value={nuevoUsuario.rol} onChange={(e) => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})} style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }}>
                       <option value="docente">Docente</option>
                       <option value="admin">Administrador</option>
                     </select>
                  </div>
                  <button className="btn btn-primary" onClick={handleAltaUsuario} style={{ padding: "0.75rem 1.5rem" }}>Guardar</button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
