// ============================================================
// LOGIN.JSX
// ============================================================
// CAMBIOS respecto a la versión anterior:
// ✅ NUEVO: validaciones en el frontend ANTES de llamar al backend
// Las validaciones del front son una primera capa de defensa:
// evitan requests innecesarios al servidor y dan feedback inmediato
// El backend igual valida por su cuenta (doble seguridad)
// ============================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";

// ============================================================
// ✅ NUEVO: función que valida el formulario antes de enviarlo
// Devuelve un objeto con los errores encontrados
// Si no hay errores, devuelve un objeto vacío {}
// ============================================================
function validarFormulario(email, contrasena) {
  const errores = {};

  if (!email.trim()) {
    errores.email = "El email es obligatorio";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errores.email = "El formato del email no es válido";
  }

  if (!contrasena) {
    errores.contrasena = "La contraseña es obligatoria";
  } else if (contrasena.length < 8) {
    errores.contrasena = "La contraseña debe tener al menos 8 caracteres";
  } else if (!/[A-Z]/.test(contrasena)) {
    errores.contrasena = "La contraseña debe contener al menos una mayúscula";
  } else if (!/[0-9]/.test(contrasena)) {
    errores.contrasena = "La contraseña debe contener al menos un número";
  } else if (!/[^A-Za-z0-9]/.test(contrasena)) {
    errores.contrasena = "La contraseña debe contener al menos un símbolo";
  }

  return errores;
}

// URL base desde variable de entorno
// Acordate de crear .env en la raíz del frontend con:
// VITE_API_URL=http://localhost:8080
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function Login() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [erroresCampos, setErroresCampos] = useState({});

  const navigate = useNavigate();

  const handleBlur = () => {
    const errores = validarFormulario(email, contrasena);
    setErroresCampos(errores);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errores = validarFormulario(email, contrasena);
    setErroresCampos(errores);
    if (Object.keys(errores).length > 0) return;

    setCargando(true);
    try {
  const respuesta = await axios.post(`${API_URL}/usuarios/login`, {
    email,
    contraseña: contrasena,
  });

  console.log("1 - Respuesta recibida:", respuesta.data);
  localStorage.setItem("token", respuesta.data.token);
  console.log("2 - Token guardado:", localStorage.getItem("token"));
  localStorage.setItem("rol", "dueno");
  console.log("3 - Antes del navigate");
  navigate("/panel");
  console.log("4 - Después del navigate");

} catch (err) {
  console.log("ERROR:", err);
  const mensaje = err.response?.data?.error || "Error al iniciar sesión";
  setError(mensaje);
}
  };

  return (
    <div className="login-page">

      <div className="login-branding">
        <div className="branding-content">
          <div className="logo-icon">🍼</div>
          <h1 className="brand-name">mimitos</h1>
          <p className="brand-tagline">Panel de administración</p>
          <div className="deco-circle circle-1" />
          <div className="deco-circle circle-2" />
          <div className="deco-circle circle-3" />
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-card">

          <div className="login-header">
            <h2>Bienvenido 👋</h2>
            <p>Ingresá tus datos para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">

            <div className="field-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                placeholder="dueno@mimitos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleBlur}
                className={erroresCampos.email ? "input-error" : ""}
              />
              {erroresCampos.email && (
                <span className="campo-error">{erroresCampos.email}</span>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="contrasena">Contraseña</label>
              <input
                id="contrasena"
                type="password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                onBlur={handleBlur}
                className={erroresCampos.contrasena ? "input-error" : ""}
              />
              {erroresCampos.contrasena && (
                <span className="campo-error">{erroresCampos.contrasena}</span>
              )}
            </div>

            {error && (
              <div className="error-msg">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" className="btn-login" disabled={cargando}>
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>

          </form>
        </div>
      </div>

    </div>
  );
}