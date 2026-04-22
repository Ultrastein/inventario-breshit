import { useState, useEffect } from "react";
import { Package, Send, List, CheckCircle, PackageSearch, PlusCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function DocenteDashboard() {
  const [activeTab, setActiveTab] = useState("mis_prestamos");
  const [fechaSolicitud, setFechaSolicitud] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [horaSolicitud, setHoraSolicitud] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [equipoSolicitado, setEquipoSolicitado] = useState("");
  const [pedidosPendientes, setPedidosPendientes] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Verificar sesión actual inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch inicial
    const fetchPedidos = async () => {
      const { data } = await supabase.from('pedidos').select('*').eq('docenteid', user.id);
      if (data) setPedidosPendientes(data);
    };

    fetchPedidos();

    // Supabase Realtime subscription
    const channel = supabase.channel('pedidos-docente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `docenteid=eq.${user.id}` }, _payload => {
        fetchPedidos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const marcarDevuelto = async (id: string) => {
    try {
      await supabase.from('pedidos').update({ estado: "Devuelto" }).eq('id', id);
    } catch (e) {
      console.error("Error devuelto: ", e);
    }
  };

  const handleSolicitar = async () => {
    if (!fechaSolicitud || !fechaFin || !horaSolicitud || !horaFin || !equipoSolicitado) {
      alert("Por favor, complete todos los campos (fechas, horas) y seleccione un equipo.");
      return;
    }
    if (!user) {
      alert("No estás autenticado correctamente.");
      return;
    }

    try {
      const newPedido = {
        docenteid: user.id,
        docente: user.email, // Podríamos traer el nombre desde la tabla usuarios si queremos
        fecha: fechaSolicitud === fechaFin ? fechaSolicitud : `${fechaSolicitud} al ${fechaFin}`,
        inicio: horaSolicitud,
        fin: horaFin,
        equipo: equipoSolicitado,
        estado: "Pendiente",
        createdat: new Date().getTime()
      };

      const { error } = await supabase.from('pedidos').insert(newPedido);
      if (error) throw error;
      
      alert("Tu pedido ha sido enviado con éxito a la bandeja del Administrador.");
      
      setFechaSolicitud("");
      setFechaFin("");
      setHoraSolicitud("");
      setHoraFin("");
      setEquipoSolicitado("");
    } catch(e) {
      console.error("Error solic: ", e);
      alert("Ocurrió un error al cargar la solicitud.");
    }
  };

  return (
    <div className="container" style={{ maxWidth: "1200px" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ marginBottom: "0.5rem" }}>Panel del Docente</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>{user?.email || "Docente"}</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button 
            className={`btn ${activeTab === 'retirar' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ background: activeTab !== 'retirar' ? 'var(--surface)' : undefined }}
            onClick={() => setActiveTab('retirar')}
          >
            <PlusCircle size={20} /> Retirar Hoy
          </button>
          <button 
            className={`btn ${activeTab === 'mis_prestamos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ background: activeTab !== 'mis_prestamos' ? 'var(--surface)' : undefined }}
            onClick={() => setActiveTab('mis_prestamos')}
          >
            <List size={20} /> Mis Retiros
          </button>
          <button 
            className={`btn ${activeTab === 'solicitar' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ background: activeTab !== 'solicitar' ? 'var(--surface)' : undefined }}
            onClick={() => setActiveTab('solicitar')}
          >
            <Send size={20} /> Solicitar Material
          </button>
        </div>
      </header>

      {activeTab === "mis_prestamos" && (
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <Package size={24} color="var(--primary)" /> 
            Mis Equipos Asignados Hoy
          </h2>

          <table className="data-table">
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th>Hora Retiro</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {pedidosPendientes.filter(p => p.estado !== "Pendiente").length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    No tienes equipos asignados o en tu poder actualmente. ¡Haz una solicitud!
                  </td>
                </tr>
              ) : (
                pedidosPendientes.filter(p => p.estado !== "Pendiente").map((p, i) => (
                  <tr key={p.id || i}>
                    <td><strong>{p.equipo}</strong></td>
                    <td>{p.inicio}</td>
                    <td>
                      <span className={`badge ${p.estado === 'Devuelto' ? 'badge-success' : 'badge-warning'}`}>
                        {p.estado === 'Entregado' ? 'En mi poder' : p.estado}
                      </span>
                    </td>
                    <td>
                      {p.estado === 'Entregado' ? (
                        <button className="btn btn-secondary" onClick={() => marcarDevuelto(p.id)}>
                          <CheckCircle size={18} /> Marcar Devuelto
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "solicitar" && (
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <PackageSearch size={24} color="var(--secondary)" /> 
            Nueva Solicitud para Próximas Clases
          </h2>

          <form style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "600px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontWeight: "600" }}>Fecha de Retiro</label>
                <input 
                  type="date"
                  value={fechaSolicitud}
                  onChange={(e) => setFechaSolicitud(e.target.value)}
                  style={{ width: "100%", padding: "1rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontWeight: "600" }}>Fecha a Devolver</label>
                <input 
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  style={{ width: "100%", padding: "1rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }}
                />
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontWeight: "600" }}>Hora de Inicio</label>
                <input 
                  type="time"
                  value={horaSolicitud}
                  onChange={(e) => setHoraSolicitud(e.target.value)}
                  style={{ width: "100%", padding: "1rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontWeight: "600" }}>Hora de Fin estimada</label>
                <input 
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  style={{ width: "100%", padding: "1rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)" }}
                />
              </div>
            </div>

            <div style={{ padding: "1.5rem", background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)", borderRadius: "0.5rem", opacity: fechaSolicitud ? 1 : 0.5, transition: "opacity 0.3s" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontWeight: "600" }}>Material Available para esta fecha</label>
              
              {!fechaSolicitud ? (
                <p style={{ color: "var(--warning)", fontStyle: "italic", margin: 0 }}>Por favor, seleccione una fecha arriba para verificar el stock del colegio.</p>
              ) : (
                <select 
                  value={equipoSolicitado}
                  onChange={(e) => setEquipoSolicitado(e.target.value)}
                  style={{ width: "100%", padding: "1rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)", fontFamily: "inherit", fontSize: "1rem" }}>
                  <option value="">Seleccione el equipo disponible...</option>
                  <option value="Notebook Lenovo 1">Notebook Lenovo 1 (Disponible)</option>
                  <option value="Notebook Lenovo 2">Notebook Lenovo 2 (Disponible)</option>
                  <option value="Proyector Aula Sur">Proyector Aula Sur (Disponible)</option>
                  <option disabled value="nb-broken" style={{ color: "var(--danger)" }}>Notebook HP 4 (En reparación 🛠️)</option>
                </select>
              )}
            </div>

            <button type="button" onClick={handleSolicitar} className="btn btn-primary" style={{ width: "100%", padding: "1rem" }}>
              <Send size={18} /> Enviar Pedido a Preceptoría
            </button>
          </form>
        </div>
      )}

      {activeTab === "retirar" && (
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <PlusCircle size={24} color="var(--primary)" /> 
            Registrar Retiro Manual
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
            Cargue aquí de forma rápida un equipo si no pudo asentar su retiro físicamente en el kiosco.
          </p>

          <form style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "450px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontWeight: "600" }}>
                Nº de Dispositivo / Nombre
              </label>
              <select style={{ width: "100%", padding: "1.25rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)", fontSize: "1.1rem" }}>
                <option value="">Seleccionar Equipo Disponible...</option>
                <option value="1">Notebook Lenovo 1</option>
                <option value="2">Proyector Aula Sur</option>
              </select>
            </div>
            <button type="button" className="btn btn-primary btn-large" style={{ width: "100%" }}>
              Asentar Retiro de Inmediato
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
