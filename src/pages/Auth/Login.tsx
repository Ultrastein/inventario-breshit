import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { LogIn, User, Lock } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (!email || !password) throw new Error("Por favor ingresa correo y contraseña");
      
      // USUARIOS DE PRUEBA LOCAL Bypasseando Supabase
      if (email === "admin@test.com" && password === "1234") {
        navigate("/admin");
        return;
      }
      if (email === "docente@test.com" && password === "1234") {
        navigate("/docente");
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      
      if (authData.user) {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('email', authData.user.email)
          .single();
          
        if (userData && userData.rol === 'admin') {
          navigate("/admin");
        } else {
          navigate("/docente");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Credenciales incorrectas o usuario no encontrado.");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/docente'
        }
      });
      if (error) throw error;
      // El redireccionamiento es manejado por Supabase, el chequeo de rol se debería hacer en el componente que carga post-login.
    } catch (err: any) {
      setError("Error al iniciar sesión con Google.");
    }
  };

  return (
    <div className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
      
      <div className="glass-panel" style={{ width: "100%", maxWidth: "450px", padding: "3rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", background: "var(--primary)", padding: "1rem", borderRadius: "50%", marginBottom: "1rem" }}>
            <LogIn size={32} color="white" />
          </div>
          <h2 style={{ marginBottom: "0.5rem" }}>Iniciar Sesión</h2>
          <p style={{ color: "var(--text-muted)" }}>Ingresa a tu cuenta escolar</p>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "1rem", borderRadius: "0.5rem", border: "1px solid var(--danger)", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>Correo Electrónico</label>
            <div style={{ position: "relative" }}>
              <User size={20} color="var(--text-muted)" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="email" 
                placeholder="docente@escuela.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "0.5rem", background: "rgba(15, 23, 42, 0.6)", color: "white", border: "1px solid var(--border)", fontSize: "1rem" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <Lock size={20} color="var(--text-muted)" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "0.5rem", background: "rgba(15, 23, 42, 0.6)", color: "white", border: "1px solid var(--border)", fontSize: "1rem" }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem", marginTop: "0.5rem" }}>
            Ingresar
          </button>
        </form>

        <div style={{ position: "relative", textAlign: "center", margin: "1rem 0" }}>
          <hr style={{ borderColor: "var(--border)", borderStyle: "solid", borderBottomWidth: "0" }} />
          <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "var(--surface)", padding: "0 1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>O continuar con</span>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          className="btn" 
          style={{ width: "100%", padding: "1rem", background: "white", color: "#1f2937", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", border: "1px solid #e5e7eb", fontWeight: "bold" }}>
          Acceso con Google
        </button>

      </div>
    </div>
  );
}
