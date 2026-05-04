import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { LogIn, User, Lock } from "lucide-react";

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
      if (!inputEmail || !password) throw new Error("Por favor ingresa usuario/correo y contraseña");
      
      let loginEmail = inputEmail;

      // Si no tiene @, buscamos qué correo tiene este nombre de usuario
      if (!inputEmail.includes("@")) {
        const { data: searchData, error: searchError } = await supabase
          .from('usuarios')
          .select('email')
          .eq('nombre_usuario', inputEmail.toLowerCase())
          .single();

        if (searchError || !searchData) {
          throw new Error(`El usuario "${inputEmail}" no existe en el sistema.`);
        }
        loginEmail = searchData.email;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password
      });

      if (authError) throw authError;
      
      if (authData.user) {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('email', authData.user.email)
          .single();
          
        if (userData) {
          if (userData.rol === 'pendiente') {
            setError("Tu cuenta está en revisión. El Administrador debe habilitar tu acceso.");
            await supabase.auth.signOut();
            return;
          }
          if (userData.rol === 'admin') {
            navigate("/admin");
          } else {
            navigate("/docente");
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Credenciales incorrectas.");
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    try {
      if (!email || !password || !nombre || !nombreUsuario) throw new Error("Por favor completa todos los campos.");
      
      // Chequear si el usuario ya existe para evitar errores raros de Supabase
      const { data: existData } = await supabase.from('usuarios').select('email').eq('nombre_usuario', nombreUsuario.toLowerCase().replace(/\s/g, '')).single();
      if (existData) throw new Error("Ese nombre de usuario ya está ocupado. Elige otro.");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: dbError } = await supabase.from('usuarios').insert({
          email: authData.user.email,
          nombre: nombre,
          nombre_usuario: nombreUsuario.toLowerCase().replace(/\s/g, ''),
          rol: 'pendiente'
        });

        if (dbError) throw dbError;
        
        setSuccessMsg("¡Cuenta creada! Un administrador debe autorizar tu acceso para poder ingresar.");
        setIsRegistering(false);
        setPassword("");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al crear la cuenta.");
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", overflow: "hidden" }}>
      
      {/* Decorative Background Elements */}
      <div style={{ position: "absolute", top: "10%", left: "10%", width: "40vw", height: "40vw", background: "rgba(139, 92, 246, 0.2)", borderRadius: "50%", filter: "blur(100px)", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "10%", right: "10%", width: "40vw", height: "40vw", background: "rgba(14, 165, 233, 0.2)", borderRadius: "50%", filter: "blur(100px)", zIndex: 0 }} />

      <div className="glass-panel" style={{ width: "100%", maxWidth: "450px", padding: "3rem", display: "flex", flexDirection: "column", gap: "2rem", position: "relative", zIndex: 10 }}>
        
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", background: "linear-gradient(135deg, var(--primary), var(--secondary))", padding: "1rem", borderRadius: "1rem", marginBottom: "1.5rem", boxShadow: "0 10px 25px -5px rgba(139, 92, 246, 0.5)" }}>
            <LogIn size={36} color="white" />
          </div>
          <h2 style={{ marginBottom: "0.5rem", fontWeight: "700", letterSpacing: "-0.5px" }}>{isRegistering ? "Crear Cuenta" : "Iniciar Sesión"}</h2>
          <p style={{ color: "var(--text-muted)" }}>{isRegistering ? "Regístrate para solicitar material" : "Ingresa a tu cuenta escolar"}</p>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "1rem", borderRadius: "0.75rem", border: "1px solid rgba(239, 68, 68, 0.5)", textAlign: "center" }}>
            {error}
          </div>
        )}
        
        {successMsg && (
          <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--success)", padding: "1rem", borderRadius: "0.75rem", border: "1px solid rgba(16, 185, 129, 0.5)", textAlign: "center" }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={isRegistering ? handleEmailRegister : handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {isRegistering && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: "500" }}>Nombre Completo</label>
                <div style={{ position: "relative" }}>
                  <User size={20} color="var(--text-muted)" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                  <input 
                    type="text" 
                    placeholder="Prof. Juan Pérez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "0.75rem", background: "rgba(0, 0, 0, 0.2)", color: "white", border: "1px solid var(--border)", fontSize: "1rem" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: "500" }}>Nombre de Usuario <span style={{fontSize: "0.8rem", color: "var(--primary)"}}>(Para ingreso rápido)</span></label>
                <div style={{ position: "relative" }}>
                  <User size={20} color="var(--text-muted)" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
                  <input 
                    type="text" 
                    placeholder="ej: profejuan"
                    value={nombreUsuario}
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "0.75rem", background: "rgba(0, 0, 0, 0.2)", color: "white", border: "1px solid var(--border)", fontSize: "1rem" }}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: "500" }}>
              {isRegistering ? "Correo Electrónico Oficial" : "Usuario o Correo Electrónico"}
            </label>
            <div style={{ position: "relative" }}>
              <User size={20} color="var(--text-muted)" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="text" 
                placeholder={isRegistering ? "docente@escuela.edu" : "profejuan o docente@escuela.edu"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "0.75rem", background: "rgba(0, 0, 0, 0.2)", color: "white", border: "1px solid var(--border)", fontSize: "1rem" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: "500" }}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <Lock size={20} color="var(--text-muted)" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "0.75rem", background: "rgba(0, 0, 0, 0.2)", color: "white", border: "1px solid var(--border)", fontSize: "1rem" }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem", marginTop: "0.5rem", borderRadius: "0.75rem", fontSize: "1.1rem" }}>
            {isRegistering ? "Registrarme" : "Ingresar"}
          </button>
        </form>

        <div style={{ textAlign: "center" }}>
          <button 
            type="button" 
            onClick={() => { setIsRegistering(!isRegistering); setError(""); setSuccessMsg(""); }} 
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.95rem", transition: "color 0.2s" }}
            onMouseOver={(e) => e.currentTarget.style.color = "var(--primary)"}
            onMouseOut={(e) => e.currentTarget.style.color = "var(--text-muted)"}>
            {isRegistering ? "¿Ya tienes cuenta? Inicia Sesión" : "¿No tienes cuenta? Regístrate aquí"}
          </button>
        </div>

        <div style={{ position: "relative", textAlign: "center", margin: "1rem 0" }}>
          <hr style={{ borderColor: "var(--border)", borderStyle: "solid", borderBottomWidth: "0" }} />
          <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "var(--surface)", padding: "0 1rem", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>O continuar con</span>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          className="btn" 
          style={{ width: "100%", padding: "1rem", background: "white", color: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", borderRadius: "0.75rem", fontWeight: "600", transition: "transform 0.2s, box-shadow 0.2s" }}
          onMouseOver={(e) => e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(255,255,255,0.2)"}
          onMouseOut={(e) => e.currentTarget.style.boxShadow = "none"}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: "20px", height: "20px" }} />
          Acceso con Google
        </button>

      </div>
    </div>
  );
}
