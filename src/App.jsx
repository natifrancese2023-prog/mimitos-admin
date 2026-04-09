// ============================================================
// APP.JSX - Enrutador principal de Mimitos
// ============================================================
// Acá definimos TODAS las rutas de la aplicación.
// La estructura de rutas anidadas es clave en React Router:
//
//   /                  → Login
//   /panel             → PanelLayout (wrapper con sidebar)
//     /panel           → Dashboard (índice del panel)
//     /panel/productos → Productos
//     /panel/pedidos   → Pedidos
//     /panel/clientes  → Clientes
//
// Las rutas hijas se renderizan dentro del <Outlet /> de PanelLayout
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login        from "./pages/Login";
import PanelLayout  from "./pages/PanelLayout";
import Dashboard    from "./pages/Dashboard";

import Productos from "./pages/Productos";
import Pedidos from "./pages/Pedidos";
import Clientes from "./pages/Clientes";
import Proveedores from "./pages/Proveedores";
import Compras from "./pages/Compras";
import Gastos from "./pages/Gastos";


// ============================================================
// COMPONENTE: RutaProtegida
// Verifica el token ANTES de renderizar cualquier ruta del panel.
// Es una segunda capa de protección (PanelLayout también verifica,
// pero esta lo hace a nivel de enrutador, antes de montar nada)
// ============================================================
function RutaProtegida({ children }) {
  const token = localStorage.getItem("token");

  // Si no hay token, redirigimos al login directamente
  // replace evita que quede en el historial de navegación
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Ruta pública: Login */}
        <Route path="/" element={<Login />} />

        {/*
          Ruta protegida: Panel
          RutaProtegida envuelve PanelLayout para verificar el token.
          Todas las rutas hijas heredan esta protección.
        */}
        <Route
          path="/panel"
          element={
            <RutaProtegida>
              <PanelLayout />
            </RutaProtegida>
          }
        >
          {/* Ruta índice: se muestra cuando la URL es exactamente /panel */}
          <Route index element={<Dashboard />} />
          <Route path="productos" element={<Productos />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="compras" element={<Compras />} />
          <Route path="gastos" element={<Gastos />} />
          
        </Route>

        {/* Cualquier ruta no definida redirige al login */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
