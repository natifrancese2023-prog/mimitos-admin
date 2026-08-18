
import "./styles/index.css";
 
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
 
import Login from "./pages/Login";
import PanelLayout from "./pages/PanelLayout";
import Dashboard from "./pages/Dashboard";
 
import Productos from "./pages/Productos";
import Pedidos from "./pages/Pedidos";
import Clientes from "./pages/Clientes";
import Proveedores from "./pages/Proveedores";
import Compras from "./pages/Compras";
import ComprasSugeridas from "./pages/ComprasSugeridas";
import CuentaCorriente from "./pages/CuentaCorriente";
import Caja from "./pages/Caja";
import Gastos from "./pages/Gastos";
import VentaDirecta from "./pages/VentaDirecta";
import ProductoDetalle from "./pages/ProductoDetalle";
import DetalleProveedor from "./pages/DetalleProveedor";
 
 
function RutaProtegida({ children }) {
  const token = localStorage.getItem("token");
 
 
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
          <Route index element={<Dashboard />} />
 
          <Route path="productos" element={<Productos />} />
          <Route path="productos/:id" element={<ProductoDetalle />} />
 
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="clientes" element={<Clientes />} />
 
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="proveedores/:id" element={<DetalleProveedor />} />
 
          <Route path="compras" element={<Compras />} />
          <Route path="compras-sugeridas" element={<ComprasSugeridas />} />
          <Route path="cuenta-corriente" element={<CuentaCorriente />} />
          <Route path="caja" element={<Caja />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="venta-directa" element={<VentaDirecta />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}