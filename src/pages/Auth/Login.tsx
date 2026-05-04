import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { LogIn, Mail, Lock, User, UserPlus, Laptop2 } from "lucide-react";

const InputField = ({
  label, icon, type = "text", placeholder, value, onChange,
}: { label: string; icon: React.ReactNode; type?: string; placeholder: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label style={{ display: "block", marginBottom: "0.45rem", fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.03em", textTransform: "uppercase" }}>
      {label}
    </label>
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)", display: "flex" }}>
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ paddingLeft: "2.75rem" }}
      />
    </div>
  </div>
);

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [nombre, setNombre] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const inputEmail = email.trim();
      if (!inputEmail || !password) throw new Error("Por favor ingresá usuario/correo y contraseña.");

      let loginEmail = inputEmail;
      if (!inputEmail.includes("@")) {
        const { data: searchData, error: searchError } = await supabase
          .from('usuarios').select('email').eq('nombre_usuario', inputEmail.toLowerCase()).single();
        if (searchError || !searchData) throw new Error(`El usuario "${inputEmail}" no existe en el sistema.`);
        loginEmail = searchData.email;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (authError) throw authError;

      if (authData.user) {
        const { data: userData } = await supabase.from('usuarios').select('rol').eq('email', authData.user.email).single();
        if (userData) {
          if (userData.rol === 'pendiente') {
            setError("Tu cuenta está en revisión. Un administrador debe habilitarte antes de que puedas ingresar.");
            await supabase.auth.signOut();
            return;
          }
          navigate(userData.rol === 'admin' ? "/admin" : "/docente");
        }
      }
    } catch (err: any) {
      setError(err.message || "Credenciales incorrectas.");
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccessMsg("");
    try {
      if (!email || !password || !nombre || !nombreUsuario) throw new Error("Por favor completá todos los campos.");

      const { data: existData } = await supabase.from('usuarios').select('email')
        .eq('nombre_usuario', nombreUsuario.toLowerCase().replace(/\s/g, '')).single();
      if (existData) throw new Error("Ese nombre de usuario ya está ocupado. Elegí otro.");

      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      if (authData.user) {
        const { error: dbError } = await supabase.from('usuarios').insert({
          email: authData.user.email, nombre,
          nombre_usuario: nombreUsuario.toLowerCase().replace(/\s/g, ''),
          rol: 'pendiente'
        });
        if (dbError) throw dbError;
        setSuccessMsg("¡Cuenta creada! Un administrador debe autorizar tu acceso para poder ingresar.");
        setIsRegistering(false); setPassword("");
      }
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta.");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/docente' }
      });
      if (error) throw error;
    } catch {
      setError("Error al iniciar sesión con Google.");
    }
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 61px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem", position: "relative", overflow: "hidden"
    }}>
      {/* Background blobs */}
      <div style={{ position: "absolute", top: "5%", left: "5%", width: "45vw", height: "45vw", background: "rgba(99,102,241,0.12)", borderRadius: "50%", filter: "blur(120px)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", right: "5%", width: "40vw", height: "40vw", background: "rgba(6,182,212,0.1)", borderRadius: "50%", filter: "blur(120px)", zIndex: 0, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", padding: "1rem", borderRadius: "1.25rem", background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 12px 30px rgba(99,102,241,0.4)", marginBottom: "1.25rem" }}>
            <Laptop2 size={32} color="white" />
          </div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "0.35rem" }}>
            {isRegistering ? "Crear cuenta" : "Bienvenido/a"}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {isRegistering ? "Registrate para solicitar material escolar" : "Ingresá a TechSchool Inventory"}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: "1.25rem" }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: "1.25rem" }}>
            {successMsg}
          </div>
        )}

        {/* Form */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <form onSubmit={isRegistering ? handleEmailRegister : handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {isRegistering && (
              <>
                <InputField label="Nombre completo" icon={<User size={16} />} placeholder="Prof. Juan Pérez" value={nombre} onChange={setNombre} />
                <InputField label="Nombre de usuario" icon={<User size={16} />} placeholder="profejuan (para ingreso rápido)" value={nombreUsuario} onChange={setNombreUsuario} />
              </>
            )}

            <InputField
              label={isRegistering ? "Correo electrónico" : "Usuario o correo"}
              icon={<Mail size={16} />}
              type="text"
              placeholder={isRegistering ? "docente@escuela.edu" : "profejuan o docente@escuela.edu"}
              value={email}
              onChange={setEmail}
            />

            <InputField label="Contraseña" icon={<Lock size={16} />} type="password" placeholder="••••••••" value={password} onChange={setPassword} />

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.875rem", fontSize: "0.95rem", marginTop: "0.25rem" }}>
              {isRegistering ? <><UserPlus size={17} /> Registrarme</> : <><LogIn size={17} /> Ingresar</>}
            </button>
          </form>

          {/* Divider */}
          <div style={{ position: "relative", textAlign: "center", margin: "1.5rem 0" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "var(--border)" }} />
            <span style={{ position: "relative", background: "var(--surface)", padding: "0 0.75rem", color: "var(--text-subtle)", fontSize: "0.75rem", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              o continuar con
            </span>
          </div>

          {/* Google login */}
          <button
            onClick={handleGoogleLogin}
            style={{
              width: "100%", padding: "0.75rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
              background: "white", color: "#1e1b4b",
              border: "none", borderRadius: "0.625rem",
              fontFamily: "'Outfit', sans-serif", fontWeight: "700", fontSize: "0.9rem",
              cursor: "pointer", transition: "opacity 0.2s, box-shadow 0.2s"
            }}
            onMouseOver={e => (e.currentTarget.style.boxShadow = "0 8px 24px rgba(255,255,255,0.15)")}
            onMouseOut={e => (e.currentTarget.style.boxShadow = "none")}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: "18px", height: "18px" }} />
            Acceso con Google
          </button>
        </div>

        {/* Toggle register/login */}
        <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
          <button
            type="button"
            onClick={() => { setIsRegistering(!isRegistering); setError(""); setSuccessMsg(""); }}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.875rem", fontFamily: "'Outfit', sans-serif", transition: "color 0.2s" }}
            onMouseOver={e => (e.currentTarget.style.color = "var(--primary-light)")}
            onMouseOut={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            {isRegistering ? "¿Ya tenés cuenta? Iniciá sesión" : "¿No tenés cuenta? Registrate aquí"}
          </button>
        </div>
      </div>
    </div>
  );
}
