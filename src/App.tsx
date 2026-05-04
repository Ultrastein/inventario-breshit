import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import Kiosco from "./pages/Kiosco/Kiosco";
import Login from "./pages/Auth/Login";
import DocenteDashboard from "./pages/Docente/DocenteDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import { Laptop2, User, ShieldCheck, ArrowRight } from "lucide-react";

const roles = [
  {
    to: "/kiosco",
    icon: <Laptop2 size={26} color="white" />,
    label: "Kiosco",
    sub: "Preceptoría",
    desc: "Registrá retiros y devoluciones de equipos de forma rápida, sin necesidad de iniciar sesión.",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    glow: "rgba(99, 102, 241, 0.4)",
    border: "rgba(99, 102, 241, 0.2)",
    bg: "rgba(99, 102, 241, 0.05)",
    hoverBorder: "rgba(99, 102, 241, 0.45)",
  },
  {
    to: "/login",
    icon: <User size={26} color="white" />,
    label: "Docente",
    sub: "Personal",
    desc: "Accedé a tu panel personal para solicitar materiales y hacer un seguimiento de tus préstamos.",
    gradient: "linear-gradient(135deg, #06b6d4, #0284c7)",
    glow: "rgba(6, 182, 212, 0.4)",
    border: "rgba(6, 182, 212, 0.2)",
    bg: "rgba(6, 182, 212, 0.05)",
    hoverBorder: "rgba(6, 182, 212, 0.45)",
  },
  {
    to: "/login",
    icon: <ShieldCheck size={26} color="white" />,
    label: "Administrador",
    sub: "Gestión",
    desc: "Administrá el inventario, gestioná usuarios, revisá alertas de cierre y controlá las compras.",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    glow: "rgba(245, 158, 11, 0.4)",
    border: "rgba(245, 158, 11, 0.2)",
    bg: "rgba(245, 158, 11, 0.05)",
    hoverBorder: "rgba(245, 158, 11, 0.45)",
  },
];

const Home = () => (
  <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 2rem" }}>

    {/* Hero */}
    <div style={{ textAlign: "center", marginBottom: "4rem" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "0.5rem",
        background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)",
        borderRadius: "9999px", padding: "0.35rem 1rem",
        marginBottom: "1.75rem", fontSize: "0.72rem", fontWeight: "700",
        color: "#a5b4fc", letterSpacing: "0.08em", textTransform: "uppercase"
      }}>
        Sistema de Inventario Escolar
      </div>

      <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", fontWeight: "800", lineHeight: 1.1, letterSpacing: "-2px", marginBottom: "1.25rem" }}>
        <span className="gradient-text">TechSchool</span>{" "}
        <span style={{ color: "var(--text)" }}>Inventory</span>
      </h1>

      <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.75, maxWidth: "480px", margin: "0 auto" }}>
        Gestioná los equipos tecnológicos de tu escuela de manera simple y eficiente. Elegí tu perfil para continuar.
      </p>
    </div>

    {/* Role cards */}
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
      gap: "1.25rem",
      width: "100%",
      maxWidth: "960px",
    }}>
      {roles.map((r) => (
        <Link key={r.label} to={r.to} style={{ textDecoration: "none", color: "inherit" }}>
          <div
            style={{
              padding: "1.75rem",
              borderRadius: "1.25rem",
              background: r.bg,
              border: `1px solid ${r.border}`,
              cursor: "pointer",
              transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
            onMouseOver={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = "translateY(-8px)";
              el.style.boxShadow = `0 24px 60px -12px ${r.glow}`;
              el.style.borderColor = r.hoverBorder;
            }}
            onMouseOut={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = "translateY(0)";
              el.style.boxShadow = "none";
              el.style.borderColor = r.border;
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{
                display: "inline-flex", padding: "0.875rem", borderRadius: "0.875rem",
                background: r.gradient, boxShadow: `0 8px 20px -4px ${r.glow}`,
              }}>
                {r.icon}
              </div>
              <span style={{
                fontSize: "0.7rem", fontWeight: "700", letterSpacing: "0.06em",
                textTransform: "uppercase", color: "var(--text-subtle)",
                padding: "0.2rem 0.6rem", border: "1px solid var(--border)",
                borderRadius: "9999px", background: "var(--surface-2)"
              }}>
                {r.sub}
              </span>
            </div>

            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text)" }}>{r.label}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.65 }}>{r.desc}</p>
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: "600",
              marginTop: "auto", letterSpacing: "0.01em"
            }}>
              Ingresar <ArrowRight size={13} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <header className="navbar">
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
          <div style={{
            display: "flex", padding: "0.5rem", borderRadius: "0.6rem",
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            boxShadow: "0 4px 12px rgba(99,102,241,0.38)"
          }}>
            <Laptop2 size={17} color="white" />
          </div>
          <span style={{ fontWeight: "700", fontSize: "0.95rem", letterSpacing: "-0.3px", color: "var(--text)" }}>TechSchool</span>
        </Link>

        <nav style={{ display: "flex", gap: "0.25rem" }}>
          <Link to="/" style={{ color: "var(--text-muted)", textDecoration: "none", padding: "0.45rem 0.875rem", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: "500", transition: "all 0.15s" }}
            onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)"; }}
            onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)"; }}
          >
            Inicio
          </Link>
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
