import { useState, useEffect } from "react";
import { PlusCircle, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function Kiosco() {
  const [retiros, setRetiros] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [dispositivos, setDispositivos] = useState<any[]>([]);

  const [nuevoRetiro, setNuevoRetiro] = useState({
    dispositivoId: "",
    docente: ""
  });

  const [horaActual, setHoraActual] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    
    // Fetch inicial
    const fetchData = async () => {
      const { data: pData } = await supabase.from("prestamos").select("*");
      if (pData) setRetiros(pData);
      
      const { data: uData } = await supabase.from("usuarios").select("*").eq('rol', 'docente');
      if (uData) setDocentes(uData);

      const { data: eData } = await supabase.from("equipos").select("*").eq('estado', 'Operativa');
      if (eData) setDispositivos(eData);
    };

    fetchData();

    // Supabase Realtime subscriptions
    const channel = supabase.channel('kiosco-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prestamos' }, _payload => {
        // Simple refetch for brevity, or we could update local state based on payload
        supabase.from("prestamos").select("*").then(({ data }) => data && setRetiros(data));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, _payload => {
        supabase.from("usuarios").select("*").eq('rol', 'docente').then(({ data }) => data && setDocentes(data));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' }, _payload => {
        supabase.from("equipos").select("*").eq('estado', 'Operativa').then(({ data }) => data && setDispositivos(data));
      })
      .subscribe();

    return () => { 
      clearInterval(timer); 
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRetirar = async () => {
    if (!nuevoRetiro.dispositivoId || !nuevoRetiro.docente) {
      alert("Seleccione dispositivo y docente");
      return;
    }
    
    try {
      const { error } = await supabase.from("prestamos").insert({
        dispositivoid: nuevoRetiro.dispositivoId, // PostgreSQL suele pasar a lowercase
        docente: nuevoRetiro.docente,
        horainicio: new Date().getTime(),
        estado: "Faltante de entrega",
      });
      if (error) throw error;
      setNuevoRetiro({ dispositivoId: "", docente: "" });
    } catch(e) {
      console.error(e);
      alert("Error al registrar");
    }
  };

  const handleDevolver = async (id: string) => {
    try {
      await supabase.from("prestamos").update({ estado: "Devuelto" }).eq('id', id);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="container" style={{ maxWidth: "1400px" }}>
      <div className="kiosco-header">
        <h1 style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>Kiosco de Equipos</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.5rem" }}>
          <Clock size={28} style={{ verticalAlign: "middle", marginRight: "0.5rem" }}/> 
          {horaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>

      {/* Formulario de Retiro Rápido */}
      <div className="glass-panel" style={{ padding: "2rem", marginBottom: "3rem" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <PlusCircle color="var(--primary)" /> 
          Registrar Retiro
        </h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem", alignItems: "end" }}>
          
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontWeight: "600" }}>
              1. Dispositivo
            </label>
            <select 
              value={nuevoRetiro.dispositivoId}
              onChange={(e) => setNuevoRetiro({...nuevoRetiro, dispositivoId: e.target.value})}
              style={{ width: "100%", padding: "1.25rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)", fontSize: "1.1rem" }}
            >
              <option value="">Seleccionar Equipo...</option>
              {dispositivos.map(d => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontWeight: "600" }}>
              2. Fecha y Hora de Inicio
            </label>
            <div style={{ width: "100%", padding: "1.25rem", borderRadius: "0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "1.1rem" }}>
              {horaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Automático)
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontWeight: "600" }}>
              3. Docente Responsable
            </label>
            <select 
              value={nuevoRetiro.docente}
              onChange={(e) => setNuevoRetiro({...nuevoRetiro, docente: e.target.value})}
              style={{ width: "100%", padding: "1.25rem", borderRadius: "0.5rem", background: "var(--bg-dark)", color: "white", border: "1px solid var(--border)", fontSize: "1.1rem" }}
            >
              <option value="">Seleccionar Docente...</option>
              {docentes.map(doc => (
                <option key={doc.id} value={doc.nombre || doc.email}>{doc.nombre || doc.email}</option>
              ))}
            </select>
          </div>

          <div>
             <button className="btn btn-primary btn-large" style={{ width: "100%" }} onClick={handleRetirar}>
               Registrar Retiro
             </button>
          </div>

        </div>
      </div>

      {/* Tabla de Devolución Rápida */}
      <div>
        <h2 style={{ marginBottom: "1.5rem" }}>Equipos en Tránsito</h2>
        
        {retiros.filter(r => r.estado !== "Devuelto").length === 0 ? (
          <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
            <CheckCircle2 size={64} style={{ marginBottom: "1rem", opacity: 0.5 }} />
            <h3>No hay equipos pendientes de devolución</h3>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th>Docente</th>
                <th>Hora de Retiro</th>
                <th>Estado y Acción</th>
              </tr>
            </thead>
            <tbody>
              {retiros.filter(r => r.estado !== "Devuelto").map(retiro => {
                const dispositivo = dispositivos.find(d => d.id === retiro.dispositivoid)?.nombre || "Equipo Desconocido";
                const dateObj = new Date(Number(retiro.horainicio));
                
                return (
                  <tr key={retiro.id}>
                    <td style={{ fontSize: "1.2rem", fontWeight: "600" }}>{dispositivo}</td>
                    <td style={{ fontSize: "1.1rem" }}>{retiro.docente}</td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <span className="badge badge-warning" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem" }}>
                          <AlertCircle size={16} /> Faltante de entrega
                        </span>
                        <button className="btn btn-secondary" style={{ padding: "0.75rem 2rem", fontSize: "1.1rem" }} onClick={() => handleDevolver(retiro.id)}>
                          Devolver Ahora
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
