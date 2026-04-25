import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import "./PanelLayout.css";

// Decodifica el token y verifica que no esté expirado y que el rol sea dueño
function tokenEsValido(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(decodeURIComponent(atob(base64).split("").map(c =>
      "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
    ).join("")));
    const ahora = Date.now() / 1000;
    if (payload.exp && payload.exp < ahora) return false;
    if (payload.rol !== "dueno") return false;
    return true;
  } catch {
    return false;
  }
}

// Obtiene el nombre o email del token para mostrarlo en el saludo
function getNombreUsuario() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "Dueño";
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(decodeURIComponent(atob(base64).split("").map(c =>
      "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
    ).join("")));
    return payload.nombre || payload.email || "Dueño";
  } catch {
    return "Dueño";
  }
}

export default function PanelLayout() {
  const navigate = useNavigate();
  const [sidebarAbierto, setSidebarAbierto] = useState(() => window.innerWidth > 768);
  const nombre = getNombreUsuario();

  // Verifica el token al montar el componente
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !tokenEsValido(token)) {
      localStorage.removeItem("token");
      localStorage.removeItem("rol");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const token = localStorage.getItem("token");
  const verificado = token && tokenEsValido(token);

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    navigate("/", { replace: true });
  };

  if (!verificado) return null;

  return (
    <div className={`panel-layout ${sidebarAbierto ? "sidebar-open" : "sidebar-closed"}`}>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">🍼 mimitos</span>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarAbierto(!sidebarAbierto)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        {/* El nav ahora tiene su propio contenedor de scroll interno */}
        <nav className="sidebar-nav">
          <span className="nav-label">Menú</span>
          
          <NavLink to="/panel" end className="nav-item">
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </NavLink>

          <NavLink to="/panel/productos" className="nav-item">
            <span className="nav-icon">📦</span>
            <span className="nav-text">Productos</span>
          </NavLink>

          <NavLink to="/panel/proveedores" className="nav-item">
            <span className="nav-icon">🏭</span>
            <span className="nav-text">Proveedores</span>
          </NavLink>

          <NavLink to="/panel/pedidos" className="nav-item">
            <span className="nav-icon">🛒</span>
            <span className="nav-text">Pedidos</span>
          </NavLink>

          <NavLink to="/panel/clientes" className="nav-item">
            <span className="nav-icon">👥</span>
            <span className="nav-text">Clientes</span>
          </NavLink>

          <NavLink to="/panel/compras" className="nav-item">
            <span className="nav-icon">🛍️</span>
            <span className="nav-text">Compras</span>
          </NavLink>

          <NavLink to="/panel/gastos" className="nav-item">
            <span className="nav-icon">💸</span>
            <span className="nav-text">Gastos</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={cerrarSesion}>
            <span className="nav-icon">🔒</span>
            <span className="nav-text">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* OVERLAY mobile: toca afuera para cerrar */}
      {sidebarAbierto && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarAbierto(false)}
        />
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="panel-main">
        <header className="topbar">
          <button
            className="btn-menu"
            onClick={() => setSidebarAbierto(!sidebarAbierto)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <span className="topbar-saludo">Hola, {nombre} 👋</span>
        </header>

        <main className="panel-content">
          <Outlet />
        </main>
      </div>

    </div>
  );
}