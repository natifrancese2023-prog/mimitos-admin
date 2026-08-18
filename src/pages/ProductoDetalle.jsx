import { useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import HistorialPrecios from "../components/HistorialPrecios";
import HistorialCostos from "../components/HistorialCostos";
import KardexProducto from "../components/KardexProducto";
import ComprasProducto from "../components/ComprasProducto";
import VentasProducto from "../components/VentasProducto";

import "./ProductoDetalle.css";

export default function ProductoDetalle() {
  const navigate = useNavigate();

  const { state } = useLocation();

  const idProducto = state?.idProducto;
  const idVariante = state?.idVariante;
  const nombre = state?.nombre;
  const variante = state?.variante;

  const [vista, setVista] = useState("precios");

  if (!idProducto || !idVariante) {
    return (
      <div className="container mt-4">

        <div className="alert alert-warning">

          No se recibió información del producto.

        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/panel/productos")}
        >
          Volver
        </button>

      </div>
    );
  }

  const renderContenido = () => {

    switch (vista) {

      case "precios":
        return (
          <HistorialPrecios
            idProducto={idProducto}
            idVariante={idVariante}
          />
        );

      case "costos":
        return (
          <HistorialCostos
            idProducto={idProducto}
            idVariante={idVariante}
          />
        );

      case "kardex":
        return (
          <KardexProducto
            idProducto={idProducto}
            idVariante={idVariante}
          />
        );

      case "compras":
        return (
          <ComprasProducto
            idProducto={idProducto}
            idVariante={idVariante}
          />
        );

      case "ventas":
        return (
          <VentasProducto
            idProducto={idProducto}
            idVariante={idVariante}
          />
        );

      default:
        return null;

    }

  };

  return (

    <div className="producto-detalle">

      <div className="detalle-header">

        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate("/panel/productos")}
        >
          ← Volver
        </button>

        <div className="titulo-producto">

          <h2>{nombre}</h2>

          <p>

            Variante:
            <strong> {variante}</strong>

          </p>

        </div>

      </div>

      <div className="detalle-body">

        <div className="detalle-tabs">

          <button
            className={vista === "precios" ? "tab-activa" : ""}
            onClick={() => setVista("precios")}
          >
            📈 Historial de Precios
          </button>

          <button
            className={vista === "costos" ? "tab-activa" : ""}
            onClick={() => setVista("costos")}
          >
            💰 Historial de Costos
          </button>

          <button
            className={vista === "kardex" ? "tab-activa" : ""}
            onClick={() => setVista("kardex")}
          >
            📦 Kardex
          </button>

          <button
            className={vista === "compras" ? "tab-activa" : ""}
            onClick={() => setVista("compras")}
          >
            🛒 Compras
          </button>

          <button
            className={vista === "ventas" ? "tab-activa" : ""}
            onClick={() => setVista("ventas")}
          >
            🧾 Ventas
          </button>

        </div>

        <div className="detalle-contenido">
                      {renderContenido()}

        </div>

      </div>

    </div>

  );

}