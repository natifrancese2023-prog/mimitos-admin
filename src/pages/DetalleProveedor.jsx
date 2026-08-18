import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import ProductosProveedor from "../components/ProductosProveedor";

import "./Detalle.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function DetalleProveedor() {
  const navigate = useNavigate();

  const { id } = useParams();

  const [tabActiva, setTabActiva] =
    useState("informacion");

  const [proveedor, setProveedor] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    cargarProveedor();
  }, [id]);

  const cargarProveedor = async () => {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      const { data } = await axios.get(
        `${API_URL}/proveedores/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProveedor(data);

    } catch (err) {

      console.error(err);

      setError(
        "No se pudo cargar el proveedor."
      );

    } finally {

      setLoading(false);

    }
  };

  if (loading) {
    return (
      <div className="detalle-loading">
        <h3>Cargando proveedor...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detalle-vacio">
        <span>⚠️</span>
        <h3>{error}</h3>
      </div>
    );
  }

  return (
    <div className="detalle-proveedor">

      <div className="detalle-header">

        <div>

          <h1>{proveedor.nombre}</h1>

          <p className="detalle-subtitulo">
            Información general del proveedor
          </p>

        </div>

      </div>

      <div className="detalle-resumen">

        <div className="card-resumen">

          <span>
            Productos asociados
          </span>

          <strong>
            {proveedor.cantidad_productos}
          </strong>

        </div>

        <div className="card-resumen">

          <span>
            Compras
          </span>

          <strong>
            {proveedor.cantidad_compras}
          </strong>

        </div>

        <div className="card-resumen">

          <span>
            Total comprado
          </span>

          <strong>
            $
            {Number(
              proveedor.total_comprado || 0
            ).toLocaleString("es-AR")}
          </strong>

        </div>

        <div className="card-resumen">

          <span>
            Última compra
          </span>

          <strong>

            {proveedor.ultima_compra
              ? new Date(
                  proveedor.ultima_compra
                ).toLocaleDateString(
                  "es-AR"
                )
              : "—"}

          </strong>

        </div>

      </div>

      <div className="detalle-body">

        <div className="detalle-tabs">

          <button
            className={
              tabActiva === "informacion"
                ? "tab-activa"
                : ""
            }
            onClick={() =>
              setTabActiva("informacion")
            }
          >
            Información
          </button>

          <button
            className={
              tabActiva === "compras"
                ? "tab-activa"
                : ""
            }
            onClick={() =>
              navigate(
                "/panel/compras",
                {
                  state: {
                    idProveedor:
                      proveedor.id_proveedor,
                  },
                }
              )
            }
          >
            Compras
          </button>

          <button
            className={
              tabActiva === "productos"
                ? "tab-activa"
                : ""
            }
            onClick={() =>
              setTabActiva("productos")
            }
          >
            Productos Asociados
          </button>

        </div>

        <div className="detalle-contenido">

                 {/* ============================================
              INFORMACIÓN
          ============================================ */}

          {tabActiva === "informacion" && (
            <div className="detalle-info">

              <table className="tabla-detalle">

                <tbody>

                  <tr>
                    <th>Nombre</th>
                    <td>{proveedor.nombre}</td>
                  </tr>

                  <tr>
                    <th>Teléfono</th>
                    <td>{proveedor.telefono || "—"}</td>
                  </tr>

                  <tr>
                    <th>Dirección</th>
                    <td>{proveedor.direccion || "—"}</td>
                  </tr>

                  <tr>
                    <th>Fecha de alta</th>
                    <td>
                      {proveedor.created_at
                        ? new Date(
                            proveedor.created_at
                          ).toLocaleDateString("es-AR")
                        : "—"}
                    </td>
                  </tr>

                  <tr>
                    <th>Productos asociados</th>
                    <td>{proveedor.cantidad_productos}</td>
                  </tr>

                  <tr>
                    <th>Compras realizadas</th>
                    <td>{proveedor.cantidad_compras}</td>
                  </tr>

                  <tr>
                    <th>Total comprado</th>
                    <td>
                      $
                      {Number(
                        proveedor.total_comprado || 0
                      ).toLocaleString("es-AR")}
                    </td>
                  </tr>

                  <tr>
                    <th>Última compra</th>
                    <td>
                      {proveedor.ultima_compra
                        ? new Date(
                            proveedor.ultima_compra
                          ).toLocaleDateString("es-AR")
                        : "—"}
                    </td>
                  </tr>

                </tbody>

              </table>

            </div>
          )}

          {/* ============================================
              PRODUCTOS ASOCIADOS
          ============================================ */}

          {tabActiva === "productos" && (
            <ProductosProveedor
              idProveedor={id}
            />
          )}

        </div>

      </div>

    </div>
  );
}