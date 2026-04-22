import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Kiosco from "./pages/Kiosco/Kiosco";
import Login from "./pages/Auth/Login";
import DocenteDashboard from "./pages/Docente/DocenteDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import { Laptop2, ShieldCheck, User } from "lucide-react";

// Vistas mock por ahora
const Home = () => (
  <div className="container">
    <div style={{ textAlign: "center", marginTop: "4rem" }}>
      <h1 style={{ background: "linear-gradient(to right, #6366f1, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        Inventario Escolar
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "1.2rem", marginBottom: "3rem" }}>
        Seleccione su perfil para ingresar
      </p>

      <div style={{ display: "flex", gap: "2rem", justifyContent: "center", flexWrap: "wrap" }}>
        
        <Link to="/kiosco" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel" style={{ padding: "3rem", width: "300px", textAlign: "center", cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-10px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
            <Laptop2 size={64} color="var(--primary)" style={{ marginBottom: "1rem" }} />
            <h2>Modo Kiosco</h2>
            <p style={{ color: "var(--text-muted)" }}>Retiros y devoluciones rápidas en la preceptoría sin login.</p>
          </div>
        </Link>
        
        <Link to="/login" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel" style={{ padding: "3rem", width: "300px", textAlign: "center", cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-10px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
            <User size={64} color="var(--secondary)" style={{ marginBottom: "1rem" }} />
            <h2>Docente</h2>
            <p style={{ color: "var(--text-muted)" }}>Panel personal para solicitar materiales y ver tus asignaciones.</p>
          </div>
        </Link>

        <Link to="/login" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel" style={{ padding: "3rem", width: "300px", textAlign: "center", cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-10px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
            <ShieldCheck size={64} color="var(--danger)" style={{ marginBottom: "1rem" }} />
            <h2>Administrador</h2>
            <p style={{ color: "var(--text-muted)" }}>Gestión de inventario, bajas, alertas y configuración global.</p>
          </div>
        </Link>

      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <header className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Laptop2 size={24} color="var(--primary)" />
          <h3 style={{ margin: 0 }}>TechSchool Inventory</h3>
        </div>
        <nav style={{ display: "flex", gap: "1rem" }}>
          <Link to="/" style={{ color: "var(--text)", textDecoration: "none" }}>Inicio</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/kiosco" element={<Kiosco />} />
          <Route path="/docente/*" element={<DocenteDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
